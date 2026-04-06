import resend
from fastapi import HTTPException, status
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.core.supabase import supabase, supabase_admin
from app.schemas.auth import (
    SignUpRequest,
    VerifyEmailRequest,
    LoginRequest,
    SetupNameRequest,
    SetupAffiliationRequest,
    FindIdRequest,
    FindIdVerifyRequest,
    FindPasswordRequest,
    FindPasswordVerifyRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services import otp_store

resend.api_key = settings.resend_api_key


# ── 내부 헬퍼 ─────────────────────────────────────────────

def _get_user_from_token(token: str):
    """JWT로 Supabase 유저 조회. 유효하지 않으면 401."""
    try:
        response = supabase_admin.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    if not response.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")
    return response.user


def _check_username_available(username: str) -> None:
    """이미 사용 중인 username이면 409."""
    result = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("username", username)
        .limit(1)
        .execute()
    )
    if result.data:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디입니다.")


# ── 회원가입 ──────────────────────────────────────────────

def sign_up(req: SignUpRequest) -> None:
    """계정 생성 + 이메일 인증 OTP 발송."""
    _check_username_available(req.username)

    # 미인증 상태로 유저 생성. username·약관 동의는 user_metadata에 보관했다가
    # verify_signup_email() 에서 profiles 삽입 시 사용.
    try:
        create_response = supabase_admin.auth.admin.create_user(
            {
                "email": req.email,
                "password": req.password,
                "email_confirm": False,
                "user_metadata": {
                    "username": req.username,
                    "terms_agreed": req.terms_agreed,
                    "privacy_agreed": req.privacy_agreed,
                    "marketing_agreed": req.marketing_agreed,
                },
            }
        )
    except AuthApiError as e:
        msg = str(e).lower()
        if "already registered" in msg or "already been registered" in msg:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="이미 사용 중인 이메일입니다.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = create_response.user
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="회원가입에 실패했습니다.")

    # 가입 확인 OTP 발송 — 실패 시 생성된 유저 롤백
    try:
        supabase.auth.resend({"type": "signup", "email": req.email})
    except Exception as e:
        supabase_admin.auth.admin.delete_user(user.id)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


def verify_signup_email(req: VerifyEmailRequest) -> TokenResponse:
    """이메일 OTP 검증 → profiles 삽입 → 토큰 반환."""
    try:
        response = supabase.auth.verify_otp(
            {"email": req.email, "token": req.token, "type": "signup"}
        )
    except AuthApiError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증번호가 올바르지 않습니다.")

    user = response.user
    session = response.session
    if not user or not session:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증에 실패했습니다.")

    # user_metadata에서 가입 정보 추출
    meta = user.user_metadata or {}
    supabase_admin.table("profiles").insert(
        {
            "id": user.id,
            "username": meta.get("username", ""),
            "first_name": "",
            "last_name": "",
            "terms_agreed": meta.get("terms_agreed", False),
            "privacy_agreed": meta.get("privacy_agreed", False),
            "marketing_agreed": meta.get("marketing_agreed", False),
            "onboarding_completed": False,
        }
    ).execute()

    return TokenResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
    )


# ── 로그인 ────────────────────────────────────────────────

def login(req: LoginRequest) -> TokenResponse:
    # username → email 조회
    result = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("username", req.username)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    user_id = result.data[0]["id"]

    # auth.users에서 email 조회 (service role 필요)
    auth_user = supabase_admin.auth.admin.get_user_by_id(user_id)
    if not auth_user.user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    email = auth_user.user.email

    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": email, "password": req.password}
        )
    except AuthApiError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    session = auth_response.session
    return TokenResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
    )


# ── 이름 설정 ──────────────────────────────────────────────

def setup_name(req: SetupNameRequest, token: str) -> None:
    user = _get_user_from_token(token)

    supabase_admin.table("profiles").update(
        {"last_name": req.last_name, "first_name": req.first_name}
    ).eq("id", user.id).execute()


