"""예약 푸시 발송 스케줄러.

scheduled_pushes 테이블을 30초마다 폴링하여, 발송 시각(notify_at)이 된
미발송(sent=false) 항목을 찾아 대상 유저들에게 FCM 푸시를 보낸다.
별도 인프라(cron) 없이 FastAPI 프로세스 안에서 백그라운드 스레드로 동작한다.
"""
import logging
import threading
import time
from datetime import datetime, timezone

logger = logging.getLogger("moa.scheduler")

_started = False
POLL_INTERVAL = 30  # 초


def _tick() -> None:
    from app.core.supabase import supabase_admin
    from app.services import push

    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        rows = (
            supabase_admin.table("scheduled_pushes")
            .select("*")
            .eq("sent", False)
            .lte("notify_at", now_iso)
            .execute()
        ).data
    except Exception as e:
        logger.warning("예약 푸시 조회 실패: %s", e)
        return

    for r in rows:
        title = r.get("title") or "알림"
        body = r.get("body") or ""
        user_ids = r.get("user_ids") or []
        try:
            for uid in user_ids:
                if uid:
                    push.send_to_user(uid, title, body)
            supabase_admin.table("scheduled_pushes").update(
                {"sent": True}
            ).eq("id", r["id"]).execute()
            logger.info("예약 푸시 발송 완료 (id=%s, 대상=%d명)", r["id"], len(user_ids))
        except Exception as e:
            logger.warning("예약 푸시 발송 실패 (id=%s): %s", r.get("id"), e)


def _loop() -> None:
    while True:
        try:
            _tick()
        except Exception as e:
            logger.warning("스케줄러 tick 오류: %s", e)
        time.sleep(POLL_INTERVAL)


def start() -> None:
    """앱 시작 시 1회 호출. 백그라운드 폴링 스레드를 띄운다."""
    global _started
    if _started:
        return
    _started = True
    threading.Thread(target=_loop, daemon=True).start()
    logger.info("예약 푸시 스케줄러 시작 (간격 %d초)", POLL_INTERVAL)
