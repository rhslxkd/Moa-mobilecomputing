from typing import Optional
from pydantic import BaseModel, Field


class MeetPollCreate(BaseModel):
    title: str = Field(..., max_length=100)
    dates: list[str] = Field(..., min_length=1)   # ["YYYY-MM-DD", ...]
    start_hour: int = 9
    end_hour: int = 22                            # exclusive (마지막 슬롯은 end_hour-1시)


class MeetPollResponse(BaseModel):
    id: str
    project_id: str
    title: str
    dates: list[str]
    start_hour: int
    end_hour: int
    created_at: str
    respondent_count: int = 0
    can_delete: bool = False


class RespondentResponse(BaseModel):
    user_id: str
    name: str
    slots: list[str]


class MeetPollDetail(MeetPollResponse):
    counts: dict[str, int] = {}        # slot -> 가능 인원수
    total_respondents: int = 0
    my_slots: list[str] = []
    best_slots: list[str] = []         # 전원 가능 슬롯
    respondents: list[RespondentResponse] = []


class AvailabilityBody(BaseModel):
    slots: list[str] = []              # ["YYYY-MM-DD H", ...]
