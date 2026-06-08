from typing import Optional
from pydantic import BaseModel


class ChatRoomResponse(BaseModel):
    id: str
    type: str                    # 'project' | 'direct'
    name: str                    # direct=상대 이름 / project=프로젝트명
    project_id: Optional[str]
    member_count: int
    last_message: Optional[str]
    last_message_at: Optional[str]
    unread_count: int


class MessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    content: str
    created_at: str
    attachment_type: Optional[str] = None     # 'image' | 'file'
    attachment_name: Optional[str] = None
    attachment_url: Optional[str] = None       # signed URL
    attachment_mime: Optional[str] = None


class RoomMemberResponse(BaseModel):
    user_id: str
    name: str
    is_me: bool


class DirectRoomBody(BaseModel):
    friend_user_id: str


class MessageBody(BaseModel):
    content: str


# ── 공지 ───────────────────────────────────────────────────

class NoticeBody(BaseModel):
    content: str


class NoticeResponse(BaseModel):
    id: str
    room_id: str
    content: str
    author_name: str
    created_at: str


# ── 투표 ───────────────────────────────────────────────────

class PollBody(BaseModel):
    question: str
    options: list[str]


class VoteBody(BaseModel):
    option_index: int


class PollResponse(BaseModel):
    id: str
    room_id: str
    question: str
    options: list[str]
    counts: list[int]          # 옵션별 득표 수
    total_votes: int
    my_vote: Optional[int] = None
    author_name: str
    closed: bool
    created_at: str
