from fastapi import APIRouter, Depends
from app.schemas.project import MemberCreate, MemberResponse
from app.schemas.member import MemberUpdate
from app.routers.auth import bearer_token
import app.services.member as member_svc

router = APIRouter(tags=["members"])


@router.get("/projects/{project_id}/members", response_model=list[MemberResponse])
def list_members(project_id: str, token: str = Depends(bearer_token)):
    return member_svc.list_members(project_id, token)


@router.post("/projects/{project_id}/members", response_model=MemberResponse, status_code=201)
def add_member(project_id: str, req: MemberCreate, token: str = Depends(bearer_token)):
    return member_svc.add_member(project_id, req, token)


@router.patch("/members/{member_id}", response_model=MemberResponse)
def update_member(member_id: str, req: MemberUpdate, token: str = Depends(bearer_token)):
    return member_svc.update_member(member_id, req, token)


@router.delete("/members/{member_id}", status_code=204)
def delete_member(member_id: str, token: str = Depends(bearer_token)):
    member_svc.delete_member(member_id, token)
