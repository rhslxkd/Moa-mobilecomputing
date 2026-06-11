from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File
from pydantic import BaseModel
from app.schemas.meeting import (
    MeetingCreate, MeetingResponse, SpeakerMappingRequest,
    StartMeetingBody, FinalizeBody, AttendanceList,
)
from app.routers.auth import bearer_token
import app.services.meeting as meeting_svc

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=list[MeetingResponse])
def list_meetings(
    project_id: Optional[str] = Query(None),
    token: str = Depends(bearer_token),
):
    return meeting_svc.list_meetings(project_id, token)


@router.post("", response_model=MeetingResponse, status_code=201)
def create_meeting(req: MeetingCreate, token: str = Depends(bearer_token)):
    return meeting_svc.create_meeting(req, token)


@router.post("/start", response_model=MeetingResponse, status_code=201)
def start_meeting(req: StartMeetingBody, token: str = Depends(bearer_token)):
    return meeting_svc.start_meeting(req.title, req.project_id, token)


@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str, token: str = Depends(bearer_token)):
    return meeting_svc.get_meeting(meeting_id, token)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: str, token: str = Depends(bearer_token)):
    meeting_svc.delete_meeting(meeting_id, token)


@router.post("/{meeting_id}/audio", response_model=MeetingResponse)
async def upload_audio(
    meeting_id: str,
    file: UploadFile = File(...),
    token: str = Depends(bearer_token),
):
    audio_bytes = await file.read()
    return meeting_svc.process_audio(meeting_id, audio_bytes, file.filename or "audio.m4a", token)


@router.post("/{meeting_id}/speaker-mapping", response_model=MeetingResponse)
def speaker_mapping(
    meeting_id: str,
    req: SpeakerMappingRequest,
    token: str = Depends(bearer_token),
):
    return meeting_svc.set_speaker_mapping(meeting_id, req.mappings, token)


@router.post("/{meeting_id}/attend")
def attend(meeting_id: str, token: str = Depends(bearer_token)):
    return meeting_svc.attend_meeting(meeting_id, token)


@router.get("/{meeting_id}/attendance", response_model=AttendanceList)
def attendance(meeting_id: str, token: str = Depends(bearer_token)):
    return meeting_svc.get_attendance(meeting_id, token)


@router.post("/{meeting_id}/finalize", response_model=MeetingResponse)
def finalize(meeting_id: str, req: FinalizeBody, token: str = Depends(bearer_token)):
    return meeting_svc.finalize_meeting(meeting_id, req.duration_seconds, req.reasons, token)


class AddActionItemBody(BaseModel):
    title: Optional[str] = None
    assignee_member_id: Optional[str] = None


@router.post("/{meeting_id}/action-items/{index}/add", response_model=MeetingResponse)
def add_action_item(
    meeting_id: str, index: int,
    body: AddActionItemBody = AddActionItemBody(),
    token: str = Depends(bearer_token),
):
    return meeting_svc.add_action_item_todo(
        meeting_id, index, token, body.title, body.assignee_member_id,
    )
