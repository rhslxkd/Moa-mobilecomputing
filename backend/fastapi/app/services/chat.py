import re
import uuid as uuidlib

from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.chat import (
    ChatRoomResponse, MessageResponse, NoticeResponse, PollResponse,
)

DRIVE_BUCKET = "drive"


def _safe_ext(filename: str) -> str:
    if "." in filename:
        ext = re.sub(r"[^a-zA-Z0-9]", "", filename.rsplit(".", 1)[1])
        if ext:
            return f".{ext.lower()}"
    return ""


def _attachment_url(path: str | None) -> str | None:
    if not path:
        return None
    try:
        signed = supabase_admin.storage.from_(DRIVE_BUCKET).create_signed_url(path, 3600)
        return signed.get("signedURL") or signed.get("signed_url")
    except Exception:
        return None


def _build_message(row: dict, sender_name: str) -> MessageResponse:
    return MessageResponse(
        id=row["id"], room_id=row["room_id"], sender_id=row["sender_id"],
        sender_name=sender_name, content=row.get("content") or "",
        created_at=row["created_at"],
        attachment_type=row.get("attachment_type"),
        attachment_name=row.get("attachment_name"),
        attachment_url=_attachment_url(row.get("attachment_path")),
        attachment_mime=row.get("attachment_mime"),
    )


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _display_name(p: dict) -> str:
    full = f"{p.get('last_name') or ''}{p.get('first_name') or ''}".strip()
    return full or p.get("username") or "사용자"


def _profiles_map(ids: list[str]) -> dict[str, dict]:
    ids = [i for i in set(ids) if i]
    if not ids:
        return {}
    rows = (
        supabase_admin.table("profiles")
        .select("id, username, first_name, last_name")
        .in_("id", ids)
        .execute()
    ).data
    return {r["id"]: r for r in rows}


def _member_ids(room_id: str) -> list[str]:
    rows = (
        supabase_admin.table("chat_room_members")
        .select("user_id")
        .eq("room_id", room_id)
        .execute()
    ).data
    return [r["user_id"] for r in rows]


def _assert_member(room_id: str, user_id: str) -> None:
    rows = (
        supabase_admin.table("chat_room_members")
        .select("id")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="채팅방 멤버가 아닙니다.")


