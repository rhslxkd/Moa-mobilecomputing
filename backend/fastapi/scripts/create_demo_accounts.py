"""시연용 공용 계정 일괄 생성.

이메일 인증 없이 바로 로그인 가능한 완성 계정(프로필 + 온보딩 완료)을 만든다.
로그인은 username/password로 한다.

실행:
  cd backend/fastapi
  source <venv>/bin/activate   # .env 로드 환경
  python -m scripts.create_demo_accounts

비밀번호는 모두 동일(DEMO_PASSWORD). 이미 있으면 건너뛴다.
"""
import sys
from pathlib import Path

# app 패키지 임포트 가능하도록 경로 추가
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.supabase import supabase_admin  # noqa: E402

DEMO_PASSWORD = "moademo1234"

# (username, 이메일, 성, 이름)
DEMO_USERS = [
    ("demo1", "demo1@moa.demo", "데모", "일호"),
    ("demo2", "demo2@moa.demo", "데모", "이호"),
    ("demo3", "demo3@moa.demo", "데모", "삼호"),
    ("demo4", "demo4@moa.demo", "데모", "사호"),
    ("demo5", "demo5@moa.demo", "데모", "오호"),
]


def _find_user_by_email(email: str):
    users = supabase_admin.auth.admin.list_users()
    return next((u for u in users if u.email == email), None)


def create_account(username: str, email: str, last_name: str, first_name: str) -> None:
    # username 중복 체크
    existing = (
        supabase_admin.table("profiles").select("id").eq("username", username).limit(1).execute()
    ).data
    if existing:
        print(f"  - {username} (이미 존재) 건너뜀")
        return

    user = _find_user_by_email(email)
    if user is None:
        resp = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": DEMO_PASSWORD,
            "email_confirm": True,  # 인증 없이 바로 사용
            "user_metadata": {"username": username},
        })
        user = resp.user
        print(f"  + auth 계정 생성: {email}")
    else:
        # 이미 auth 계정이 있으면 비번/확인 갱신
        supabase_admin.auth.admin.update_user_by_id(user.id, {
            "password": DEMO_PASSWORD, "email_confirm": True,
        })
        print(f"  ~ auth 계정 갱신: {email}")

    # 프로필 upsert (온보딩 완료 상태)
    supabase_admin.table("profiles").upsert({
        "id": user.id,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "terms_agreed": True,
        "privacy_agreed": True,
        "marketing_agreed": False,
        "onboarding_completed": True,
    }).execute()
    print(f"  ✓ {username} 준비 완료 (로그인: {username} / {DEMO_PASSWORD})")


def main() -> None:
    print("=== MOA 시연용 공용 계정 생성 ===")
    for u in DEMO_USERS:
        create_account(*u)
    print("\n완료! 아래 계정으로 로그인하세요 (비밀번호 공통: %s)" % DEMO_PASSWORD)
    for username, *_ in DEMO_USERS:
        print(f"  - {username}")


if __name__ == "__main__":
    main()
