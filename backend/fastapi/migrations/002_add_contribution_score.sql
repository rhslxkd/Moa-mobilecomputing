-- ============================================================
-- 002_add_contribution_score.sql
-- 기여도 점수 저장 — 리포트 열 때마다 갱신, 프로필 컨디션 배지에서 빠르게 조회
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

ALTER TABLE public.project_members
    ADD COLUMN IF NOT EXISTS contribution_score INT,
    ADD COLUMN IF NOT EXISTS score_updated_at   TIMESTAMPTZ;
