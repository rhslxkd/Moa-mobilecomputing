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


def _build(row: dict, project_name: str | None = None) -> TodoResponse:
    return TodoResponse(
        id=row["id"],
        title=row["title"],
        description=row.get("description"),
        project_id=row.get("project_id"),
        project_name=project_name,
        assignee_member_id=row.get("assignee_member_id"),
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


def list_todos(token: str) -> list[TodoResponse]:
    user = _get_user(token)
    rows = (
        supabase_admin.table("todos")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    ).data
    pm = _proj_map(rows)
    return [_build(r, pm.get(r.get("project_id", ""))) for r in rows]


def list_project_todos(project_id: str, token: str) -> list[TodoResponse]:
    user = _get_user(token)
    rows = (
        supabase_admin.table("todos")
        .select("*")
        .eq("project_id", project_id)
        .eq("owner_id", user.id)
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
    }
    if req.description is not None:
        payload["description"] = req.description
    if req.project_id is not None:
        payload["project_id"] = req.project_id
    if req.assignee_member_id is not None:
        payload["assignee_member_id"] = req.assignee_member_id
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

    return _build(row, proj_name)


def _get_owned_todo(todo_id: str, user_id: str) -> dict:
    rows = (
        supabase_admin.table("todos")
        .select("*")
        .eq("id", todo_id)
        .eq("owner_id", user_id)
        .limit(1)
        .execute()
    ).data
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="할 일을 찾을 수 없습니다.")
    return rows[0]


def update_todo(todo_id: str, req: TodoUpdate, token: str) -> TodoResponse:
    user = _get_user(token)
    _get_owned_todo(todo_id, user.id)

    patch: dict = {}
    if req.title is not None:
        patch["title"] = req.title
    if req.description is not None:
        patch["description"] = req.description
    if req.assignee_member_id is not None:
        patch["assignee_member_id"] = req.assignee_member_id
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

    row = _get_owned_todo(todo_id, user.id)
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
    row = _get_owned_todo(todo_id, user.id)
    supabase_admin.table("todos").update({"done": not row["done"]}).eq("id", todo_id).execute()
    updated = _get_owned_todo(todo_id, user.id)
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
    _get_owned_todo(todo_id, user.id)
    supabase_admin.table("todos").delete().eq("id", todo_id).execute()
