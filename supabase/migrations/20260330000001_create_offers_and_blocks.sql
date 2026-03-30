-- ============================================================
-- Migration: create_offers_and_blocks
-- Issue: #303
-- Created: 2026-03-30
--
-- Creates offers and member_blocks tables with enums, indexes,
-- RLS policies, and triggers for the offers and blocking system.
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================

CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'countered', 'expired');

-- ============================================================
-- 2. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.offers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        UUID          NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  listing_id       UUID          NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id         UUID          NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  seller_id        UUID          NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount_cents     INTEGER       NOT NULL CHECK (amount_cents > 0),
  status           offer_status  NOT NULL DEFAULT 'pending',
  expires_at       TIMESTAMPTZ   NOT NULL,
  parent_offer_id  UUID          REFERENCES public.offers(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_blocks (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID         NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  blocked_id  UUID         NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT member_blocks_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT member_blocks_no_self_block CHECK (blocker_id != blocked_id)
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_offers_listing_buyer_status
  ON public.offers (listing_id, buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_offers_thread_id
  ON public.offers (thread_id);

CREATE INDEX IF NOT EXISTS idx_offers_status_expires_at
  ON public.offers (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_member_blocks_blocker_id
  ON public.member_blocks (blocker_id);

CREATE INDEX IF NOT EXISTS idx_member_blocks_blocked_id
  ON public.member_blocks (blocked_id);

-- ============================================================
-- 4. Enable RLS
-- ============================================================

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

DROP POLICY IF EXISTS "offers_select_buyer_seller" ON public.offers;
CREATE POLICY "offers_select_buyer_seller"
  ON public.offers FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()) OR seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "offers_insert_buyer" ON public.offers;
CREATE POLICY "offers_insert_buyer"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "offers_update_seller" ON public.offers;
CREATE POLICY "offers_update_seller"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "member_blocks_select_own" ON public.member_blocks;
CREATE POLICY "member_blocks_select_own"
  ON public.member_blocks FOR SELECT
  TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "member_blocks_insert_own" ON public.member_blocks;
CREATE POLICY "member_blocks_insert_own"
  ON public.member_blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "member_blocks_delete_own" ON public.member_blocks;
CREATE POLICY "member_blocks_delete_own"
  ON public.member_blocks FOR DELETE
  TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

-- ============================================================
-- 6. Trigger Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_offers_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Triggers
-- ============================================================

DROP TRIGGER IF EXISTS trg_update_offers_timestamp ON public.offers;
CREATE TRIGGER trg_update_offers_timestamp
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_offers_timestamp();
