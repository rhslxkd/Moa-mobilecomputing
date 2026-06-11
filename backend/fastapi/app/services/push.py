import json
import firebase_admin
from firebase_admin import credentials, messaging
from app.core.config import settings

# 앱 시작 시 1회만 초기화
_initialized = False

def _init():
    global _initialized
    if _initialized:
        return
    cred = None
    # 배포(Railway): 환경변수 JSON 내용 우선 / 로컬: 파일 경로
    if settings.firebase_credentials_json:
        try:
            cred = credentials.Certificate(json.loads(settings.firebase_credentials_json))
        except Exception:
            cred = None
    elif settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
    if cred is None:
        return
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


def send_to_user(user_id: str, title: str, body: str) -> None:
    """유저 id로 등록된 푸시 토큰을 찾아 전송. 실패해도 무시."""
    try:
        from app.core.supabase import supabase_admin
        rows = (
            supabase_admin.table("push_tokens").select("token")
            .eq("user_id", user_id).execute()
        ).data
        for r in rows:
            if r.get("token"):
                send_push(r["token"], title, body)
    except Exception:
        pass
