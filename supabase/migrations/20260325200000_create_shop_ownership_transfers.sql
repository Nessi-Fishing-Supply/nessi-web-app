-- ============================================================
-- Migration: create_shop_ownership_transfers
-- Issue: #257
-- Created: 2026-03-25
--
-- Creates shop_ownership_transfers table with token-based
-- acceptance for pending ownership transfer requests.
-- ============================================================

-- ============================================================
-- 1. Create shop_ownership_transfers table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shop_ownership_transfers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  from_member_id UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id   UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  token          UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- 2. Create indexes
-- ============================================================

-- For looking up transfers by shop
CREATE INDEX IF NOT EXISTS shop_ownership_transfers_shop_id_idx
  ON public.shop_ownership_transfers (shop_id);

-- For looking up transfers involving a member as sender
CREATE INDEX IF NOT EXISTS shop_ownership_transfers_from_member_id_idx
  ON public.shop_ownership_transfers (from_member_id);

-- For looking up transfers involving a member as recipient
CREATE INDEX IF NOT EXISTS shop_ownership_transfers_to_member_id_idx
  ON public.shop_ownership_transfers (to_member_id);

-- Enforce one pending transfer per shop at a time
CREATE UNIQUE INDEX IF NOT EXISTS shop_ownership_transfers_pending_unique
  ON public.shop_ownership_transfers (shop_id)
  WHERE status = 'pending';

-- ============================================================
-- 3. Enable RLS and create SELECT policy
-- ============================================================

ALTER TABLE public.shop_ownership_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transfer participants can view their transfers"
  ON public.shop_ownership_transfers FOR SELECT
  TO authenticated
  USING (
    from_member_id = (SELECT auth.uid())
    OR to_member_id = (SELECT auth.uid())
  );
