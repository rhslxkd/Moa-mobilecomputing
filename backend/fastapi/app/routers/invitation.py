from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.routers.auth import bearer_token
from app.services.invitation import InvitationResponse, list_invitations, accept_invitation, decline_invitation

router = APIRouter(prefix="/invitations", tags=["invitations"])


class AcceptBody(BaseModel):
    roles: list[str]


@router.get("", response_model=list[InvitationResponse])
def get_invitations(token: str = Depends(bearer_token)):
    return list_invitations(token)


@router.post("/{member_id}/accept", status_code=204)
def accept(member_id: str, body: AcceptBody, token: str = Depends(bearer_token)):
    accept_invitation(member_id, body.roles, token)


@router.delete("/{member_id}/decline", status_code=204)
def decline(member_id: str, token: str = Depends(bearer_token)):
    decline_invitation(member_id, token)
