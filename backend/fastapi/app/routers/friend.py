from fastapi import APIRouter, Depends, Query
from app.schemas.friend import (
    FriendResponse,
    FriendRequestResponse,
    UserSearchResponse,
    FriendRequestBody,
)
from app.routers.auth import bearer_token
import app.services.friend as friend_svc

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("", response_model=list[FriendResponse])
def list_friends(token: str = Depends(bearer_token)):
    return friend_svc.list_friends(token)


@router.get("/requests", response_model=list[FriendRequestResponse])
def list_requests(token: str = Depends(bearer_token)):
    return friend_svc.list_requests(token)


@router.get("/search", response_model=UserSearchResponse)
def search_user(username: str = Query(...), token: str = Depends(bearer_token)):
    return friend_svc.search_user(username, token)


@router.post("/request", response_model=FriendRequestResponse, status_code=201)
def send_request(req: FriendRequestBody, token: str = Depends(bearer_token)):
    return friend_svc.send_request(req, token)


@router.post("/{friendship_id}/accept", status_code=204)
def accept_request(friendship_id: str, token: str = Depends(bearer_token)):
    friend_svc.accept_request(friendship_id, token)


@router.delete("/{friendship_id}", status_code=204)
def remove_friendship(friendship_id: str, token: str = Depends(bearer_token)):
    friend_svc.remove_friendship(friendship_id, token)