def _last_message(room_id: str) -> tuple[str | None, str | None]:
    rows = (
        supabase_admin.table("messages")
        .select("content, created_at")
        .eq("room_id", room_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    ).data
    if not rows:
        return None, None
    return rows[0]["content"], rows[0]["created_at"]


def _unread_count(room_id: str, user_id: str) -> int:
    """last_read_at 이후 타인의 메시지 수 반환 (내가 보낸 건 제외)."""
    member = (
        supabase_admin.table("chat_room_members")
        .select("last_read_at")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    ).data
    if not member:
        return 0
    last_read = member[0].get("last_read_at")
    query = (
        supabase_admin.table("messages")
        .select("id")
        .eq("room_id", room_id)
        .neq("sender_id", user_id)   # 내가 보낸 메시지 제외
    )
    if last_read:
        query = query.gt("created_at", last_read)
    return len(query.execute().data)


# ── 방 목록 ────────────────────────────────────────────────

def list_rooms(token: str) -> list[ChatRoomResponse]:
    user = _get_user(token)
    my = (
        supabase_admin.table("chat_room_members")
        .select("room_id")
        .eq("user_id", user.id)
        .execute()
    ).data
    room_ids = [m["room_id"] for m in my]
    if not room_ids:
        return []

    rooms = (
        supabase_admin.table("chat_rooms")
        .select("*")
        .in_("id", room_ids)
        .execute()
    ).data

    # 프로젝트명 매핑
    proj_ids = [r["project_id"] for r in rooms if r.get("project_id")]
    proj_map: dict[str, str] = {}
    if proj_ids:
        projs = supabase_admin.table("projects").select("id, name").in_("id", proj_ids).execute().data
        proj_map = {p["id"]: p["name"] for p in projs}

    out: list[ChatRoomResponse] = []
    for r in rooms:
        members = _member_ids(r["id"])
        if r["type"] == "project":
            name = proj_map.get(r.get("project_id"), "프로젝트")
        else:
            others = [m for m in members if m != user.id]
            pmap = _profiles_map(others)
            name = _display_name(pmap[others[0]]) if others and others[0] in pmap else "대화"
        last_msg, last_at = _last_message(r["id"])
        out.append(ChatRoomResponse(
            id=r["id"], type=r["type"], name=name,
            project_id=r.get("project_id"), member_count=len(members),
            last_message=last_msg, last_message_at=last_at,
            unread_count=_unread_count(r["id"], user.id),
        ))
    # 최근 메시지 순 정렬
    out.sort(key=lambda x: x.last_message_at or "", reverse=True)
    return out


# ── 1:1 방 생성/조회 ───────────────────────────────────────

def get_or_create_direct(friend_user_id: str, token: str) -> ChatRoomResponse:
    user = _get_user(token)
    if friend_user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="자기 자신과는 채팅할 수 없습니다.")

    # 기존 direct 방 탐색 (두 사람이 모두 멤버인 direct 방)
    my_rooms = set(
        m["room_id"] for m in
        supabase_admin.table("chat_room_members").select("room_id").eq("user_id", user.id).execute().data
    )
    if my_rooms:
        shared = (
            supabase_admin.table("chat_room_members")
            .select("room_id")
            .eq("user_id", friend_user_id)
            .in_("room_id", list(my_rooms))
            .execute()
        ).data
        for s in shared:
            room = supabase_admin.table("chat_rooms").select("*").eq("id", s["room_id"]).eq("type", "direct").limit(1).execute().data
            if room:
                return _build_room(room[0], user.id)

    # 생성
    room = supabase_admin.table("chat_rooms").insert({"type": "direct"}).execute().data[0]
    supabase_admin.table("chat_room_members").insert([
        {"room_id": room["id"], "user_id": user.id},
        {"room_id": room["id"], "user_id": friend_user_id},
    ]).execute()
    return _build_room(room, user.id)


# ── 프로젝트 방 생성/조회 ──────────────────────────────────

def _sync_project_room_members(room_id: str, project_id: str) -> None:
    """프로젝트의 모든 실제 유저(owner + 수락된 멤버)를 채팅방에 동기화."""
    proj = supabase_admin.table("projects").select("owner_id").eq("id", project_id).limit(1).execute().data
    target_ids: set[str] = set()
    if proj:
        target_ids.add(proj[0]["owner_id"])
    pm = (
        supabase_admin.table("project_members")
        .select("user_id").eq("project_id", project_id).eq("status", "accepted")
        .execute()
    ).data
    for m in pm:
        if m.get("user_id"):
            target_ids.add(m["user_id"])

    existing = {
        r["user_id"] for r in
        supabase_admin.table("chat_room_members").select("user_id").eq("room_id", room_id).execute().data
    }
    new_members = [{"room_id": room_id, "user_id": uid} for uid in target_ids - existing]
    if new_members:
        supabase_admin.table("chat_room_members").insert(new_members).execute()


def get_or_create_project_room(project_id: str, token: str) -> ChatRoomResponse:
    user = _get_user(token)
    # 프로젝트 접근 권한 (owner 또는 수락된 멤버)
    proj = (
        supabase_admin.table("projects").select("id, name, owner_id").eq("id", project_id).limit(1).execute()
    ).data
    if not proj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="프로젝트를 찾을 수 없습니다.")
    is_owner = proj[0]["owner_id"] == user.id
    is_member = bool(
        supabase_admin.table("project_members").select("id")
        .eq("project_id", project_id).eq("user_id", user.id).eq("status", "accepted")
        .limit(1).execute().data
    )
    if not (is_owner or is_member):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="프로젝트 멤버가 아닙니다.")

    existing = supabase_admin.table("chat_rooms").select("*").eq("type", "project").eq("project_id", project_id).limit(1).execute().data
    if existing:
        room = existing[0]
    else:
        room = supabase_admin.table("chat_rooms").insert({"type": "project", "project_id": project_id}).execute().data[0]

    # 프로젝트 멤버 전체를 방에 동기화
    _sync_project_room_members(room["id"], project_id)
    return _build_room(room, user.id)


