-- ============================================================
-- Migration: create_orders
-- Issue: #30
-- Created: 2026-04-05
--
-- Creates orders table with escrow lifecycle, RLS policies, indexes, triggers.
-- ============================================================

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id               UUID         NOT NULL REFERENCES public.listings(id),
  buyer_id                 UUID         REFERENCES public.members(id),
  buyer_email              TEXT         NOT NULL,
  seller_id                UUID         NOT NULL REFERENCES public.members(id),
  stripe_payment_intent_id TEXT         UNIQUE NOT NULL,
  amount_cents             INTEGER      NOT NULL,
  nessi_fee_cents          INTEGER      NOT NULL,
  shipping_cost_cents      INTEGER      NOT NULL DEFAULT 0,
  status                   TEXT         NOT NULL DEFAULT 'paid',
  escrow_status            TEXT         NOT NULL DEFAULT 'held',
  shipping_address         JSONB        NOT NULL,
  tracking_number          TEXT,
  carrier                  TEXT,
  shipped_at               TIMESTAMPTZ,
  delivered_at             TIMESTAMPTZ,
  verification_deadline    TIMESTAMPTZ,
  buyer_accepted_at        TIMESTAMPTZ,
  released_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_check CHECK (status IN ('paid', 'shipped', 'delivered', 'verification', 'released', 'disputed', 'refunded')),
  CONSTRAINT orders_escrow_status_check CHECK (escrow_status IN ('held', 'released', 'disputed', 'refunded'))
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id
  ON public.orders (buyer_id);

CREATE INDEX IF NOT EXISTS idx_orders_seller_id
  ON public.orders (seller_id);

CREATE INDEX IF NOT EXISTS idx_orders_listing_id
  ON public.orders (listing_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);

-- ============================================================
-- 3. Enable RLS
-- ============================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Note: No INSERT policy for users — orders are created by the webhook handler
-- using the admin/service_role client which bypasses RLS.
-- No DELETE policy — orders are never deleted.

DROP POLICY IF EXISTS "orders_buyer_select" ON public.orders;
CREATE POLICY "orders_buyer_select"
  ON public.orders FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "orders_seller_select" ON public.orders;
CREATE POLICY "orders_seller_select"
  ON public.orders FOR SELECT
  TO authenticated
  USING (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "orders_buyer_update" ON public.orders;
CREATE POLICY "orders_buyer_update"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "orders_seller_update" ON public.orders;
CREATE POLICY "orders_seller_update"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (seller_id = (SELECT auth.uid()));

-- ============================================================
-- 5. Triggers
-- ============================================================

-- Reuses the generic handle_updated_at() function from the profiles migration.

DROP TRIGGER IF EXISTS on_orders_updated_at ON public.orders;
CREATE TRIGGER on_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
