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

    class Config:
        env_file = ".env"


settings = Settings()
