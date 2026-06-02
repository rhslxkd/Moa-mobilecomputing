-- ============================================================
-- 001_create_projects.sql
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── projects 테이블 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    emoji           TEXT        NOT NULL DEFAULT '🚀',
    color           TEXT        NOT NULL DEFAULT '#00A9EC',
    status          TEXT        NOT NULL DEFAULT 'upcoming'
                                CHECK (status IN ('active', 'upcoming', 'completed')),
    start_date      DATE        NOT NULL,
    end_date        DATE        NOT NULL,
    has_chat_alert  BOOLEAN     NOT NULL DEFAULT FALSE,
    has_todo_alert  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── project_members 테이블 ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    roles       TEXT[]      NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
