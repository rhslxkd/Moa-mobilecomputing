import logging
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.notification import NotificationResponse

logger = logging.getLogger("moa.notification")


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _relative_time(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
    except ValueError:
        return ""
    now = datetime.now(timezone.utc)
    secs = (now - dt).total_seconds()
    if secs < 60:
        return "방금 전"
    if secs < 3600:
        return f"{int(secs // 60)}분 전"
    if secs < 86400:
        return f"{int(secs // 3600)}시간 전"
    days = int(secs // 86400)
    if days == 1:
        return "어제"
    return f"{days}일 전"


def _read_ids(user_id: str) -> set[str]:
    rows = (
        supabase_admin.table("notification_reads")
        .select("notification_id")
        .eq("user_id", user_id)
        .execute()
    ).data
    return {r["notification_id"] for r in rows}


def mark_read(notification_id: str, token: str) -> None:
    """알림을 읽음 처리 (중복이면 무시)."""
    user = _get_user(token)
    try:
        supabase_admin.table("notification_reads").insert(
            {"user_id": user.id, "notification_id": notification_id}
        ).execute()
    except Exception as e:
        logger.debug("알림 읽음 처리 중복/실패(이미 읽음 가능): %s", e)  # unique 충돌 = 이미 읽음


def list_notifications(token: str) -> list[NotificationResponse]:
    """todo 마감 임박 + 최근 회의를 알림으로 동적 합성. 읽은 알림은 제외."""
    user = _get_user(token)
    read_ids = _read_ids(user.id)

    # 내가 오너이거나 accepted 멤버인 프로젝트 모두 포함
    owned = (
        supabase_admin.table("projects").select("id, name").eq("owner_id", user.id).execute()
    ).data
    member_rows = (
        supabase_admin.table("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .execute()
    ).data
    member_proj_ids = [r["project_id"] for r in member_rows]
    member_projects = []
    if member_proj_ids:
        member_projects = (
            supabase_admin.table("projects").select("id, name").in_("id", member_proj_ids).execute()
        ).data
    proj_map = {p["id"]: p["name"] for p in owned + member_projects}

    # 내가 속한 project_members ID → assignee_member_id 조회에 사용
    my_member_ids: list[str] = []
    all_member_rows = (
        supabase_admin.table("project_members")
        .select("id")
        .eq("user_id", user.id)
        .execute()
    ).data
    my_member_ids = [r["id"] for r in all_member_rows]

    today = date.today()

    # 1) 마감 임박/지난 미완료 todo (내가 owner이거나 담당자인 것)
    todo_notifs: list[tuple[int, NotificationResponse]] = []
    todos_owned = (
        supabase_admin.table("todos").select("*").eq("owner_id", user.id).eq("done", False).execute()
    ).data
    todos_assigned: list[dict] = []
    if my_member_ids:
        todos_assigned = (
            supabase_admin.table("todos")
            .select("*")
            .in_("assignee_member_id", my_member_ids)
            .eq("done", False)
            .execute()
        ).data
    seen_todo_ids: set[str] = set()
    for t in todos_owned + todos_assigned:
        if t["id"] in seen_todo_ids:
            continue
        seen_todo_ids.add(t["id"])
        if not t.get("due_date"):
            continue
        try:
            due = date.fromisoformat(t["due_date"])
        except ValueError:
            continue
        diff = (due - today).days
        if diff > 1:
            continue
        proj = proj_map.get(t.get("project_id"), "개인")
        if diff < 0:
            body, time_label = f"'{t['title']}' 마감이 지났어요.", f"D+{abs(diff)}"
        elif diff == 0:
            body, time_label = f"'{t['title']}'이(가) 오늘 마감입니다.", "오늘 마감"
        else:
            body, time_label = f"'{t['title']}'이(가) 내일 마감입니다.", "내일 마감"
        todo_notifs.append((diff, NotificationResponse(
            id=f"todo-{t['id']}", type="todo", title="할일 마감 임박",
            body=body, project=proj, time=time_label, read=False,
        )))
    todo_notifs.sort(key=lambda x: x[0])  # 지난 것(음수) 먼저

    # 2) 최근 회의 (내가 owner이거나 출석한 회의)
    meeting_notifs: list[NotificationResponse] = []
    meetings_owned = (
        supabase_admin.table("meetings")
        .select("*").eq("owner_id", user.id)
        .order("created_at", desc=True).limit(5).execute()
    ).data
    attended_rows = (
        supabase_admin.table("meeting_attendance")
        .select("meeting_id").eq("user_id", user.id).execute()
    ).data
    attended_ids = [r["meeting_id"] for r in attended_rows]
    meetings_attended: list[dict] = []
    if attended_ids:
        meetings_attended = (
            supabase_admin.table("meetings")
            .select("*").in_("id", attended_ids)
            .order("created_at", desc=True).limit(5).execute()
        ).data
    seen_meeting_ids: set[str] = set()
    for m in meetings_owned + meetings_attended:
        if m["id"] in seen_meeting_ids:
            continue
        seen_meeting_ids.add(m["id"])
        proj = proj_map.get(m.get("project_id"), "회의")
        meeting_notifs.append(NotificationResponse(
            id=f"meeting-{m['id']}", type="meeting", title="회의록이 생성됐어요",
            body=f"'{m['title']}' 회의록이 정리됐습니다.",
            project=proj, time=_relative_time(m["created_at"]), read=False,
        ))

    # 3) 프로젝트 초대 알림 (pending 상태인 초대만)
    invite_notifs: list[NotificationResponse] = []
    pending_invites = (
        supabase_admin.table("project_members")
        .select("id, project_id, created_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    ).data
    for inv in pending_invites:
        p_rows = supabase_admin.table("projects").select("name").eq("id", inv["project_id"]).limit(1).execute().data
        proj_name = p_rows[0]["name"] if p_rows else "프로젝트"
        invite_notifs.append(NotificationResponse(
            id=f"invite-{inv['id']}",
            type="report",
            title="프로젝트 초대가 왔어요",
            body=f"'{proj_name}' 프로젝트에 초대됐습니다. 수락하면 팀원이 돼요.",
            project=proj_name,
            time=_relative_time(inv["created_at"]),
            read=False,
        ))

    # 4) 받은 친구 요청 (pending)
    friend_notifs: list[NotificationResponse] = []
    reqs = (
        supabase_admin.table("friendships")
        .select("id, requester_id, created_at")
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    ).data
    req_ids = [r["requester_id"] for r in reqs]
    name_map: dict[str, str] = {}
    if req_ids:
        profs = (
            supabase_admin.table("profiles")
            .select("id, username, first_name, last_name")
            .in_("id", req_ids).execute()
        ).data
        for p in profs:
            full = f"{p.get('last_name') or ''}{p.get('first_name') or ''}".strip()
            name_map[p["id"]] = full or p.get("username") or "사용자"
    for r in reqs:
        nm = name_map.get(r["requester_id"], "누군가")
        friend_notifs.append(NotificationResponse(
            id=f"friend-{r['id']}",
            type="mention",
            title="친구 요청이 왔어요",
            body=f"{nm}님이 친구 요청을 보냈어요. 친구 관리에서 수락할 수 있어요.",
            project="친구",
            time=_relative_time(r["created_at"]),
            read=False,
        ))

    all_notifs = friend_notifs + invite_notifs + [n for _, n in todo_notifs] + meeting_notifs
    # 읽은 알림은 제외
    return [n for n in all_notifs if n.id not in read_ids]
