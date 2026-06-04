/**
 * src/lib/supabase.ts
 * Supabase Realtime 구독 전용 클라이언트 (메시지 수신).
 * 데이터 전송/조회는 FastAPI(api.ts)를 사용한다.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fjfqidtaujxywevkigqo.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZnFpZHRhdWp4eXdldmtpZ3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDc1MjgsImV4cCI6MjA5MDA4MzUyOH0.SViIrSJVFFvXzKCqtkhVfuy2H_yU7q_KGYe2Q6ftmFI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
});
