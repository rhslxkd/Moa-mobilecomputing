import firebase_admin
from firebase_admin import credentials, messaging
from app.core.config import settings

# 앱 시작 시 1회만 초기화
_initialized = False

def _init():
    global _initialized
    if _initialized or not settings.firebase_credentials_path:
        return
    cred = credentials.Certificate(settings.firebase_credentials_path)
    firebase_admin.initialize_app(cred)
    _initialized = True


def send_push(token: str, title: str, body: str) -> None:
    """FCM 토큰으로 푸시 알림 전송. 실패해도 예외 무시."""
    try:
        _init()
        if not _initialized:
            return
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=token,
            android=messaging.AndroidConfig(priority="high"),
        )
        messaging.send(message)
    except Exception:
        pass


def send_push_multi(tokens: list[str], title: str, body: str) -> None:
    """여러 기기에 동시 전송."""
    for token in tokens:
        send_push(token, title, body)
