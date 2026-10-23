-- ============================================================
-- Migration: rename_reports_to_flags
-- Created: 2026-03-26
--
-- Renames the "reports" domain to "flags" for clarity.
-- "Reports" was ambiguous (data reports vs. user-generated
-- content flags). The UI still says "Report this…" but the
-- codebase uses "flags" everywhere.
-- ============================================================

-- ============================================================
-- 1. Drop existing RLS policies (reference old table name)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can view own reports" ON public.reports;

-- ============================================================
-- 2. Rename table
-- ============================================================

ALTER TABLE public.reports RENAME TO flags;

-- ============================================================
-- 3. Rename enums
-- ============================================================

ALTER TYPE public.report_reason RENAME TO flag_reason;
ALTER TYPE public.report_target_type RENAME TO flag_target_type;
ALTER TYPE public.report_status RENAME TO flag_status;

-- ============================================================
-- 4. Rename indexes
-- ============================================================

ALTER INDEX public.reports_reporter_id_idx RENAME TO flags_reporter_id_idx;
ALTER INDEX public.reports_target_type_target_id_idx RENAME TO flags_target_type_target_id_idx;

-- ============================================================
-- 5. Rename constraint
-- ============================================================

ALTER TABLE public.flags RENAME CONSTRAINT reports_reporter_target_unique TO flags_reporter_target_unique;

-- ============================================================
-- 6. Recreate RLS policies with updated names
-- ============================================================

CREATE POLICY "Authenticated users can insert own flags"
  ON public.flags FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can view own flags"
  ON public.flags FOR SELECT
  TO authenticated
  USING (reporter_id = (SELECT auth.uid()));
