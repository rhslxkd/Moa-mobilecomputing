from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from enum import Enum


class AffiliationType(str, Enum):
    student = "student"
    worker = "worker"
    researcher = "researcher"
    other = "other"


# ── 회원가입 ──────────────────────────────────────────────
class SignUpRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    terms_agreed: bool
    privacy_agreed: bool
    marketing_agreed: bool = False

    @field_validator("terms_agreed", "privacy_agreed")
    @classmethod
    def must_be_true(cls, v: bool) -> bool:
        if not v:
            raise ValueError("필수 약관에 동의해야 합니다.")
        return v

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("아이디는 영문, 숫자, _, - 만 사용할 수 있습니다.")
        if len(v) < 3 or len(v) > 20:
            raise ValueError("아이디는 3~20자여야 합니다.")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


# ── 로그인 ────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


# ── 이름 설정 ──────────────────────────────────────────────
class SetupNameRequest(BaseModel):
    last_name: str
    first_name: str


# ── 소속 설정 ──────────────────────────────────────────────
class SetupAffiliationRequest(BaseModel):
    affiliation_type: AffiliationType
    organization_name: str
    department: Optional[str] = None
    student_id: Optional[str] = None


# ── 이메일 인증 ────────────────────────────────────────────
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    token: str


# ── 아이디 찾기 ────────────────────────────────────────────
class FindIdRequest(BaseModel):
    email: EmailStr


class FindIdVerifyRequest(BaseModel):
    email: EmailStr
    token: str


# ── 비밀번호 찾기 ──────────────────────────────────────────
class FindPasswordRequest(BaseModel):
    email: EmailStr
    username: str


class FindPasswordVerifyRequest(BaseModel):
    email: EmailStr
    token: str


# ── 비밀번호 재설정 ────────────────────────────────────────
class ResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다.")
        return v


# ── 응답 ──────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class UsernameResponse(BaseModel):
    username: str


# ── 내 프로필 조회 ─────────────────────────────────────────
class UserProfileResponse(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    email: str
    affiliation_type: Optional[str] = None
    organization_name: Optional[str] = None
    department: Optional[str] = None
    student_id: Optional[str] = None
    onboarding_completed: bool


# ── 프로필/계정 수정 ───────────────────────────────────────
class UpdateProfileRequest(BaseModel):
    name: str
    organization_name: Optional[str] = None
    department: Optional[str] = None
    student_id: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeUsernameRequest(BaseModel):
    new_username: str
    password: str
