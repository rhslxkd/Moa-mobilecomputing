import json
import logging
import firebase_admin
from firebase_admin import credentials, messaging
from app.core.config import settings

logger = logging.getLogger("moa.push")

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
        except Exception as e:
            logger.warning("FIREBASE_CREDENTIALS_JSON 파싱 실패: %s", e)
            cred = None
    elif settings.firebase_credentials_path:
        cred = credentials.Certificate(settings.firebase_credentials_path)
    if cred is None:
        logger.warning("Firebase 자격증명 없음 — 푸시 비활성화 (FIREBASE_CREDENTIALS_JSON/PATH 확인)")
        return
    firebase_admin.initialize_app(cred)
    _initialized = True
    logger.info("Firebase 초기화 완료 — 푸시 활성화")


def send_push(token: str, title: str, body: str) -> None:
    """FCM 토큰으로 푸시 알림 전송. 실패해도 예외 무시."""
    try:
        _init()
        if not _initialized:
            logger.warning("Firebase 미초기화 — 푸시 미발송 (title=%s)", title)
            return
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=token,
            android=messaging.AndroidConfig(priority="high"),
        )
        msg_id = messaging.send(message)
        logger.info("FCM 전송 성공 (title=%s, id=%s)", title, msg_id)
    except Exception as e:
        logger.warning("FCM 전송 실패 (title=%s): %s", title, e)


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
        if not rows:
            logger.info("user %s 등록된 푸시 토큰 없음 — 미발송", user_id)
            return
        for r in rows:
            if r.get("token"):
                send_push(r["token"], title, body)
    except Exception as e:
        logger.warning("푸시 토큰 조회/발송 실패 (user=%s): %s", user_id, e)
