from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.member import MemberUpdate
from app.schemas.project import MemberCreate, MemberResponse


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _verify_project_owner(project_id: str, user_id: str) -> None:
    rows = (
        supabase_admin.table("projects")
        .select("id")
        .eq("id", project_id)
        .eq("owner_id", user_id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")


def _get_owned_member(member_id: str, user_id: str) -> dict:
    rows = (
        supabase_admin.table("project_members")
        .select("*")
        .eq("id", member_id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="멤버를 찾을 수 없습니다.")
    member = rows[0]
    _verify_project_owner(member["project_id"], user_id)
    return member


def _build(row: dict) -> MemberResponse:
    return MemberResponse(id=row["id"], user_id=row.get("user_id"), name=row["name"], roles=row["roles"])


def list_members(project_id: str, token: str) -> list[MemberResponse]:
    user = _get_user(token)
    _verify_project_owner(project_id, user.id)
    rows = (
        supabase_admin.table("project_members")
        .select("*")
        .eq("project_id", project_id)
        .order("id")
        .execute()
    ).data
    return [_build(r) for r in rows]


def add_member(project_id: str, req: MemberCreate, token: str) -> MemberResponse:
    user = _get_user(token)
    _verify_project_owner(project_id, user.id)
    payload = {"project_id": project_id, "name": req.name, "roles": req.roles}
    # 실제 유저(친구)를 추가하면 초대 대기(pending) 상태로
    if getattr(req, "user_id", None):
        payload["user_id"] = req.user_id
        payload["status"] = "pending"
    else:
        payload["status"] = "accepted"
    row = (
        supabase_admin.table("project_members").insert(payload).execute()
    ).data[0]
    # 초대받은 사람에게 푸시
    if payload.get("status") == "pending" and payload.get("user_id"):
        proj = (
            supabase_admin.table("projects").select("name")
            .eq("id", project_id).limit(1).execute()
        ).data
        pname = proj[0]["name"] if proj else "프로젝트"
        from app.services import push
        push.notify_user(payload["user_id"], "프로젝트 초대", f"'{pname}'에 초대됐어요")
    return _build(row)


def update_member(member_id: str, req: MemberUpdate, token: str) -> MemberResponse:
    user = _get_user(token)
    _get_owned_member(member_id, user.id)

    patch: dict = {}
    if req.name is not None:
        patch["name"] = req.name
    if req.roles is not None:
        patch["roles"] = req.roles
    if patch:
        supabase_admin.table("project_members").update(patch).eq("id", member_id).execute()

    row = (
        supabase_admin.table("project_members")
        .select("*")
        .eq("id", member_id)
        .limit(1)
        .execute()
    ).data[0]
    return _build(row)


def delete_member(member_id: str, token: str) -> None:
    user = _get_user(token)
    _get_owned_member(member_id, user.id)
    supabase_admin.table("project_members").delete().eq("id", member_id).execute()