def _build_room(room: dict, user_id: str) -> ChatRoomResponse:
    members = _member_ids(room["id"])
    if room.get("name"):
        # 사용자가 지정한 톡방 이름 우선
        name = room["name"]
    elif room["type"] == "project":
        proj = supabase_admin.table("projects").select("name").eq("id", room["project_id"]).limit(1).execute().data
        name = proj[0]["name"] if proj else "프로젝트"
    else:
        others = [m for m in members if m != user_id]
        pmap = _profiles_map(others)
        name = _display_name(pmap[others[0]]) if others and others[0] in pmap else "대화"
    last_msg, last_at = _last_message(room["id"])
    return ChatRoomResponse(
        id=room["id"], type=room["type"], name=name,
        project_id=room.get("project_id"), member_count=len(members),
        last_message=last_msg, last_message_at=last_at,
        unread_count=_unread_count(room["id"], user_id),
    )


# ── 메시지 ─────────────────────────────────────────────────

def list_messages(room_id: str, token: str) -> list[MessageResponse]:
    user = _get_user(token)
    _assert_member(room_id, user.id)
    rows = (
        supabase_admin.table("messages")
        .select("*")
        .eq("room_id", room_id)
        .order("created_at")
        .execute()
    ).data
    pmap = _profiles_map([r["sender_id"] for r in rows])
    return [
        _build_message(r, _display_name(pmap.get(r["sender_id"], {})))
        for r in rows
    ]


def get_read_status(room_id: str, token: str) -> list[dict]:
    """방 멤버들의 last_read_at 반환."""
    user = _get_user(token)
    _assert_member(room_id, user.id)
    rows = (
        supabase_admin.table("chat_room_members")
        .select("user_id, last_read_at")
        .eq("room_id", room_id)
        .execute()
    ).data
    return rows


def list_room_members(room_id: str, token: str) -> list[dict]:
    """채팅방 멤버 목록 (profile 이름 포함)."""
    user = _get_user(token)
    _assert_member(room_id, user.id)
    ids = _member_ids(room_id)
    pmap = _profiles_map(ids)
    return [
        {"user_id": uid, "name": _display_name(pmap.get(uid, {})), "is_me": uid == user.id}
        for uid in ids
    ]


def mark_as_read(room_id: str, token: str) -> None:
    """채팅방 입장 시 last_read_at 갱신."""
    user = _get_user(token)
    _assert_member(room_id, user.id)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    supabase_admin.table("chat_room_members").update(
        {"last_read_at": now}
    ).eq("room_id", room_id).eq("user_id", user.id).execute()


def send_message(room_id: str, content: str, token: str) -> MessageResponse:
    user = _get_user(token)
    _assert_member(room_id, user.id)
    row = (
        supabase_admin.table("messages")
        .insert({"room_id": room_id, "sender_id": user.id, "content": content})
        .execute()
    ).data[0]
    pmap = _profiles_map([user.id])
    sender = _display_name(pmap.get(user.id, {}))
    from app.services import push
    push.notify_users(_member_ids(room_id), sender, content[:60], exclude=user.id)
    return _build_message(row, sender)


