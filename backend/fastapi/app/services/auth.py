import requests
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

# 회원가입 검증 대기: email -> 비밀번호(검증 후 자동 로그인용, 인메모리)
_signup_pending: dict[str, str] = {}


def _send_otp_email(email: str, otp: str, purpose: str = "회원가입") -> None:
    """Resend로 6자리 OTP 이메일 발송 (Supabase 이메일 한도 우회)."""
    if not settings.resend_api_key:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="이메일 설정이 없습니다.")
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#00A9EC">MOA {purpose} 인증</h2>
      <p>아래 6자리 인증번호를 입력해주세요. (10분 내 유효)</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#111;
                  background:#F1F5F9;padding:16px;text-align:center;border-radius:12px">{otp}</div>
      <p style="color:#888;font-size:12px;margin-top:16px">본인이 요청하지 않았다면 무시하세요.</p>
    </div>"""
    try:
        res = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"},
            json={
                "from": settings.resend_from_email,
                "to": [email],
                "subject": f"[MOA] {purpose} 인증번호 {otp}",
                "html": html,
            },
            timeout=15,
        )
    except Exception as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=f"이메일 발송 실패: {str(e)[:80]}")
    if res.status_code >= 400:
        # Resend 테스트모드: 본인 이메일 외 주소는 403
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"이메일 발송 실패: {res.json().get('message', res.text)[:120]}",
        )


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

    # 가입 확인 OTP를 Resend로 직접 발송 (Supabase 이메일 한도 우회)
    otp = otp_store.generate_otp(req.email)
    # 안전망: 메일이 막혀도 시연 가능하도록 OTP를 서버 콘솔에 출력
    print(f"[MOA][SIGNUP OTP] {req.email} -> {otp}", flush=True)
    # 검증 후 자동 로그인용으로 비밀번호 임시 보관(인메모리)
    _signup_pending[req.email] = req.password
    # 이메일 발송 시도 — 실패해도(테스트모드/네트워크 차단) 가입은 진행(콘솔 OTP로 시연)
    try:
        _send_otp_email(req.email, otp, "회원가입")
    except HTTPException:
        print(f"[MOA][SIGNUP OTP] 이메일 발송 실패 — 위 콘솔 OTP로 인증하세요.", flush=True)


def verify_signup_email(req: VerifyEmailRequest) -> TokenResponse:
    """Resend OTP 검증 → 계정 확인 → profiles 삽입 → 토큰 반환."""
    if not otp_store.verify_otp(req.email, req.token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증번호가 올바르지 않거나 만료되었습니다.")

    # 해당 이메일 유저 조회
    users = supabase_admin.auth.admin.list_users()
    user = next((u for u in users if u.email == req.email), None)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="가입 정보를 찾을 수 없습니다. 다시 시도해주세요.")

    # 이메일 확인 처리
    supabase_admin.auth.admin.update_user_by_id(user.id, {"email_confirm": True})

    # 프로필 생성 (이미 있으면 무시)
    meta = user.user_metadata or {}
    existing = (
        supabase_admin.table("profiles").select("id").eq("id", user.id).limit(1).execute()
    ).data
    if not existing:
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

    # 자동 로그인 → 토큰 발급
    password = _signup_pending.pop(req.email, None)
    if not password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="세션 정보가 만료되었습니다. 다시 로그인해주세요.")
    try:
        session_resp = supabase.auth.sign_in_with_password(
            {"email": req.email, "password": password}
        )
    except AuthApiError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="로그인에 실패했습니다. 다시 로그인해주세요.")
    session = session_resp.session
    if not session:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="세션 생성에 실패했습니다.")

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

def _user_by_email(email: str):
    users = supabase_admin.auth.admin.list_users()
    return next((u for u in users if u.email == email), None)


def find_id_send_otp(req: FindIdRequest) -> None:
    """6자리 OTP 발송(Resend). 가입된 이메일이 아니면 404."""
    if not _user_by_email(req.email):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="가입되지 않은 이메일입니다.")
    otp = otp_store.generate_otp(req.email)
    print(f"[MOA][FIND-ID OTP] {req.email} -> {otp}", flush=True)
    try:
        _send_otp_email(req.email, otp, "아이디 찾기")
    except HTTPException:
        print("[MOA][FIND-ID OTP] 이메일 발송 실패 — 위 콘솔 OTP로 인증하세요.", flush=True)


def find_id_verify_otp(req: FindIdVerifyRequest) -> str:
    """6자리 OTP 검증 후 username 반환."""
    if not otp_store.verify_otp(req.email, req.token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증번호가 올바르지 않거나 만료되었습니다.")
    user = _user_by_email(req.email)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    result = (
        supabase_admin.table("profiles")
        .select("username").eq("id", user.id).limit(1).execute()
    )
    if not result.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return result.data[0]["username"]


# ── 비밀번호 찾기 ──────────────────────────────────────────

def find_password_send_otp(req: FindPasswordRequest) -> None:
    """이메일 + username 일치 확인 후 Supabase OTP 발송."""
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
    print(f"[MOA][FIND-PW OTP] {req.email} -> {otp}", flush=True)
    try:
        _send_otp_email(req.email, otp, "비밀번호 재설정")
    except HTTPException:
        print("[MOA][FIND-PW OTP] 이메일 발송 실패 — 위 콘솔 OTP로 인증하세요.", flush=True)


def find_password_verify_otp(req: FindPasswordVerifyRequest) -> TokenResponse:
    """6자리 OTP 검증 후 비밀번호 재설정용 리셋토큰 반환."""
    if not otp_store.verify_otp(req.email, req.token):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증번호가 올바르지 않거나 만료되었습니다.")
    user = _user_by_email(req.email)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="인증에 실패했습니다.")
    reset_token = otp_store.create_reset_token(user.id)
    return TokenResponse(access_token=reset_token, refresh_token="")


# ── 내 프로필 조회 ────────────────────────────────────────

def get_me(token: str):
    """토큰으로 내 프로필 + 소속 정보 반환."""
    user = _get_user_from_token(token)

    profile = (
        supabase_admin.table("profiles")
        .select("username, first_name, last_name, onboarding_completed")
        .eq("id", user.id)
        .single()
        .execute()
    )
    p = profile.data or {}

    affiliation = (
        supabase_admin.table("user_affiliations")
        .select("affiliation_type, organization_name, department, student_id")
        .eq("user_id", user.id)
        .limit(1)
        .execute()
    )
    a = affiliation.data[0] if affiliation.data else {}

    return {
        "id": user.id,
        "username": p.get("username", ""),
        "first_name": p.get("first_name", ""),
        "last_name": p.get("last_name", ""),
        "email": user.email or "",
        "affiliation_type": a.get("affiliation_type"),
        "organization_name": a.get("organization_name"),
        "department": a.get("department"),
        "student_id": a.get("student_id"),
        "onboarding_completed": p.get("onboarding_completed", False),
    }


# ── 비밀번호 재설정 ────────────────────────────────────────

def reset_password(req: ResetPasswordRequest, token: str) -> None:
    """find-password/verify 에서 받은 리셋토큰으로 비밀번호 변경."""
    user_id = otp_store.consume_reset_token(token)
    if not user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="재설정 세션이 만료되었습니다. 다시 시도해주세요.")
    try:
        supabase_admin.auth.admin.update_user_by_id(
            user_id, {"password": req.new_password}
        )
    except AuthApiError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── 프로필 수정 ────────────────────────────────────────────

def update_profile(req, token: str) -> None:
    """이름 + 소속 정보 수정. (name은 last_name에 통째로 저장, first_name="")"""
    user = _get_user_from_token(token)

    supabase_admin.table("profiles").update(
        {"last_name": req.name.strip(), "first_name": ""}
    ).eq("id", user.id).execute()

    # 소속 정보 upsert (있으면 update, 없으면 insert)
    existing = (
        supabase_admin.table("user_affiliations").select("id").eq("user_id", user.id).limit(1).execute()
    ).data
    aff_data = {
        "organization_name": req.organization_name,
        "department": req.department,
        "student_id": req.student_id,
    }
    if existing:
        supabase_admin.table("user_affiliations").update(aff_data).eq("user_id", user.id).execute()
    else:
        supabase_admin.table("user_affiliations").insert({"user_id": user.id, **aff_data}).execute()


# ── 비밀번호 변경 ──────────────────────────────────────────

def change_password(req, token: str) -> None:
    """현재 비밀번호 검증 후 변경."""
    user = _get_user_from_token(token)
    email = user.email

    # 현재 비밀번호 검증
    try:
        supabase.auth.sign_in_with_password({"email": email, "password": req.current_password})
    except AuthApiError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="현재 비밀번호가 올바르지 않습니다.")

    try:
        supabase_admin.auth.admin.update_user_by_id(user.id, {"password": req.new_password})
    except AuthApiError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── 아이디 변경 ────────────────────────────────────────────

def change_username(req, token: str) -> None:
    """비밀번호 검증 후 username 변경 (중복 체크)."""
    user = _get_user_from_token(token)

    # 비밀번호 검증
    try:
        supabase.auth.sign_in_with_password({"email": user.email, "password": req.password})
    except AuthApiError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="비밀번호가 올바르지 않습니다.")

    # 중복 체크
    _check_username_available(req.new_username)

    supabase_admin.table("profiles").update(
        {"username": req.new_username}
    ).eq("id", user.id).execute()
