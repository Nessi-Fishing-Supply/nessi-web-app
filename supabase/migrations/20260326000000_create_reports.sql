-- ============================================================
-- Migration: create_reports
-- Issue: #198
-- Created: 2026-03-26
--
-- Creates report_reason, report_target_type, and report_status
-- enums, and the reports table with RLS policies.
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================

CREATE TYPE public.report_reason AS ENUM (
  'spam',
  'prohibited_item',
  'counterfeit',
  'inappropriate_content',
  'off_platform_transaction',
  'harassment',
  'other'
);

CREATE TYPE public.report_target_type AS ENUM (
  'listing',
  'member',
  'shop',
  'message'
);

CREATE TYPE public.report_status AS ENUM (
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
);

-- ============================================================
-- 2. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID                      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type   public.report_target_type NOT NULL,
  target_id     UUID                      NOT NULL,
  reason        public.report_reason      NOT NULL,
  description   TEXT,
  status        public.report_status      NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ               NOT NULL DEFAULT now(),
  CONSTRAINT reports_reporter_target_unique UNIQUE (reporter_id, target_type, target_id)
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_target_type_target_id_idx ON public.reports (target_type, target_id);

-- ============================================================
-- 4. Enable RLS
-- ============================================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS policies
-- ============================================================

-- INSERT: authenticated users can report, must be the reporter
DROP POLICY IF EXISTS "Authenticated users can insert own reports" ON public.reports;
CREATE POLICY "Authenticated users can insert own reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

-- SELECT: authenticated users can read only their own reports
DROP POLICY IF EXISTS "Authenticated users can view own reports" ON public.reports;
CREATE POLICY "Authenticated users can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT auth.uid()));
