from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.supabase import supabase_admin
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse


def _get_user(token: str):
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not resp.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return resp.user


def _get_member_ids(row: dict) -> list[str]:
    """assignee_member_ids 배열 우선, 없으면 기존 단일 필드에서 호환."""
    ids = row.get("assignee_member_ids") or []
    if not ids and row.get("assignee_member_id"):
        ids = [row["assignee_member_id"]]
    return [i for i in ids if i]


def _member_names(member_ids: list[str]) -> list[str]:
    if not member_ids:
        return []
    ms = (
        supabase_admin.table("project_members")
        .select("id, name").in_("id", member_ids).execute()
    ).data
    name_map = {m["id"]: m["name"] for m in ms}
    return [name_map[i] for i in member_ids if i in name_map]


def _build(row: dict, project_name: str | None = None) -> TodoResponse:
    member_ids = _get_member_ids(row)
    return TodoResponse(
        id=row["id"],
        title=row["title"],
        description=row.get("description"),
        project_id=row.get("project_id"),
        project_name=project_name,
        assignee_member_ids=member_ids,
        assignee_names=_member_names(member_ids),
        done=row["done"],
        due_date=row.get("due_date"),
        start_date=row.get("start_date"),
        difficulty=row.get("difficulty", 2),
    )


def _proj_map(rows: list[dict]) -> dict[str, str]:
    proj_ids = {r["project_id"] for r in rows if r.get("project_id")}
    if not proj_ids:
        return {}
    projs = (
        supabase_admin.table("projects")
        .select("id, name")
        .in_("id", list(proj_ids))
        .execute()
    ).data
    return {p["id"]: p["name"] for p in projs}


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


def list_todos(token: str) -> list[TodoResponse]:
    user = _get_user(token)
    own = (
        supabase_admin.table("todos")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    ).data

    owned_pj = (
        supabase_admin.table("projects").select("id").eq("owner_id", user.id).execute()
    ).data
    member_pj = (
        supabase_admin.table("project_members").select("project_id")
        .eq("user_id", user.id).eq("status", "accepted").execute()
    ).data
    pj_ids = {p["id"] for p in owned_pj} | {m["project_id"] for m in member_pj if m.get("project_id")}

    rows_by_id = {r["id"]: r for r in own}
    if pj_ids:
        proj_todos = (
            supabase_admin.table("todos").select("*")
            .in_("project_id", list(pj_ids))
            .order("created_at", desc=True)
            .execute()
        ).data
        for r in proj_todos:
            rows_by_id[r["id"]] = r

    rows = list(rows_by_id.values())
    pm = _proj_map(rows)
    return [_build(r, pm.get(r.get("project_id", ""))) for r in rows]


def list_project_todos(project_id: str, token: str) -> list[TodoResponse]:
    user = _get_user(token)
    if not _has_project_access(project_id, user.id):
        return []
    rows = (
        supabase_admin.table("todos")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    ).data
    projs = (
        supabase_admin.table("projects")
        .select("id, name")
        .eq("id", project_id)
        .limit(1)
        .execute()
    ).data
    proj_name = projs[0]["name"] if projs else None
    return [_build(r, proj_name) for r in rows]


def create_todo(req: TodoCreate, token: str) -> TodoResponse:
    user = _get_user(token)
    payload: dict = {
        "owner_id": user.id,
        "title": req.title,
        "done": False,
        "difficulty": req.difficulty,
        "assignee_member_ids": req.assignee_member_ids,
    }
    if req.description is not None:
        payload["description"] = req.description
    if req.project_id is not None:
        payload["project_id"] = req.project_id
    if req.due_date is not None:
        payload["due_date"] = req.due_date
    if req.start_date is not None:
        payload["start_date"] = req.start_date

    row = (
        supabase_admin.table("todos").insert(payload).execute()
    ).data[0]

    proj_name = None
    if row.get("project_id"):
        projs = (
            supabase_admin.table("projects")
            .select("id, name")
            .eq("id", row["project_id"])
            .limit(1)
            .execute()
        ).data
        proj_name = projs[0]["name"] if projs else None

    # 담당자들에게 푸시 (본인 제외)
    member_ids = _get_member_ids(row)
    if member_ids:
        mems = (
            supabase_admin.table("project_members").select("user_id")
            .in_("id", member_ids).execute()
        ).data
        from app.services import push
        for m in mems:
            uid = m.get("user_id")
            if uid and uid != user.id:
                try:
                    push.notify_user(uid, "새 할 일", f"'{req.title}' 담당자로 지정됐어요")
                except Exception:
                    pass

    return _build(row, proj_name)


def _get_editable_todo(todo_id: str, user_id: str) -> dict:
    rows = (
        supabase_admin.table("todos").select("*").eq("id", todo_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="할 일을 찾을 수 없습니다.")
    row = rows[0]
    if row.get("owner_id") != user_id:
        if not (row.get("project_id") and _has_project_access(row["project_id"], user_id)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")
    return row


def update_todo(todo_id: str, req: TodoUpdate, token: str) -> TodoResponse:
    user = _get_user(token)
    _get_editable_todo(todo_id, user.id)

    patch: dict = {}
    if req.title is not None:
        patch["title"] = req.title
    if req.description is not None:
        patch["description"] = req.description
    if req.assignee_member_ids is not None:
        patch["assignee_member_ids"] = req.assignee_member_ids
    if req.due_date is not None:
        patch["due_date"] = req.due_date
    if req.start_date is not None:
        patch["start_date"] = req.start_date
    if req.done is not None:
        patch["done"] = req.done
    if req.difficulty is not None:
        patch["difficulty"] = req.difficulty

    if patch:
        supabase_admin.table("todos").update(patch).eq("id", todo_id).execute()

    row = (
        supabase_admin.table("todos").select("*").eq("id", todo_id).limit(1).execute()
    ).data[0]
    proj_name = None
    if row.get("project_id"):
        projs = (
            supabase_admin.table("projects")
            .select("id, name")
            .eq("id", row["project_id"])
            .limit(1)
            .execute()
        ).data
        proj_name = projs[0]["name"] if projs else None
    return _build(row, proj_name)


def toggle_done(todo_id: str, token: str) -> TodoResponse:
    user = _get_user(token)
    rows = (
        supabase_admin.table("todos").select("*").eq("id", todo_id).limit(1).execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="할 일을 찾을 수 없습니다.")
    row = rows[0]
    if row.get("owner_id") != user.id:
        if not (row.get("project_id") and _has_project_access(row["project_id"], user.id)):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")
    supabase_admin.table("todos").update({"done": not row["done"]}).eq("id", todo_id).execute()
    updated = (
        supabase_admin.table("todos").select("*").eq("id", todo_id).limit(1).execute()
    ).data[0]
    proj_name = None
    if updated.get("project_id"):
        projs = (
            supabase_admin.table("projects")
            .select("id, name")
            .eq("id", updated["project_id"])
            .limit(1)
            .execute()
        ).data
        proj_name = projs[0]["name"] if projs else None
    return _build(updated, proj_name)


def delete_todo(todo_id: str, token: str) -> None:
    user = _get_user(token)
    _get_editable_todo(todo_id, user.id)
    supabase_admin.table("todos").delete().eq("id", todo_id).execute()
