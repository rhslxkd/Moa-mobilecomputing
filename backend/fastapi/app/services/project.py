from datetime import date
from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, MemberResponse


# ── 내부 헬퍼 ─────────────────────────────────────────────

def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _dot_to_iso(s: str) -> str:
    return s.replace(".", "-")


def _iso_to_dot(s: str) -> str:
    return s.replace("-", ".")


def _days_left(end_iso: str) -> int:
    return max(0, (date.fromisoformat(end_iso) - date.today()).days)


def _build(proj: dict, members: list[dict]) -> ProjectResponse:
    return ProjectResponse(
        id=proj["id"],
        name=proj["name"],
        emoji=proj["emoji"],
        color=proj["color"],
        status=proj["status"],
        start_date=_iso_to_dot(proj["start_date"]),
        end_date=_iso_to_dot(proj["end_date"]),
        days_left=_days_left(proj["end_date"]),
        member_count=len(members),
        members=[MemberResponse(id=m["id"], name=m["name"], roles=m["roles"]) for m in members],
        has_chat_alert=proj.get("has_chat_alert", False),
        has_todo_alert=proj.get("has_todo_alert", False),
    )


def _fetch_members(project_id: str) -> list[dict]:
    return (
        supabase_admin.table("project_members")
        .select("*")
        .eq("project_id", project_id)
        .execute()
    ).data


# ── 목록 ──────────────────────────────────────────────────

def list_projects(token: str) -> list[ProjectResponse]:
    user = _get_user(token)
    rows = (
        supabase_admin.table("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    ).data
    return [_build(p, _fetch_members(p["id"])) for p in rows]


# ── 생성 ──────────────────────────────────────────────────

def create_project(req: ProjectCreate, token: str) -> ProjectResponse:
    user = _get_user(token)
    proj = (
        supabase_admin.table("projects")
        .insert({
            "owner_id": user.id,
            "name": req.name,
            "emoji": req.emoji,
            "color": req.color,
            "status": req.status.value,
            "start_date": _dot_to_iso(req.start_date),
            "end_date": _dot_to_iso(req.end_date),
        })
        .execute()
    ).data[0]

    members = (
        supabase_admin.table("project_members")
        .insert([{"project_id": proj["id"], "name": m.name, "roles": m.roles} for m in req.members])
        .execute()
    ).data
    return _build(proj, members)


# ── 단건 조회 ──────────────────────────────────────────────

def get_project(project_id: str, token: str) -> ProjectResponse:
    user = _get_user(token)
    rows = (
        supabase_admin.table("projects")
        .select("*")
        .eq("id", project_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    return _build(rows[0], _fetch_members(project_id))


# ── 수정 ──────────────────────────────────────────────────

def update_project(project_id: str, req: ProjectUpdate, token: str) -> ProjectResponse:
    user = _get_user(token)
    if not (
        supabase_admin.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")

    patch: dict = {}
    if req.name is not None:       patch["name"]       = req.name
    if req.emoji is not None:      patch["emoji"]      = req.emoji
    if req.color is not None:      patch["color"]      = req.color
    if req.status is not None:     patch["status"]     = req.status.value
    if req.start_date is not None: patch["start_date"] = _dot_to_iso(req.start_date)
    if req.end_date is not None:   patch["end_date"]   = _dot_to_iso(req.end_date)
    if patch:
        supabase_admin.table("projects").update(patch).eq("id", project_id).execute()

    if req.members is not None:
        supabase_admin.table("project_members").delete().eq("project_id", project_id).execute()
        supabase_admin.table("project_members").insert(
            [{"project_id": project_id, "name": m.name, "roles": m.roles} for m in req.members]
        ).execute()

    return get_project(project_id, token)


# ── 삭제 ──────────────────────────────────────────────────

def delete_project(project_id: str, token: str) -> None:
    user = _get_user(token)
    if not (
        supabase_admin.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("owner_id", user.id)
        .limit(1)
        .execute()
    ).data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    # project_members는 ON DELETE CASCADE로 자동 삭제
    supabase_admin.table("projects").delete().eq("id", project_id).execute()
