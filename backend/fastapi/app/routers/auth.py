from fastapi import APIRouter, Depends, Header
from typing import Annotated

from app.schemas.auth import (
    SignUpRequest,
    VerifyEmailRequest,
    LoginRequest,
    RefreshRequest,
    SetupNameRequest,
    SetupAffiliationRequest,
    FindIdRequest,
    FindIdVerifyRequest,
    FindPasswordRequest,
    FindPasswordVerifyRequest,
    ResetPasswordRequest,
    TokenResponse,
    MessageResponse,
    UsernameResponse,
    UserProfileResponse,
    UpdateProfileRequest,
    ChangePasswordRequest,
    ChangeUsernameRequest,
)
import app.services.auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def bearer_token(authorization: Annotated[str, Header()]) -> str:
    """Authorization: Bearer <token> 헤더에서 토큰 추출."""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Bearer 토큰이 필요합니다.")
    return token


# ── 회원가입 ──────────────────────────────────────────────

@router.post("/signup", response_model=MessageResponse, status_code=201)
def signup(req: SignUpRequest):
    """계정 생성 + 이메일 인증 OTP 발송."""
    auth_service.sign_up(req)
    return {"message": "인증번호가 발송되었습니다. 이메일을 확인해주세요."}


@router.post("/signup/verify-email", response_model=TokenResponse)
def verify_signup_email(req: VerifyEmailRequest):
    """이메일 OTP 검증 → 토큰 반환."""
    return auth_service.verify_signup_email(req)


# ── 로그인 ────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    """아이디 + 비밀번호로 로그인."""
    return auth_service.login(req)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(req: RefreshRequest):
    """refresh_token으로 새 access_token 발급."""
    return auth_service.refresh(req.refresh_token)


# ── 온보딩: 이름 설정 ──────────────────────────────────────

@router.post("/setup/name", response_model=MessageResponse)
def setup_name(req: SetupNameRequest, token: str = Depends(bearer_token)):
    """이름(성/이름) 설정."""
    auth_service.setup_name(req, token)
    return {"message": "이름이 저장되었습니다."}


# ── 온보딩: 소속 설정 ──────────────────────────────────────

@router.post("/setup/affiliation", response_model=MessageResponse)
def setup_affiliation(req: SetupAffiliationRequest, token: str = Depends(bearer_token)):
    """소속 유형 및 상세 정보 설정. 온보딩 완료 처리."""
    auth_service.setup_affiliation(req, token)
    return {"message": "온보딩이 완료되었습니다."}


# ── 아이디 찾기 ────────────────────────────────────────────

@router.post("/find-id/send-otp", response_model=MessageResponse)
def find_id_send_otp(req: FindIdRequest):
    """이메일로 OTP 발송."""
    auth_service.find_id_send_otp(req)
    return {"message": "인증번호가 발송되었습니다."}


@router.post("/find-id/verify", response_model=UsernameResponse)
def find_id_verify(req: FindIdVerifyRequest):
    """OTP 검증 후 아이디 반환."""
    username = auth_service.find_id_verify_otp(req)
    return {"username": username}


# ── 비밀번호 찾기 ──────────────────────────────────────────

@router.post("/find-password/send-otp", response_model=MessageResponse)
def find_password_send_otp(req: FindPasswordRequest):
    """이메일 + 아이디 확인 후 OTP 발송."""
    auth_service.find_password_send_otp(req)
    return {"message": "인증번호가 발송되었습니다."}


@router.post("/find-password/verify", response_model=TokenResponse)
def find_password_verify(req: FindPasswordVerifyRequest):
    """OTP 검증 후 비밀번호 재설정용 토큰 반환."""
    return auth_service.find_password_verify_otp(req)


# ── 내 프로필 조회 ────────────────────────────────────────

@router.get("/me", response_model=UserProfileResponse)
def get_me(token: str = Depends(bearer_token)):
    """내 프로필 + 소속 정보 조회."""
    return auth_service.get_me(token)


# ── 비밀번호 재설정 ────────────────────────────────────────

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, token: str = Depends(bearer_token)):
    """find-password/verify 에서 받은 토큰으로 비밀번호 변경."""
    auth_service.reset_password(req, token)
    return {"message": "비밀번호가 재설정되었습니다."}


@router.patch("/profile", response_model=MessageResponse)
def update_profile(req: UpdateProfileRequest, token: str = Depends(bearer_token)):
    auth_service.update_profile(req, token)
    return {"message": "프로필이 수정되었습니다."}


@router.post("/change-password", response_model=MessageResponse)
def change_password(req: ChangePasswordRequest, token: str = Depends(bearer_token)):
    auth_service.change_password(req, token)
    return {"message": "비밀번호가 변경되었습니다."}


@router.post("/change-username", response_model=MessageResponse)
def change_username(req: ChangeUsernameRequest, token: str = Depends(bearer_token)):
    auth_service.change_username(req, token)
    return {"message": "아이디가 변경되었습니다."}
