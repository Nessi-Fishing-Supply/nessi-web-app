-- ============================================================
-- Migration: create_cart_items
-- Created: 2026-03-23
-- Creates the cart_items table with RLS, indexes, and a trigger
-- that removes cart items when a listing leaves active status.
-- ============================================================

-- ============================================================
-- Step 1: Create cart_items table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  listing_id     UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  price_at_add   NUMERIC     NOT NULL,
  added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  added_from     TEXT,
  CONSTRAINT cart_items_user_listing_unique UNIQUE (user_id, listing_id)
);

-- ============================================================
-- Step 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS cart_items_user_id_idx    ON public.cart_items (user_id);
CREATE INDEX IF NOT EXISTS cart_items_listing_id_idx ON public.cart_items (listing_id);

-- ============================================================
-- Step 3: Column-level privileges (restrict UPDATE to expires_at only)
-- ============================================================

-- Revoke UPDATE on all columns from authenticated role, then grant only expires_at.
-- This works in conjunction with the UPDATE RLS policy to enforce column-level
-- write restriction: users can only extend their own cart item expiry.
REVOKE UPDATE ON public.cart_items FROM authenticated;
GRANT  UPDATE (expires_at) ON public.cart_items TO authenticated;

-- ============================================================
-- Step 4: Enable RLS
-- ============================================================

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 5: RLS policies
-- ============================================================

-- SELECT: users can read their own cart items
DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INSERT: users can add items to their own cart
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
CREATE POLICY "Users can insert own cart items"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: users can update their own cart items (column-level grant restricts to expires_at)
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: users can remove items from their own cart
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- Step 6: Trigger function — remove cart items on listing deactivation
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_listing_status_change()
RETURNS trigger AS $$
BEGIN
  -- When a listing leaves active status, remove it from all carts
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    DELETE FROM public.cart_items
    WHERE listing_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- Step 7: Trigger on listings table
-- ============================================================

DROP TRIGGER IF EXISTS on_listing_status_change ON public.listings;
CREATE TRIGGER on_listing_status_change
  AFTER UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_listing_status_change();
