from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError
from app.core.supabase import supabase_admin
from pydantic import BaseModel


class InvitationResponse(BaseModel):
    member_id: str
    project_id: str
    project_name: str
    invited_by: str     # 프로젝트 오너 이름
    created_at: str


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def list_invitations(token: str) -> list[InvitationResponse]:
    """나에게 온 대기 중인 프로젝트 초대 목록."""
    user = _get_user(token)
    rows = (
        supabase_admin.table("project_members")
        .select("id, project_id, created_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    ).data

    out: list[InvitationResponse] = []
    for r in rows:
        proj = supabase_admin.table("projects").select("name, owner_id").eq("id", r["project_id"]).limit(1).execute().data
        if not proj:
            continue
        owner_profile = supabase_admin.table("profiles").select("first_name, last_name, username").eq("id", proj[0]["owner_id"]).limit(1).execute().data
        owner_name = ""
        if owner_profile:
            p = owner_profile[0]
            owner_name = f"{p.get('last_name','')}{p.get('first_name','')}".strip() or p.get("username", "")
        out.append(InvitationResponse(
            member_id=r["id"],
            project_id=r["project_id"],
            project_name=proj[0]["name"],
            invited_by=owner_name,
            created_at=r["created_at"],
        ))
    return out


def accept_invitation(member_id: str, roles: list[str], token: str) -> None:
    """초대 수락 + 역할 선택."""
    user = _get_user(token)
    row = (
        supabase_admin.table("project_members")
        .select("*")
        .eq("id", member_id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1)
        .execute()
    ).data
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="초대를 찾을 수 없습니다.")
    supabase_admin.table("project_members").update(
        {"status": "accepted", "roles": roles}
    ).eq("id", member_id).execute()


def decline_invitation(member_id: str, token: str) -> None:
    """초대 거절 → 멤버 레코드 삭제."""
    user = _get_user(token)
    row = (
        supabase_admin.table("project_members")
        .select("id")
        .eq("id", member_id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1)
        .execute()
    ).data
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="초대를 찾을 수 없습니다.")
    supabase_admin.table("project_members").delete().eq("id", member_id).execute()
