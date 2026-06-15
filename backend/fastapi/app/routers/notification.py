from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.schemas.notification import NotificationResponse
from app.routers.auth import bearer_token
from app.core.supabase import supabase_admin
from supabase_auth.errors import AuthApiError
from fastapi import HTTPException, status
import app.services.notification as notification_svc

router = APIRouter(tags=["notifications"])


class ReadBody(BaseModel):
    notification_id: str


class PushTokenBody(BaseModel):
    token: str


@router.get("/notifications", response_model=list[NotificationResponse])
def list_notifications(token: str = Depends(bearer_token)):
    return notification_svc.list_notifications(token)


@router.post("/notifications/read", status_code=204)
def mark_read(body: ReadBody, token: str = Depends(bearer_token)):
    notification_svc.mark_read(body.notification_id, token)


@router.post("/users/push-token", status_code=204)
def register_push_token(body: PushTokenBody, token: str = Depends(bearer_token)):
    """기기 FCM 푸시 토큰을 저장."""
    try:
        resp = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    user_id = resp.user.id

    import logging
    _log = logging.getLogger("moa.push")
    _log.info("push-token 등록 요청 user=%s token_prefix=%s", user_id, body.token[:20] if body.token else "EMPTY")

    # upsert: 같은 유저의 토큰은 덮어쓰기
    supabase_admin.table("push_tokens").upsert(
        {"user_id": user_id, "token": body.token},
        on_conflict="user_id",
    ).execute()
    _log.info("push-token 저장 완료 user=%s", user_id)
