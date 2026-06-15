from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.meetpoll import (
    MeetPollCreate, MeetPollResponse, MeetPollDetail, RespondentResponse,
)


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


def _project_member_user_ids(project_id: str) -> list[str]:
    """프로젝트 owner + accepted 멤버의 user_id 목록 (푸시 수신자용)."""
    ids: list[str] = []
    proj = (
        supabase_admin.table("projects").select("owner_id")
        .eq("id", project_id).limit(1).execute()
    ).data
    if proj and proj[0].get("owner_id"):
        ids.append(proj[0]["owner_id"])
    mems = (
        supabase_admin.table("project_members").select("user_id")
        .eq("project_id", project_id).eq("status", "accepted").execute()
    ).data
    ids += [m["user_id"] for m in mems if m.get("user_id")]
    return ids


def _display_name(user) -> str:
    rows = (
        supabase_admin.table("profiles")
        .select("first_name, last_name, username").eq("id", user.id).limit(1).execute()
    ).data
    if rows:
        p = rows[0]
        full = f"{p.get('last_name') or ''}{p.get('first_name') or ''}".strip()
        return full or p.get("username") or "사용자"
    return (user.email or "나").split("@")[0]


def _availability_rows(poll_id: str) -> list[dict]:
    return (
        supabase_admin.table("meet_availability")
        .select("user_id, name, slots").eq("poll_id", poll_id).execute()
    ).data


def _build_resp(row: dict, respondent_count: int, user_id: str) -> MeetPollResponse:
    can_delete = row.get("created_by") == user_id
    if not can_delete:
        proj = (
            supabase_admin.table("projects").select("owner_id")
            .eq("id", row["project_id"]).limit(1).execute()
        ).data
        can_delete = bool(proj and proj[0]["owner_id"] == user_id)
    return MeetPollResponse(
        id=row["id"], project_id=row["project_id"], title=row["title"],
        dates=row.get("dates") or [], start_hour=row.get("start_hour", 9),
        end_hour=row.get("end_hour", 22), created_at=row["created_at"],
        respondent_count=respondent_count,
        can_delete=can_delete,
    )


def list_polls(project_id: str, token: str) -> list[MeetPollResponse]:
    user = _get_user(token)
    if not _has_project_access(project_id, user.id):
        return []
    rows = (
        supabase_admin.table("meet_polls").select("*")
        .eq("project_id", project_id).order("created_at", desc=True).execute()
    ).data
    out: list[MeetPollResponse] = []
    for r in rows:
        cnt = len(_availability_rows(r["id"]))
        out.append(_build_resp(r, cnt, user.id))
    return out


def create_poll(project_id: str, req: MeetPollCreate, token: str) -> MeetPollResponse:
    user = _get_user(token)
    if not _has_project_access(project_id, user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="프로젝트 멤버가 아닙니다.")
    if req.end_hour <= req.start_hour:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="종료 시간이 시작 시간보다 늦어야 합니다.")
    row = (
        supabase_admin.table("meet_polls").insert({
            "project_id": project_id,
            "title": req.title,
            "dates": req.dates,
            "start_hour": req.start_hour,
            "end_hour": req.end_hour,
            "created_by": user.id,
        }).execute()
    ).data[0]
    try:
        from app.services import push
        push.notify_users(_project_member_user_ids(project_id), "일정 조율",
                          f"'{req.title}' 일정에 응답해주세요", exclude=user.id)
    except Exception:
        pass
    return _build_resp(row, 0, user.id)


def get_poll(poll_id: str, token: str) -> MeetPollDetail:
    user = _get_user(token)
    rows = (
        supabase_admin.table("meet_polls").select("*").eq("id", poll_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="일정 조율을 찾을 수 없습니다.")
    poll = rows[0]
    if not _has_project_access(poll["project_id"], user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="일정 조율을 찾을 수 없습니다.")

    avails = _availability_rows(poll_id)
    counts: dict[str, int] = {}
    my_slots: list[str] = []
    respondents: list[RespondentResponse] = []
    for a in avails:
        slots = a.get("slots") or []
        for s in slots:
            counts[s] = counts.get(s, 0) + 1
        respondents.append(RespondentResponse(
            user_id=a["user_id"], name=a.get("name") or "멤버", slots=slots,
        ))
        if a["user_id"] == user.id:
            my_slots = slots

    total = len(avails)
    best = [s for s, c in counts.items() if total > 0 and c == total]

    base = _build_resp(poll, total, user.id)
    return MeetPollDetail(
        **base.model_dump(),
        counts=counts, total_respondents=total, my_slots=my_slots,
        best_slots=sorted(best), respondents=respondents,
    )


def set_availability(poll_id: str, slots: list[str], token: str) -> MeetPollDetail:
    user = _get_user(token)
    rows = (
        supabase_admin.table("meet_polls").select("project_id").eq("id", poll_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="일정 조율을 찾을 수 없습니다.")
    if not _has_project_access(rows[0]["project_id"], user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="프로젝트 멤버가 아닙니다.")

    name = _display_name(user)
    existing = (
        supabase_admin.table("meet_availability").select("id")
        .eq("poll_id", poll_id).eq("user_id", user.id).limit(1).execute()
    ).data
    if existing:
        supabase_admin.table("meet_availability").update(
            {"slots": slots, "name": name}
        ).eq("id", existing[0]["id"]).execute()
    else:
        supabase_admin.table("meet_availability").insert(
            {"poll_id": poll_id, "user_id": user.id, "name": name, "slots": slots}
        ).execute()
    return get_poll(poll_id, token)


def delete_poll(poll_id: str, token: str) -> None:
    user = _get_user(token)
    rows = (
        supabase_admin.table("meet_polls").select("project_id, created_by")
        .eq("id", poll_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="일정 조율을 찾을 수 없습니다.")
    if rows[0]["created_by"] != user.id:
        proj = (
            supabase_admin.table("projects").select("owner_id")
            .eq("id", rows[0]["project_id"]).limit(1).execute()
        ).data
        if not (proj and proj[0]["owner_id"] == user.id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="삭제 권한이 없습니다.")
    supabase_admin.table("meet_polls").delete().eq("id", poll_id).execute()
