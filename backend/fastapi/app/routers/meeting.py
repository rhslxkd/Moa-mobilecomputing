from typing import Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File
from app.schemas.meeting import MeetingCreate, MeetingResponse, SpeakerMappingRequest
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