def send_file_message(
    room_id: str, file_bytes: bytes, filename: str, mime: str | None, token: str,
) -> MessageResponse:
    user = _get_user(token)
    _assert_member(room_id, user.id)

    storage_path = f"chat/{room_id}/{uuidlib.uuid4().hex}{_safe_ext(filename)}"
    try:
        supabase_admin.storage.from_(DRIVE_BUCKET).upload(
            storage_path, file_bytes,
            {"content-type": mime or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"파일 전송 실패: {str(e)[:120]}")

    att_type = "image" if (mime or "").startswith("image/") else "file"
    row = (
        supabase_admin.table("messages")
        .insert({
            "room_id": room_id, "sender_id": user.id, "content": "",
            "attachment_path": storage_path,
            "attachment_name": filename,
            "attachment_type": att_type,
            "attachment_mime": mime,
        })
        .execute()
    ).data[0]
    pmap = _profiles_map([user.id])
    sender = _display_name(pmap.get(user.id, {}))
    from app.services import push
    push.notify_users(_member_ids(room_id), sender, "파일을 보냈어요", exclude=user.id)
    return _build_message(row, sender)


# ── 공지 ───────────────────────────────────────────────────

def _author_name(user_id: str) -> str:
    return _display_name(_profiles_map([user_id]).get(user_id, {}))


def list_notices(room_id: str, token: str) -> list[NoticeResponse]:
    user = _get_user(token)
    _assert_member(room_id, user.id)
    rows = (
        supabase_admin.table("chat_notices")
        .select("*").eq("room_id", room_id)
        .order("created_at", desc=True).execute()
    ).data
    pmap = _profiles_map([r["created_by"] for r in rows])
    owner_id = _room_owner_id(room_id)
    return [
        NoticeResponse(
            id=r["id"], room_id=r["room_id"], content=r["content"],
            author_name=_display_name(pmap.get(r["created_by"], {})),
            created_at=r["created_at"],
            can_delete=(r["created_by"] == user.id or owner_id == user.id),
        )
        for r in rows
    ]


def create_notice(room_id: str, content: str, token: str) -> NoticeResponse:
    user = _get_user(token)
    _assert_member(room_id, user.id)
    row = (
        supabase_admin.table("chat_notices")
        .insert({"room_id": room_id, "content": content, "created_by": user.id})
        .execute()
    ).data[0]
    from app.services import push
    push.notify_users(_member_ids(room_id), "새 공지", content[:60], exclude=user.id)
    return NoticeResponse(
        id=row["id"], room_id=row["room_id"], content=row["content"],
        author_name=_author_name(user.id), created_at=row["created_at"],
        can_delete=True,
    )


def _room_owner_id(room_id: str) -> str | None:
    """방이 프로젝트와 연결돼 있으면 그 프로젝트 owner(방장) id, 아니면 None."""
    room = (
        supabase_admin.table("chat_rooms").select("project_id")
        .eq("id", room_id).limit(1).execute()
    ).data
    project_id = room[0].get("project_id") if room else None
    if not project_id:
        return None
    proj = (
        supabase_admin.table("projects").select("owner_id")
        .eq("id", project_id).limit(1).execute()
    ).data
    return proj[0]["owner_id"] if proj else None


def _assert_can_delete(room_id: str, created_by: str | None, user_id: str) -> None:
    """작성자 본인이거나 프로젝트 방장(owner)만 삭제 가능."""
    if created_by != user_id and _room_owner_id(room_id) != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="삭제 권한이 없습니다.")


