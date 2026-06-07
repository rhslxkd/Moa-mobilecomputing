from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.schemas.notification import NotificationResponse
from app.routers.auth import bearer_token
import app.services.notification as notification_svc

router = APIRouter(prefix="/notifications", tags=["notifications"])


class ReadBody(BaseModel):
    notification_id: str


@router.get("", response_model=list[NotificationResponse])
def list_notifications(token: str = Depends(bearer_token)):
    return notification_svc.list_notifications(token)


@router.post("/read", status_code=204)
def mark_read(body: ReadBody, token: str = Depends(bearer_token)):
    notification_svc.mark_read(body.notification_id, token)
