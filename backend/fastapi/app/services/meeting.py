from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.meeting import MeetingCreate, MeetingResponse, ParticipantResponse


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _fetch_participants(meeting_id: str) -> list[dict]:
    return (
        supabase_admin.table("meeting_participants")
        .select("*")
        .eq("meeting_id", meeting_id)
        .execute()
    ).data


def _build(row: dict, participants: list[dict], project_name: str | None = None) -> MeetingResponse:
    return MeetingResponse(
        id=row["id"],
        title=row["title"],
        project_id=row.get("project_id"),
        project_name=project_name,
        duration_seconds=row.get("duration_seconds", 0),
        summary=row.get("summary") or [],
        participants=[
            ParticipantResponse(
                id=p["id"],
                name=p["name"],
                speak_time_seconds=p.get("speak_time_seconds", 0),
            )
            for p in participants
        ],
        created_at=row["created_at"],
    )


def _get_proj_name(project_id: str | None) -> str | None:
    if not project_id:
        return None
    rows = (
        supabase_admin.table("projects")
        .select("name")
        .eq("id", project_id)
        .limit(1)
        .execute()
    ).data
    return rows[0]["name"] if rows else None


def list_meetings(project_id: str | None, token: str) -> list[MeetingResponse]:
    user = _get_user(token)
    query = (
        supabase_admin.table("meetings")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
    )
    if project_id:
        query = query.eq("project_id", project_id)
    rows = query.execute().data

    proj_ids = {r["project_id"] for r in rows if r.get("project_id")}
    proj_map: dict[str, str] = {}
    if proj_ids:
        projs = (
            supabase_admin.table("projects")
            .select("id, name")
            .in_("id", list(proj_ids))
            .execute()
        ).data
        proj_map = {p["id"]: p["name"] for p in projs}

    return [_build(r, _fetch_participants(r["id"]), proj_map.get(r.get("project_id", ""))) for r in rows]


def create_meeting(req: MeetingCreate, token: str) -> MeetingResponse:
    user = _get_user(token)
    payload: dict = {
        "owner_id": user.id,
        "title": req.title,
        "duration_seconds": req.duration_seconds,
        "summary": req.summary,
    }
    if req.project_id:
        payload["project_id"] = req.project_id

    row = (supabase_admin.table("meetings").insert(payload).execute()).data[0]

    parts: list[dict] = []
    if req.participants:
        parts = (
            supabase_admin.table("meeting_participants")
            .insert([{"meeting_id": row["id"], "name": p.name, "speak_time_seconds": p.speak_time_seconds} for p in req.participants])
            .execute()
        ).data

    return _build(row, parts, _get_proj_name(row.get("project_id")))


def get_meeting(meeting_id: str, token: str) -> MeetingResponse:
    user = _get_user(token)
    rows = (
        supabase_admin.table("meetings")
        .select("*")
        .eq("id", meeting_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    row = rows[0]
    return _build(row, _fetch_participants(meeting_id), _get_proj_name(row.get("project_id")))


def delete_meeting(meeting_id: str, token: str) -> None:
    user = _get_user(token)
    if not (
        supabase_admin.table("meetings")
        .select("id")
        .eq("id", meeting_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="회의를 찾을 수 없습니다.")
    supabase_admin.table("meetings").delete().eq("id", meeting_id).execute()