# ── 소속 설정 ──────────────────────────────────────────────

def setup_affiliation(req: SetupAffiliationRequest, token: str) -> None:
    user = _get_user_from_token(token)

    supabase_admin.table("user_affiliations").insert(
        {
            "user_id": user.id,
            "affiliation_type": req.affiliation_type.value,
            "organization_name": req.organization_name,
            "department": req.department,
            "student_id": req.student_id,
        }
    ).execute()

    supabase_admin.table("profiles").update(
        {"onboarding_completed": True}
    ).eq("id", user.id).execute()


# ── 아이디 찾기 ────────────────────────────────────────────

def find_id_send_otp(req: FindIdRequest) -> None:
    """이메일로 OTP 발송. 가입된 이메일이 아니면 404."""
    # 가입 여부 확인 (profiles 테이블 기준으로는 email이 없으므로 admin API 사용)
    users = supabase_admin.auth.admin.list_users()
    email_exists = any(u.email == req.email for u in users)
    if not email_exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="가입되지 않은 이메일입니다.")

    try:
        supabase.auth.sign_in_with_otp(
            {"email": req.email, "options": {"should_create_user": False}}
        )
    except AuthApiError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


def find_id_verify_otp(req: FindIdVerifyRequest) -> str:
    """OTP 검증 후 username 반환."""
    try:
        response = supabase.auth.verify_otp(
            {"email": req.email, "token": req.token, "type": "email"}
        )
    except AuthApiError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증번호가 올바르지 않습니다.")

    user = response.user
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증에 실패했습니다.")

    result = (
        supabase_admin.table("profiles")
        .select("username")
        .eq("id", user.id)
        .limit(1)
        .execute()
    )
    return result.data[0]["username"]


# ── 비밀번호 찾기 ──────────────────────────────────────────

def find_password_send_otp(req: FindPasswordRequest) -> None:
    """이메일 + username 일치 확인 후 6자리 OTP를 Resend로 발송."""
    result = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("username", req.username)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="아이디 또는 이메일이 올바르지 않습니다.")

    user_id = result.data[0]["id"]
    auth_user = supabase_admin.auth.admin.get_user_by_id(user_id)

    if not auth_user.user or auth_user.user.email != req.email:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="아이디 또는 이메일이 올바르지 않습니다.")

    otp = otp_store.generate_otp(req.email)

    try:
        resend.Emails.send({
            "from": settings.resend_from_email,
            "to": req.email,
            "subject": "[MOA] 비밀번호 재설정 인증번호",
            "html": (
                f"<p>안녕하세요, MOA입니다.</p>"
                f"<p>비밀번호 재설정 인증번호: <strong>{otp}</strong></p>"
                f"<p>인증번호는 10분간 유효합니다.</p>"
            ),
        })
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"이메일 발송에 실패했습니다: {e}")


def find_password_verify_otp(req: FindPasswordVerifyRequest) -> TokenResponse:
    """6자리 OTP 검증 후 비밀번호 재설정용 토큰 반환."""
    if not otp_store.verify_otp(req.email, req.token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증번호가 올바르지 않거나 만료되었습니다.")

    # 이메일로 user_id 조회
    users = supabase_admin.auth.admin.list_users()
    user = next((u for u in users if u.email == req.email), None)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    reset_token = otp_store.create_reset_token(user.id)
    return TokenResponse(access_token=reset_token, refresh_token="")


# ── 비밀번호 재설정 ────────────────────────────────────────

def reset_password(req: ResetPasswordRequest, token: str) -> None:
    """find-password/verify 에서 받은 리셋 토큰으로 비밀번호 변경."""
    user_id = otp_store.consume_reset_token(token)
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="유효하지 않거나 만료된 토큰입니다.")

    try:
        supabase_admin.auth.admin.update_user_by_id(
            user_id, {"password": req.new_password}
        )
    except AuthApiError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))
