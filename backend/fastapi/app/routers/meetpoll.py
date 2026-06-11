from fastapi import APIRouter, Depends
from app.schemas.meetpoll import (
    MeetPollCreate, MeetPollResponse, MeetPollDetail, AvailabilityBody,
)
from app.routers.auth import bearer_token
import app.services.meetpoll as svc

router = APIRouter(tags=["meetpolls"])


@router.get("/projects/{project_id}/meet-polls", response_model=list[MeetPollResponse])
def list_polls(project_id: str, token: str = Depends(bearer_token)):
    return svc.list_polls(project_id, token)


@router.post("/projects/{project_id}/meet-polls", response_model=MeetPollResponse, status_code=201)
def create_poll(project_id: str, req: MeetPollCreate, token: str = Depends(bearer_token)):
    return svc.create_poll(project_id, req, token)


@router.get("/meet-polls/{poll_id}", response_model=MeetPollDetail)
def get_poll(poll_id: str, token: str = Depends(bearer_token)):
    return svc.get_poll(poll_id, token)


@router.post("/meet-polls/{poll_id}/availability", response_model=MeetPollDetail)
def set_availability(poll_id: str, req: AvailabilityBody, token: str = Depends(bearer_token)):
    return svc.set_availability(poll_id, req.slots, token)


@router.delete("/meet-polls/{poll_id}", status_code=204)
def delete_poll(poll_id: str, token: str = Depends(bearer_token)):
    svc.delete_poll(poll_id, token)
