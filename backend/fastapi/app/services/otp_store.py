"""
인메모리 OTP / 리셋토큰 저장소.

- OTP: 이메일 → 6자리 숫자 코드, 10분 유효
- ResetToken: UUID 문자열 → user_id, 30분 유효
"""

import random
import secrets
from datetime import datetime, timedelta, timezone

# email -> {"otp": str, "expires_at": datetime}
_otp_store: dict[str, dict] = {}

# reset_token -> {"user_id": str, "expires_at": datetime}
_reset_token_store: dict[str, dict] = {}

OTP_TTL_MINUTES = 10
RESET_TOKEN_TTL_MINUTES = 30


# ── OTP ──────────────────────────────────────────────────

def generate_otp(email: str) -> str:
    """6자리 OTP를 생성·저장하고 반환."""
    otp = f"{random.randint(0, 999999):06d}"
    _otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    }
    return otp


def verify_otp(email: str, otp: str) -> bool:
    """OTP가 유효하면 True, 소비(삭제)한다."""
    entry = _otp_store.get(email)
    if not entry:
        return False
    if datetime.now(timezone.utc) > entry["expires_at"]:
        _otp_store.pop(email, None)
        return False
    if entry["otp"] != otp:
        return False
    _otp_store.pop(email, None)
    return True


# ── Reset Token ───────────────────────────────────────────

def create_reset_token(user_id: str) -> str:
    """UUID 기반 리셋 토큰을 생성·저장하고 반환."""
    token = secrets.token_urlsafe(32)
    _reset_token_store[token] = {
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
    }
    return token


def consume_reset_token(token: str) -> str | None:
    """토큰이 유효하면 user_id 반환 후 삭제. 아니면 None."""
    entry = _reset_token_store.get(token)
    if not entry:
        return None
    if datetime.now(timezone.utc) > entry["expires_at"]:
        _reset_token_store.pop(token, None)
        return None
    _reset_token_store.pop(token, None)
    return entry["user_id"]
