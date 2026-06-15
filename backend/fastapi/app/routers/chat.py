from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from app.schemas.chat import (
    ChatRoomResponse,
    MessageResponse,
    RoomMemberResponse,
    DirectRoomBody,
    MessageBody,
    NoticeResponse,
    NoticeBody,
    PollResponse,
    PollBody,
    VoteBody,
)
from app.routers.auth import bearer_token
import app.services.chat as chat_svc

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/rooms", response_model=list[ChatRoomResponse])
def list_rooms(token: str = Depends(bearer_token)):
    return chat_svc.list_rooms(token)


@router.post("/rooms/direct", response_model=ChatRoomResponse)
def create_direct(req: DirectRoomBody, token: str = Depends(bearer_token)):
    return chat_svc.get_or_create_direct(req.friend_user_id, token)


@router.post("/rooms/project/{project_id}", response_model=ChatRoomResponse)
def open_project(project_id: str, token: str = Depends(bearer_token)):
    return chat_svc.get_or_create_project_room(project_id, token)


@router.get("/rooms/{room_id}/members", response_model=list[RoomMemberResponse])
def list_room_members(room_id: str, token: str = Depends(bearer_token)):
    return chat_svc.list_room_members(room_id, token)


@router.get("/rooms/{room_id}/messages", response_model=list[MessageResponse])
def list_messages(room_id: str, token: str = Depends(bearer_token)):
    return chat_svc.list_messages(room_id, token)


@router.post("/rooms/{room_id}/messages", response_model=MessageResponse, status_code=201)
def send_message(room_id: str, req: MessageBody, token: str = Depends(bearer_token)):
    return chat_svc.send_message(room_id, req.content, token)


@router.get("/rooms/{room_id}/read-status")
def get_read_status(room_id: str, token: str = Depends(bearer_token)):
    return chat_svc.get_read_status(room_id, token)


@router.post("/rooms/{room_id}/messages/file", response_model=MessageResponse, status_code=201)
async def send_file(
    room_id: str,
    file: UploadFile = File(...),
    token: str = Depends(bearer_token),
):
    data = await file.read()
    from app.routers.drive import _decode_filename
    return await run_in_threadpool(
        chat_svc.send_file_message, room_id, data, _decode_filename(file.filename), file.content_type, token,
    )


@router.post("/rooms/{room_id}/read", status_code=204)
def mark_as_read(room_id: str, token: str = Depends(bearer_token)):
    chat_svc.mark_as_read(room_id, token)


# ── 채팅방 설정 ─────────────────────────────────────────────

class RenameRoomBody(BaseModel):
    name: str = ""


@router.post("/rooms/{room_id}/rename", response_model=ChatRoomResponse)
def rename_room(room_id: str, body: RenameRoomBody, token: str = Depends(bearer_token)):
    return chat_svc.rename_room(room_id, body.name, token)


@router.post("/rooms/{room_id}/leave", status_code=204)
def leave_room(room_id: str, token: str = Depends(bearer_token)):
    chat_svc.leave_room(room_id, token)


# ── 공지 ───────────────────────────────────────────────────

@router.get("/rooms/{room_id}/notices", response_model=list[NoticeResponse])
def list_notices(room_id: str, token: str = Depends(bearer_token)):
    return chat_svc.list_notices(room_id, token)


@router.post("/rooms/{room_id}/notices", response_model=NoticeResponse, status_code=201)
def create_notice(room_id: str, req: NoticeBody, token: str = Depends(bearer_token)):
    return chat_svc.create_notice(room_id, req.content, token)


@router.delete("/notices/{notice_id}", status_code=204)
def delete_notice(notice_id: str, token: str = Depends(bearer_token)):
    chat_svc.delete_notice(notice_id, token)


# ── 투표 ───────────────────────────────────────────────────

@router.get("/rooms/{room_id}/polls", response_model=list[PollResponse])
def list_polls(room_id: str, token: str = Depends(bearer_token)):
    return chat_svc.list_polls(room_id, token)


@router.post("/rooms/{room_id}/polls", response_model=PollResponse, status_code=201)
def create_poll(room_id: str, req: PollBody, token: str = Depends(bearer_token)):
    return chat_svc.create_poll(room_id, req.question, req.options, token)


@router.post("/polls/{poll_id}/vote", response_model=PollResponse)
def vote_poll(poll_id: str, req: VoteBody, token: str = Depends(bearer_token)):
    return chat_svc.vote_poll(poll_id, req.option_index, token)


@router.delete("/polls/{poll_id}", status_code=204)
def delete_poll(poll_id: str, token: str = Depends(bearer_token)):
    chat_svc.delete_poll(poll_id, token)
