import re
from datetime import date
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class ProjectStatus(str, Enum):
    active = "active"
    upcoming = "upcoming"
    completed = "completed"


def _parse_dot_date(s: str) -> date:
    if not re.match(r"^\d{4}\.\d{2}\.\d{2}$", s):
        raise ValueError("날짜 형식은 YYYY.MM.DD여야 합니다.")
    try:
        y, m, d = s.split(".")
        return date(int(y), int(m), int(d))
    except Exception:
        raise ValueError("유효하지 않은 날짜입니다.")


# ── 팀원 ──────────────────────────────────────────────────

class MemberCreate(BaseModel):
    id: Optional[str] = None        # 수정 시 기존 멤버 id
    user_id: Optional[str] = None   # 실제 auth.users id (친구 연결 시)
    name: str = Field(..., max_length=10)
    roles: list[str] = Field(..., min_length=1)


class MemberResponse(BaseModel):
    id: str
    user_id: Optional[str]
    name: str
    roles: list[str]


# ── 프로젝트 생성 ──────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=30)
    emoji: str
    color: str
    status: ProjectStatus = ProjectStatus.upcoming
    start_date: str
    end_date: str
    members: list[MemberCreate] = Field(..., min_length=1)

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        _parse_dot_date(v)
        return v


# ── 프로젝트 수정 (PATCH — 부분 업데이트) ──────────────────

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=30)
    emoji: Optional[str] = None
    color: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    members: Optional[list[MemberCreate]] = Field(None, min_length=1)

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            _parse_dot_date(v)
        return v


# ── 응답 ───────────────────────────────────────────────────

class ProjectResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    emoji: str
    color: str
    status: str
    start_date: str   # "YYYY.MM.DD"
    end_date: str     # "YYYY.MM.DD"
    days_left: int
    member_count: int
    members: list[MemberResponse]
    has_chat_alert: bool
    has_todo_alert: bool
