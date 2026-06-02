from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.meeting import MeetingCreate, MeetingResponse
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
