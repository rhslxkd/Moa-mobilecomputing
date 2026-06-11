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
        owner_id=proj["owner_id"],
        name=proj["name"],
        emoji=proj["emoji"],
        color=proj["color"],
        status=proj["status"],
        start_date=_iso_to_dot(proj["start_date"]),
        end_date=_iso_to_dot(proj["end_date"]),
        days_left=_days_left(proj["end_date"]),
        member_count=len(members),
        members=[MemberResponse(id=m["id"], user_id=m.get("user_id"), name=m["name"], roles=m["roles"]) for m in members],
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


def _has_access(project_id: str, user_id: str) -> bool:
    """owner이거나 수락된 멤버면 접근 가능."""
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


def _user_display_name(user) -> str:
    """profiles에서 표시명 구성 (없으면 이메일 앞부분)."""
    rows = (
        supabase_admin.table("profiles")
        .select("first_name, last_name, username")
        .eq("id", user.id).limit(1).execute()
    ).data
    if rows:
        p = rows[0]
        full = f"{p.get('last_name') or ''}{p.get('first_name') or ''}".strip()
        if full:
            return full
        if p.get("username"):
            return p["username"]
    return (user.email or "나").split("@")[0]


# ── 목록 ──────────────────────────────────────────────────

def list_projects(token: str) -> list[ProjectResponse]:
    user = _get_user(token)

    # 내가 owner인 프로젝트
    owned = (
        supabase_admin.table("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    ).data

    # 내가 수락한 멤버인 프로젝트 (pending 제외)
    member_rows = (
        supabase_admin.table("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .execute()
    ).data
    member_project_ids = {r["project_id"] for r in member_rows}
    # owner인 것은 이미 포함돼 있으므로 중복 제거
    owned_ids = {p["id"] for p in owned}
    extra_ids = member_project_ids - owned_ids

    extra: list[dict] = []
    if extra_ids:
        extra = (
            supabase_admin.table("projects")
            .select("*")
            .in_("id", list(extra_ids))
            .order("created_at", desc=True)
            .execute()
        ).data

    all_projects = owned + extra
    return [_build(p, _fetch_members(p["id"])) for p in all_projects]


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

    # 방장(owner)을 첫 멤버로 추가 (이미 멤버 목록에 본인이 없을 때만)
    owner_in_members = any(getattr(m, "user_id", None) == user.id for m in req.members)
    rows_to_insert: list[dict] = []
    if not owner_in_members:
        rows_to_insert.append({
            "project_id": proj["id"],
            "name": _user_display_name(user),
            "roles": ["방장"],
            "user_id": user.id,
            "status": "accepted",
        })
    rows_to_insert.extend({
        "project_id": proj["id"],
        "name": m.name,
        "roles": m.roles,
        **({"user_id": m.user_id, "status": "pending"} if getattr(m, "user_id", None) else {"status": "accepted"}),
    } for m in req.members)

    members = (
        supabase_admin.table("project_members")
        .insert(rows_to_insert)
        .execute()
    ).data
    return _build(proj, members)


# ── 단건 조회 ──────────────────────────────────────────────

def get_project(project_id: str, token: str) -> ProjectResponse:
    user = _get_user(token)
    if not _has_access(project_id, user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    rows = (
        supabase_admin.table("projects")
        .select("*")
        .eq("id", project_id)
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
        # id 기반 diff 처리 — 기존 멤버 id를 유지해서 todo 담당자/회의 참여자 연결 보존
        existing = (
            supabase_admin.table("project_members")
            .select("id")
            .eq("project_id", project_id)
            .execute()
        ).data
        existing_ids = {e["id"] for e in existing}
        incoming_ids = {m.id for m in req.members if getattr(m, "id", None)}

        # 1) 빠진 멤버 삭제 (todos/meeting_participants는 ON DELETE SET NULL)
        for mid in existing_ids - incoming_ids:
            supabase_admin.table("project_members").delete().eq("id", mid).execute()

        # 2) 기존 멤버는 수정, 신규 멤버는 추가
        for m in req.members:
            mid = getattr(m, "id", None)
            uid = getattr(m, "user_id", None)
            if mid and mid in existing_ids:
                patch = {"name": m.name, "roles": m.roles}
                if uid:
                    patch["user_id"] = uid
                supabase_admin.table("project_members").update(patch).eq("id", mid).execute()
            else:
                row = {
                    "project_id": project_id,
                    "name": m.name,
                    "roles": m.roles,
                    "status": "pending" if uid else "accepted",
                }
                if uid:
                    row["user_id"] = uid
                supabase_admin.table("project_members").insert(row).execute()

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
