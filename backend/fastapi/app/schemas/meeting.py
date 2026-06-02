from typing import Optional
from pydantic import BaseModel, Field


class ParticipantCreate(BaseModel):
    name: str
    speak_time_seconds: int = 0


class ParticipantResponse(BaseModel):
    id: str
    name: str
    speak_time_seconds: int


class MeetingCreate(BaseModel):
    title: str = Field(..., max_length=100)
    project_id: Optional[str] = None
    duration_seconds: int = 0
    summary: list[str] = []
    participants: list[ParticipantCreate] = []


class MeetingResponse(BaseModel):
    id: str
    title: str
    project_id: Optional[str]
    project_name: Optional[str]
    duration_seconds: int
    summary: list[str]
    participants: list[ParticipantResponse]
    created_at: str
