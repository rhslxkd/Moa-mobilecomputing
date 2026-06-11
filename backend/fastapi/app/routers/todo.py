from fastapi import APIRouter, Depends
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse
from app.routers.auth import bearer_token
import app.services.todo as todo_svc

router = APIRouter(prefix="/todos", tags=["todos"])


@router.get("", response_model=list[TodoResponse])
def list_todos(token: str = Depends(bearer_token)):
    return todo_svc.list_todos(token)


@router.get("/project/{project_id}", response_model=list[TodoResponse])
def list_project_todos(project_id: str, token: str = Depends(bearer_token)):
    return todo_svc.list_project_todos(project_id, token)


@router.post("", response_model=TodoResponse, status_code=201)
def create_todo(req: TodoCreate, token: str = Depends(bearer_token)):
    return todo_svc.create_todo(req, token)


@router.patch("/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: str, req: TodoUpdate, token: str = Depends(bearer_token)):
    return todo_svc.update_todo(todo_id, req, token)


@router.patch("/{todo_id}/done", response_model=TodoResponse)
def toggle_done(todo_id: str, token: str = Depends(bearer_token)):
    return todo_svc.toggle_done(todo_id, token)


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: str, token: str = Depends(bearer_token)):
    todo_svc.delete_todo(todo_id, token)
