from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    resend_api_key: str
    resend_from_email: str = "MOA <noreply@moa.com>"

    openai_api_key: str

    daglo_api_key: str = ""

    # AI 호환 API 전환용 (비우면 OpenAI 기본)
    ai_base_url: str = ""
    ai_model: str = "gpt-4o-mini"

    # Firebase (푸시 알림)
    # 로컬: serviceAccountKey.json 경로 / 배포(Railway): JSON 내용을 환경변수로
    firebase_credentials_path: str = ""
    firebase_credentials_json: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
