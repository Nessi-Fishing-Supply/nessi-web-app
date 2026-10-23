-- ============================================================
-- Migration: create_recently_viewed
-- Created: 2026-03-24
-- Creates the recently_viewed table with RLS, indexes, and a
-- trigger that caps each user's history to the 50 most recent.
-- ============================================================

-- ============================================================
-- Step 1: Create recently_viewed table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  listing_id  UUID        NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recently_viewed_user_listing_unique UNIQUE (user_id, listing_id)
);

-- ============================================================
-- Step 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_id       ON public.recently_viewed (user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed   ON public.recently_viewed (user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_listing_id    ON public.recently_viewed (listing_id);

-- ============================================================
-- Step 3: Enable RLS
-- ============================================================

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: RLS policies
-- ============================================================

-- SELECT: users can read their own recently viewed listings
DROP POLICY IF EXISTS "Users can view own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can view own recently viewed"
  ON public.recently_viewed FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INSERT: users can add to their own recently viewed
DROP POLICY IF EXISTS "Users can insert own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can insert own recently viewed"
  ON public.recently_viewed FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: users can update their own recently viewed entries
DROP POLICY IF EXISTS "Users can update own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can update own recently viewed"
  ON public.recently_viewed FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: users can remove their own recently viewed entries
DROP POLICY IF EXISTS "Users can delete own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users can delete own recently viewed"
  ON public.recently_viewed FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- Step 5: Trigger function — cap history at 50 per user
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_recently_viewed_cap()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.recently_viewed
  WHERE id NOT IN (
    SELECT id FROM public.recently_viewed
    WHERE user_id = NEW.user_id
    ORDER BY viewed_at DESC
    LIMIT 50
  )
  AND user_id = NEW.user_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS on_recently_viewed_insert ON public.recently_viewed;
CREATE TRIGGER on_recently_viewed_insert
  AFTER INSERT ON public.recently_viewed
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_recently_viewed_cap();
