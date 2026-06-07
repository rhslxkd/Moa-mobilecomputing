from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.report import ReportResponse, MemberReportResponse
from app.services import ai

# 난이도 가중치: 1=하, 2=중, 3=상
_DIFF_WEIGHT = {1: 1, 2: 2, 3: 3}


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def get_report(project_id: str, token: str) -> ReportResponse:
    user = _get_user(token)

    # 프로젝트 소유 확인 + 이름
    projs = (
        supabase_admin.table("projects")
        .select("id, name")
        .eq("id", project_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data
    if not projs:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    project_name = projs[0]["name"]

    members = (
        supabase_admin.table("project_members")
        .select("*")
        .eq("project_id", project_id)
        .order("id")
        .execute()
    ).data

    todos = (
        supabase_admin.table("todos")
        .select("id, done, assignee_member_id, difficulty")
        .eq("project_id", project_id)
        .execute()
    ).data

    meetings = (
        supabase_admin.table("meetings")
        .select("id, summary, keywords")
        .eq("project_id", project_id)
        .execute()
    ).data
    meeting_ids = [m["id"] for m in meetings]

    # 멤버별 회의 발언 시간(초) 집계 (matched 화자 → member_id)
    speak_by_member: dict[str, int] = {}
    if meeting_ids:
        parts = (
            supabase_admin.table("meeting_participants")
            .select("member_id, speak_time_seconds")
            .in_("meeting_id", meeting_ids)
            .execute()
        ).data
        for p in parts:
            mid = p.get("member_id")
            if mid:
                speak_by_member[mid] = speak_by_member.get(mid, 0) + (p.get("speak_time_seconds") or 0)

    total_todos = len(todos)
    done_todos = sum(1 for t in todos if t["done"])
    completion_rate = round(done_todos / total_todos * 100) if total_todos else 0

    # 발언량 정규화 기준
    max_speak = max(speak_by_member.values()) if speak_by_member else 0

    member_reports: list[MemberReportResponse] = []
    for m in members:
        m_todos = [t for t in todos if t.get("assignee_member_id") == m["id"]]
        m_done_todos = [t for t in m_todos if t["done"]]
        m_done = len(m_done_todos)
        contribution = round(m_done / done_todos * 100) if done_todos else 0
        speak = speak_by_member.get(m["id"], 0)

        # 종합 점수: 난이도 가중 완료점(최대 70) + 발언량 정규화(최대 30)
        weighted = sum(_DIFF_WEIGHT.get(t.get("difficulty") or 2, 2) for t in m_done_todos)
        todo_score = weighted * 10
        speak_score = round(speak / max_speak * 30) if max_speak else 0
        score = min(100, todo_score + speak_score)

        member_reports.append(
            MemberReportResponse(
                member_id=m["id"],
                name=m["name"],
                todos_done=m_done,
                todos_total=len(m_todos),
                contribution=contribution,
                score=score,
                speak_seconds=speak,
            )
        )

    # 점수 내림차순 정렬 (1등이 맨 앞)
    member_reports.sort(key=lambda x: x.score, reverse=True)

    # AI 코멘트 생성
    overall_comment = None
    if member_reports:
        keywords: list[str] = []
        summaries: list[str] = []
        for mt in meetings:
            for kw in (mt.get("keywords") or []):
                if kw not in keywords:
                    keywords.append(kw)
            summaries.extend(mt.get("summary") or [])
        context = {
            "project_name": project_name,
            "members": [
                {
                    "name": r.name,
                    "todos_done": r.todos_done,
                    "todos_total": r.todos_total,
                    "weighted_score": r.score,
                    "speak_seconds": r.speak_seconds,
                }
                for r in member_reports
            ],
            "keywords": keywords[:20],
            "summaries": summaries[:15],
        }
        try:
            result = ai.analyze_contribution(context)
            comments = result.get("member_comments") or {}
            overall_comment = result.get("overall_comment") or None
            for r in member_reports:
                r.ai_comment = comments.get(r.name)
        except Exception:
            overall_comment = None

    return ReportResponse(
        project_id=project_id,
        project_name=project_name,
        members=member_reports,
        total_todos=total_todos,
        done_todos=done_todos,
        completion_rate=completion_rate,
        meeting_count=len(meetings),
        overall_comment=overall_comment,
    )