def delete_notice(notice_id: str, token: str) -> None:
    user = _get_user(token)
    rows = (
        supabase_admin.table("chat_notices").select("room_id, created_by")
        .eq("id", notice_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="공지를 찾을 수 없습니다.")
    _assert_can_delete(rows[0]["room_id"], rows[0]["created_by"], user.id)
    supabase_admin.table("chat_notices").delete().eq("id", notice_id).execute()


# ── 투표 ───────────────────────────────────────────────────

def _build_poll(p: dict, my_user_id: str) -> PollResponse:
    votes = (
        supabase_admin.table("chat_poll_votes")
        .select("user_id, option_index").eq("poll_id", p["id"]).execute()
    ).data
    options = p.get("options") or []
    counts = [0] * len(options)
    my_vote = None
    for v in votes:
        idx = v.get("option_index")
        if idx is not None and 0 <= idx < len(counts):
            counts[idx] += 1
        if v.get("user_id") == my_user_id:
            my_vote = idx
    return PollResponse(
        id=p["id"], room_id=p["room_id"], question=p["question"],
        options=options, counts=counts, total_votes=len(votes),
        my_vote=my_vote, author_name=_author_name(p["created_by"]),
        closed=p.get("closed", False), created_at=p["created_at"],
        can_delete=(p["created_by"] == my_user_id or _room_owner_id(p["room_id"]) == my_user_id),
    )


def list_polls(room_id: str, token: str) -> list[PollResponse]:
    user = _get_user(token)
    _assert_member(room_id, user.id)
    rows = (
        supabase_admin.table("chat_polls")
        .select("*").eq("room_id", room_id)
        .order("created_at", desc=True).execute()
    ).data
    return [_build_poll(p, user.id) for p in rows]


def create_poll(room_id: str, question: str, options: list[str], token: str) -> PollResponse:
    user = _get_user(token)
    _assert_member(room_id, user.id)
    opts = [o.strip() for o in options if o.strip()]
    if len(opts) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="선택지는 2개 이상이어야 합니다.")
    row = (
        supabase_admin.table("chat_polls")
        .insert({"room_id": room_id, "question": question, "options": opts, "created_by": user.id})
        .execute()
    ).data[0]
    from app.services import push
    push.notify_users(_member_ids(room_id), "새 투표", question[:60], exclude=user.id)
    return _build_poll(row, user.id)


def vote_poll(poll_id: str, option_index: int, token: str) -> PollResponse:
    user = _get_user(token)
    rows = (
        supabase_admin.table("chat_polls").select("*").eq("id", poll_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="투표를 찾을 수 없습니다.")
    poll = rows[0]
    _assert_member(poll["room_id"], user.id)
    if not (0 <= option_index < len(poll.get("options") or [])):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="잘못된 선택지입니다.")
    existing = (
        supabase_admin.table("chat_poll_votes").select("id")
        .eq("poll_id", poll_id).eq("user_id", user.id).limit(1).execute()
    ).data
    if existing:
        supabase_admin.table("chat_poll_votes").update(
            {"option_index": option_index}
        ).eq("id", existing[0]["id"]).execute()
    else:
        supabase_admin.table("chat_poll_votes").insert(
            {"poll_id": poll_id, "user_id": user.id, "option_index": option_index}
        ).execute()
    return _build_poll(poll, user.id)


def delete_poll(poll_id: str, token: str) -> None:
    user = _get_user(token)
    rows = (
        supabase_admin.table("chat_polls").select("room_id, created_by")
        .eq("id", poll_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="투표를 찾을 수 없습니다.")
    _assert_can_delete(rows[0]["room_id"], rows[0]["created_by"], user.id)
    supabase_admin.table("chat_polls").delete().eq("id", poll_id).execute()


# ── 채팅방 설정 ─────────────────────────────────────────────

def rename_room(room_id: str, name: str, token: str) -> ChatRoomResponse:
    """톡방 이름 변경. 빈 값이면 기본(파생) 이름으로 되돌림."""
    user = _get_user(token)
    _assert_member(room_id, user.id)
    new_name = (name or "").strip() or None
    supabase_admin.table("chat_rooms").update({"name": new_name}).eq("id", room_id).execute()
    room = (
        supabase_admin.table("chat_rooms").select("*").eq("id", room_id).limit(1).execute()
    ).data[0]
    return _build_room(room, user.id)


def leave_room(room_id: str, token: str) -> None:
    """채팅방 나가기 — 내 멤버십 제거. 마지막 멤버면 방 삭제."""
    user = _get_user(token)
    _assert_member(room_id, user.id)
    supabase_admin.table("chat_room_members").delete().eq("room_id", room_id).eq("user_id", user.id).execute()
    remaining = _member_ids(room_id)
    if not remaining:
        supabase_admin.table("chat_rooms").delete().eq("id", room_id).execute()
