from fastapi import APIRouter, Depends
from app.schemas.notification import NotificationResponse
from app.routers.auth import bearer_token
import app.services.notification as notification_svc

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(token: str = Depends(bearer_token)):
    return notification_svc.list_notifications(token)
