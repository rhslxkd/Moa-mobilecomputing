import logging

from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.report import ReportResponse, MemberReportResponse
from app.services import ai

logger = logging.getLogger("moa.report")

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


def _has_project_access(project_id: str, user_id: str) -> bool:
    if (
        supabase_admin.table("projects").select("id")
        .eq("id", project_id).eq("owner_id", user_id).limit(1).execute()
    ).data:
        return True
    if (
        supabase_admin.table("project_members").select("id")
        .eq("project_id", project_id).eq("user_id", user_id).eq("status", "accepted")
        .limit(1).execute()
    ).data:
        return True
    return False


def get_report(project_id: str, token: str) -> ReportResponse:
    user = _get_user(token)

    # 프로젝트 접근 확인 (방장 또는 수락된 멤버)
    if not _has_project_access(project_id, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    projs = (
        supabase_admin.table("projects")
        .select("id, name").eq("id", project_id).limit(1).execute()
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
        .select("id, title, done, assignee_member_id, difficulty")
        .eq("project_id", project_id)
        .execute()
    ).data
    _DIFF_LABEL = {1: "하", 2: "중", 3: "상"}

    meetings = (
        supabase_admin.table("meetings")
        .select("id, summary, transcript")
        .eq("project_id", project_id)
        .execute()
    ).data
    meeting_ids = [m["id"] for m in meetings]

    # 멤버별 출석 집계 (정시/지각/불참 + 사유)
    LATE_THRESHOLD = 120  # 2분 이상이면 지각
    att_by_user: dict[str, list[dict]] = {}
    if meeting_ids:
        att_rows = (
            supabase_admin.table("meeting_attendance")
            .select("user_id, joined_at, late_seconds, reason")
            .in_("meeting_id", meeting_ids)
            .execute()
        ).data
        for a in att_rows:
            att_by_user.setdefault(a.get("user_id"), []).append(a)

    def _attendance_summary(user_id: str | None) -> tuple[str, str | None]:
        """멤버의 출석 상태 문자열 + 대표 사유."""
        if not user_id or user_id not in att_by_user:
            return ("회의 불참(기록 없음)" if meeting_ids else "회의 없음", None)
        rows = att_by_user[user_id]
        on_time = late = absent = 0
        reasons: list[str] = []
        for r in rows:
            if r.get("reason"):
                reasons.append(r["reason"])
            if r.get("joined_at"):
                if (r.get("late_seconds") or 0) >= LATE_THRESHOLD:
                    late += 1
                else:
                    on_time += 1
            else:
                absent += 1
        parts = []
        if on_time: parts.append(f"정시 {on_time}회")
        if late: parts.append(f"지각 {late}회")
        if absent: parts.append(f"불참 {absent}회")
        return (", ".join(parts) or "기록 없음", " / ".join(reasons) if reasons else None)

    total_todos = len(todos)
    done_todos = sum(1 for t in todos if t["done"])
    completion_rate = round(done_todos / total_todos * 100) if total_todos else 0

    member_reports: list[MemberReportResponse] = []
    member_ctx: list[dict] = []
    for m in members:
        m_todos = [t for t in todos if t.get("assignee_member_id") == m["id"]]
        m_done_todos = [t for t in m_todos if t["done"]]
        m_done = len(m_done_todos)
        contribution = round(m_done / done_todos * 100) if done_todos else 0
        att_str, reason = _attendance_summary(m.get("user_id"))

        # fallback 점수(AI 실패 시): 난이도 가중 완료점
        weighted = sum(_DIFF_WEIGHT.get(t.get("difficulty") or 2, 2) for t in m_done_todos)
        fallback_score = min(100, weighted * 12)

        member_reports.append(
            MemberReportResponse(
                member_id=m["id"], user_id=m.get("user_id"), name=m["name"],
                todos_done=m_done, todos_total=len(m_todos),
                contribution=contribution, score=fallback_score, speak_seconds=0,
            )
        )
        # 현재 맡고 있는 할 일 목록(제목/난이도/완료여부) — 담당 변경/해제가 그대로 반영됨
        todo_details = [
            {
                "title": (t.get("title") or "")[:40],
                "난이도": _DIFF_LABEL.get(t.get("difficulty") or 2, "중"),
                "완료": bool(t.get("done")),
            }
            for t in m_todos
        ]
        member_ctx.append({
            "name": m["name"],
            "roles": m.get("roles") or [],
            "todos_done": m_done, "todos_total": len(m_todos),
            "current_todos": todo_details,
            "attendance": att_str, "reason": reason,
        })

    # 아무에게도 배정되지 않은(담당 해제된) 할 일
    unassigned = [t for t in todos if not t.get("assignee_member_id")]
    unassigned_ctx = {
        "count": len(unassigned),
        "titles": [(t.get("title") or "")[:40] for t in unassigned][:10],
    }

    # AI 평가 (성실도 + 발언 품질) → 점수/코멘트
    overall_comment = None
    if member_reports:
        summaries: list[str] = []
        transcript_parts: list[str] = []
        for mt in meetings:
            summaries.extend(mt.get("summary") or [])
            if mt.get("transcript"):
                transcript_parts.append(mt["transcript"])
        transcript_joined = " ".join(transcript_parts)[:4000]
        context = {
            "project_name": project_name,
            "members": member_ctx,
            "unassigned_todos": unassigned_ctx,
            "summaries": summaries[:15],
            "transcript": transcript_joined,
        }
        try:
            result = ai.analyze_contribution(context)
            scores = result.get("member_scores") or {}
            comments = result.get("member_comments") or {}
            overall_comment = result.get("overall_comment") or None
            for r in member_reports:
                if r.name in scores:
                    try:
                        r.score = max(0, min(100, int(scores[r.name])))
                    except (ValueError, TypeError):
                        pass
                r.ai_comment = comments.get(r.name)
        except Exception as e:
            logger.warning("리포트 AI 코멘트/점수 생성 실패: %s", e)
            overall_comment = None

    # 점수 내림차순 정렬 (1등이 맨 앞)
    member_reports.sort(key=lambda x: x.score, reverse=True)

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
