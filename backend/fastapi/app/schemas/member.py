from typing import Optional
from pydantic import BaseModel, Field

# project.py의 MemberCreate / MemberResponse 재사용
from app.schemas.project import MemberCreate, MemberResponse  # noqa: F401


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=10)
    roles: Optional[list[str]] = Field(None, min_length=1)
