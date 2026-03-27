-- ============================================================
-- Migration: create_follows
-- Issue: #211
-- Created: 2026-03-26
--
-- Creates the follows table (polymorphic: member|shop targets),
-- adds follower_count to members and shops, and creates the
-- update_follower_count() trigger.
-- ============================================================

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  target_type TEXT        NOT NULL CHECK (target_type IN ('member', 'shop')),
  target_id   UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT follows_follower_target_unique UNIQUE (follower_id, target_type, target_id),
  CONSTRAINT follows_no_self_follow CHECK (NOT (target_type = 'member' AND follower_id = target_id))
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_target_type_target_id_idx ON public.follows (target_type, target_id);

-- ============================================================
-- 3. Enable RLS
-- ============================================================

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS policies
-- ============================================================

-- SELECT: follows are viewable by everyone
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT
  TO authenticated, anon
  USING (true);

-- INSERT: authenticated users can insert own follows
DROP POLICY IF EXISTS "Users can insert own follows" ON public.follows;
CREATE POLICY "Users can insert own follows"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = (SELECT auth.uid()));

-- DELETE: authenticated users can delete own follows
DROP POLICY IF EXISTS "Users can delete own follows" ON public.follows;
CREATE POLICY "Users can delete own follows"
  ON public.follows FOR DELETE
  TO authenticated
  USING (follower_id = (SELECT auth.uid()));

-- ============================================================
-- 5. Alter members and shops
-- ============================================================

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- 6. Trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'member' THEN
      UPDATE public.members SET follower_count = follower_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'shop' THEN
      UPDATE public.shops SET follower_count = follower_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'member' THEN
      UPDATE public.members SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'shop' THEN
      UPDATE public.shops SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================
-- 7. Trigger
-- ============================================================

DROP TRIGGER IF EXISTS on_follows_change ON public.follows;
CREATE TRIGGER on_follows_change
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follower_count();
