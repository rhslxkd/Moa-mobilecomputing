from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.report import ReportResponse, MemberReportResponse


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
        .select("id, done, assignee_member_id")
        .eq("project_id", project_id)
        .execute()
    ).data

    meetings = (
        supabase_admin.table("meetings")
        .select("id")
        .eq("project_id", project_id)
        .execute()
    ).data

    total_todos = len(todos)
    done_todos = sum(1 for t in todos if t["done"])
    completion_rate = round(done_todos / total_todos * 100) if total_todos else 0

    member_reports: list[MemberReportResponse] = []
    for m in members:
        m_todos = [t for t in todos if t.get("assignee_member_id") == m["id"]]
        m_done = sum(1 for t in m_todos if t["done"])
        contribution = round(m_done / done_todos * 100) if done_todos else 0
        member_reports.append(
            MemberReportResponse(
                member_id=m["id"],
                name=m["name"],
                todos_done=m_done,
                todos_total=len(m_todos),
                contribution=contribution,
            )
        )

    # 기여도 내림차순 정렬 (1등이 맨 앞)
    member_reports.sort(key=lambda x: x.contribution, reverse=True)

    return ReportResponse(
        project_id=project_id,
        project_name=project_name,
        members=member_reports,
        total_todos=total_todos,
        done_todos=done_todos,
        completion_rate=completion_rate,
        meeting_count=len(meetings),
    )
