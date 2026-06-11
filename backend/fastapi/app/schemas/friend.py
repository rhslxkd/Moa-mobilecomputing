from typing import Optional
from pydantic import BaseModel


class FriendResponse(BaseModel):
    friendship_id: str
    user_id: str        # 상대방 user id
    username: str
    name: str


class FriendRequestResponse(BaseModel):
    friendship_id: str
    user_id: str        # 요청 보낸 사람 user id
    username: str
    name: str


class UserSearchResponse(BaseModel):
    user_id: str
    username: str
    name: str


class FriendRequestBody(BaseModel):
    username: Optional[str] = None
    user_id: Optional[str] = None
