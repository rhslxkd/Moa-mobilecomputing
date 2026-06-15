from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.friend import (
    FriendResponse,
    FriendRequestResponse,
    UserSearchResponse,
    FriendRequestBody,
)


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _display_name(profile: dict) -> str:
    full = f"{profile.get('last_name') or ''}{profile.get('first_name') or ''}".strip()
    return full or profile.get("username") or "사용자"


def _profiles_map(user_ids: list[str]) -> dict[str, dict]:
    if not user_ids:
        return {}
    rows = (
        supabase_admin.table("profiles")
        .select("id, username, first_name, last_name")
        .in_("id", user_ids)
        .execute()
    ).data
    return {r["id"]: r for r in rows}


# ── 친구 목록 ──────────────────────────────────────────────

def list_friends(token: str) -> list[FriendResponse]:
    user = _get_user(token)
    rows = (
        supabase_admin.table("friendships")
        .select("*")
        .eq("status", "accepted")
        .or_(f"requester_id.eq.{user.id},addressee_id.eq.{user.id}")
        .execute()
    ).data

    # 상대방 id 추출
    result: list[tuple[str, str]] = []  # (friendship_id, other_user_id)
    for r in rows:
        other = r["addressee_id"] if r["requester_id"] == user.id else r["requester_id"]
        result.append((r["id"], other))

    pmap = _profiles_map([o for _, o in result])
    out: list[FriendResponse] = []
    for fid, other in result:
        p = pmap.get(other)
        if not p:
            continue
        out.append(FriendResponse(
            friendship_id=fid,
            user_id=other,
            username=p.get("username") or "",
            name=_display_name(p),
        ))
    return out


# ── 받은 친구 요청 ─────────────────────────────────────────

def list_requests(token: str) -> list[FriendRequestResponse]:
    user = _get_user(token)
    rows = (
        supabase_admin.table("friendships")
        .select("*")
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    ).data
    pmap = _profiles_map([r["requester_id"] for r in rows])
    out: list[FriendRequestResponse] = []
    for r in rows:
        p = pmap.get(r["requester_id"])
        if not p:
            continue
        out.append(FriendRequestResponse(
            friendship_id=r["id"],
            user_id=r["requester_id"],
            username=p.get("username") or "",
            name=_display_name(p),
        ))
    return out


# ── 유저 검색 ──────────────────────────────────────────────

def search_user(username: str, token: str) -> UserSearchResponse:
    user = _get_user(token)
    rows = (
        supabase_admin.table("profiles")
        .select("id, username, first_name, last_name")
        .eq("username", username)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="해당 아이디의 사용자를 찾을 수 없습니다.")
    p = rows[0]
    if p["id"] == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="자기 자신은 추가할 수 없습니다.")
    return UserSearchResponse(
        user_id=p["id"],
        username=p.get("username") or "",
        name=_display_name(p),
    )


# ── 친구 요청 ──────────────────────────────────────────────

def _resolve_target(req: FriendRequestBody) -> str:
    if req.user_id:
        return req.user_id
    if req.username:
        rows = (
            supabase_admin.table("profiles")
            .select("id")
            .eq("username", req.username)
            .limit(1)
            .execute()
        ).data
        if not rows:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="해당 아이디의 사용자를 찾을 수 없습니다.")
        return rows[0]["id"]
    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="username 또는 user_id가 필요합니다.")


def send_request(req: FriendRequestBody, token: str) -> FriendRequestResponse:
    user = _get_user(token)
    target = _resolve_target(req)
    if target == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="자기 자신에게 요청할 수 없습니다.")

    # 이미 관계가 있는지 (양방향 확인)
    existing = (
        supabase_admin.table("friendships")
        .select("*")
        .or_(
            f"and(requester_id.eq.{user.id},addressee_id.eq.{target}),"
            f"and(requester_id.eq.{target},addressee_id.eq.{user.id})"
        )
        .execute()
    ).data
    if existing:
        e = existing[0]
        if e["status"] == "accepted":
            raise HTTPException(status.HTTP_409_CONFLICT, detail="이미 친구입니다.")
        raise HTTPException(status.HTTP_409_CONFLICT, detail="이미 친구 요청이 진행 중입니다.")

    row = (
        supabase_admin.table("friendships")
        .insert({"requester_id": user.id, "addressee_id": target, "status": "pending"})
        .execute()
    ).data[0]

    # 받는 사람에게 푸시 알림
    try:
        from app.services import push
        me = _profiles_map([user.id]).get(user.id, {})
        sender_name = _display_name(me) if me else "누군가"
        push.notify_user(target, "친구 요청", f"{sender_name}님이 친구 요청을 보냈어요.")
    except Exception:
        pass

    pmap = _profiles_map([target])
    p = pmap.get(target, {})
    return FriendRequestResponse(
        friendship_id=row["id"],
        user_id=target,
        username=p.get("username") or "",
        name=_display_name(p) if p else "사용자",
    )


# ── 수락 ───────────────────────────────────────────────────

def accept_request(friendship_id: str, token: str) -> None:
    user = _get_user(token)
    rows = (
        supabase_admin.table("friendships")
        .select("*")
        .eq("id", friendship_id)
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="친구 요청을 찾을 수 없습니다.")
    supabase_admin.table("friendships").update({"status": "accepted"}).eq("id", friendship_id).execute()

    # 요청 보낸 사람에게 수락 푸시
    try:
        from app.services import push
        me = _profiles_map([user.id]).get(user.id, {})
        my_name = _display_name(me) if me else "상대방"
        push.notify_user(rows[0]["requester_id"], "친구 수락", f"{my_name}님과 친구가 됐어요.")
    except Exception:
        pass


# ── 삭제 / 거절 ────────────────────────────────────────────

def remove_friendship(friendship_id: str, token: str) -> None:
    user = _get_user(token)
    rows = (
        supabase_admin.table("friendships")
        .select("*")
        .eq("id", friendship_id)
        .or_(f"requester_id.eq.{user.id},addressee_id.eq.{user.id}")
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="친구 관계를 찾을 수 없습니다.")
    supabase_admin.table("friendships").delete().eq("id", friendship_id).execute()
