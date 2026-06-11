from typing import Optional
from pydantic import BaseModel, Field


class ParticipantCreate(BaseModel):
    name: str
    speak_time_seconds: int = 0
    member_id: Optional[str] = None


class ParticipantResponse(BaseModel):
    id: str
    name: str
    speak_time_seconds: int
    member_id: Optional[str]
    speaker_label: Optional[str] = None


class MeetingCreate(BaseModel):
    title: str = Field(..., max_length=100)
    project_id: Optional[str] = None
    duration_seconds: int = 0
    summary: list[str] = []
    participants: list[ParticipantCreate] = []


class SpeakerMapping(BaseModel):
    speaker: str
    member_id: Optional[str] = None


class SpeakerMappingRequest(BaseModel):
    mappings: list[SpeakerMapping] = []


# ── QR 출석 / 종료 ─────────────────────────────────────────

class StartMeetingBody(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None


class AttendanceResponse(BaseModel):
    user_id: str
    member_id: Optional[str] = None
    name: str
    joined_at: Optional[str] = None      # null이면 불참
    late_seconds: int = 0
    reason: Optional[str] = None


class AbsenteeResponse(BaseModel):
    member_id: Optional[str] = None
    user_id: Optional[str] = None
    name: str
    reason: Optional[str] = None


class AttendanceList(BaseModel):
    attendees: list[AttendanceResponse] = []
    absentees: list[AbsenteeResponse] = []


class ReasonEntry(BaseModel):
    user_id: Optional[str] = None
    member_id: Optional[str] = None
    reason: str = ""


class FinalizeBody(BaseModel):
    duration_seconds: int = 0
    reasons: list[ReasonEntry] = []


class ActionItem(BaseModel):
    title: str
    date: Optional[str] = None           # "YYYY-MM-DD" or null
    added: bool = False


class MeetingResponse(BaseModel):
    id: str
    title: str
    project_id: Optional[str]
    project_name: Optional[str]
    duration_seconds: int
    summary: list[str]
    transcript: Optional[str]
    keywords: list[str] = []
    speaker_stats: dict[str, float] = {}
    speaker_samples: dict[str, str] = {}
    participants: list[ParticipantResponse]
    started_at: Optional[str] = None
    attendance: list[AttendanceResponse] = []
    absentees: list[AbsenteeResponse] = []
    action_items: list[ActionItem] = []
    created_at: str
