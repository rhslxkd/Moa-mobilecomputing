from supabase import create_client, Client
from .config import settings

# 일반 작업용 (anon key)
supabase: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

# 관리자 작업용 (service role — RLS 무시)
supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
