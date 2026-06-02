from typing import Optional
from pydantic import BaseModel, Field


class TodoCreate(BaseModel):
    title: str = Field(..., max_length=100)
    description: Optional[str] = None
    project_id: Optional[str] = None
    assignee_member_id: Optional[str] = None
    due_date: Optional[str] = None    # "YYYY-MM-DD"
    start_date: Optional[str] = None  # "YYYY-MM-DD"


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    assignee_member_id: Optional[str] = None
    due_date: Optional[str] = None
    start_date: Optional[str] = None
    done: Optional[bool] = None


class TodoResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    project_id: Optional[str]
    project_name: Optional[str]
    assignee_member_id: Optional[str]
    done: bool
    due_date: Optional[str]    # "YYYY-MM-DD"
    start_date: Optional[str]
