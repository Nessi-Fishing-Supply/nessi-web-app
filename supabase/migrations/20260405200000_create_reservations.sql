-- ============================================================
-- Migration: create_reservations
-- Issue: #144
-- Created: 2026-04-05
--
-- Creates reservations table with RLS policies, indexes,
-- and auto-release function for expired reservations.
-- ============================================================

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID         NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  reserved_by     UUID         NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  reserved_until  TIMESTAMPTZ  NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reservations_reserved_by
  ON public.reservations (reserved_by);

CREATE INDEX IF NOT EXISTS idx_reservations_reserved_until
  ON public.reservations (reserved_until);

-- ============================================================
-- 3. Row Level Security
-- ============================================================

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservations_select_own
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = reserved_by);

CREATE POLICY reservations_insert_own
  ON public.reservations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = reserved_by);

CREATE POLICY reservations_delete_own
  ON public.reservations
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = reserved_by);

-- ============================================================
-- 4. Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.release_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set expired-reservation listings back to active (only if still reserved)
  UPDATE listings
  SET status = 'active'
  WHERE id IN (SELECT listing_id FROM reservations WHERE reserved_until < now())
    AND status = 'reserved';

  -- Delete the expired reservation rows
  DELETE FROM reservations WHERE reserved_until < now();
END;
$$;

-- ============================================================
-- 5. pg_cron (manual setup required)
-- ============================================================

-- To auto-release expired reservations on a schedule, configure pg_cron
-- in the Supabase dashboard (Database → Extensions → pg_cron), then run:
--
--   SELECT cron.schedule(
--     'release-expired-reservations',
--     '* * * * *',  -- every minute
--     $$ SELECT public.release_expired_reservations(); $$
--   );
--
-- This mirrors the cron pattern used for orders (release_stale_orders,
-- auto_deliver_orders). The job can also be driven by a Vercel Cron route
-- at /api/cron/release-reservations calling the function via RPC.
