from fastapi import APIRouter, Depends, UploadFile, File
from app.schemas.chat import (
    ChatRoomResponse,
    MessageResponse,
    RoomMemberResponse,
    DirectRoomBody,
    MessageBody,
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
    return chat_svc.send_file_message(room_id, data, file.filename or "file", file.content_type, token)


@router.post("/rooms/{room_id}/read", status_code=204)
def mark_as_read(room_id: str, token: str = Depends(bearer_token)):
    chat_svc.mark_as_read(room_id, token)
