-- ============================================================
-- Migration: create_moderation_flags
-- Created: 2026-04-02
--
-- Creates moderation_flags table for logging auto-detected
-- content violations. Admin-only — RLS enabled with no
-- user-facing policies (accessed via admin client).
-- ============================================================

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  context          TEXT        NOT NULL CHECK (context IN ('listing', 'member', 'shop', 'message')),
  action           TEXT        NOT NULL CHECK (action IN ('block', 'redact')),
  original_content TEXT        NOT NULL,
  filtered_content TEXT,
  source_id        UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX idx_moderation_flags_member_id ON public.moderation_flags(member_id);

-- ============================================================
-- 3. RLS — admin-only (no user-facing policies)
-- ============================================================

ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;
