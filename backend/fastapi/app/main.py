from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth
from app.routers import project
from app.routers import todo
from app.routers import meeting
from app.routers import member
from app.routers import report
from app.routers import notification
from app.routers import friend
from app.routers import chat
from app.routers import invitation
from app.routers import drive
from app.routers import meetpoll

import logging
from app.core.config import settings

logger = logging.getLogger("moa.startup")


def _warn_empty_env() -> None:
    """기동 시 비어 있는 중요 환경변수를 경고 로그로 표시 (동작은 그대로, 누락만 알림)."""
    checks = {
        "RESEND_API_KEY": settings.resend_api_key,   # 비면 이메일/OTP 무음 실패
        "DAGLO_API_KEY": settings.daglo_api_key,     # 비면 회의 STT 무음 실패
        "FIREBASE 자격증명": settings.firebase_credentials_path or settings.firebase_credentials_json,  # 비면 푸시 비활성
    }
    missing = [name for name, val in checks.items() if not val]
    if missing:
        logger.warning("환경변수 누락 — 관련 기능 비활성화: %s", ", ".join(missing))


_warn_empty_env()

app = FastAPI(title="MOA API", version="0.1.0")

# 웹 프론트엔드(frontend-web)에서 브라우저로 API 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(project.router)
app.include_router(todo.router)
app.include_router(meeting.router)
app.include_router(member.router)
app.include_router(report.router)
app.include_router(notification.router)
app.include_router(friend.router)
app.include_router(chat.router)
app.include_router(invitation.router)
app.include_router(drive.router)
app.include_router(meetpoll.router)
