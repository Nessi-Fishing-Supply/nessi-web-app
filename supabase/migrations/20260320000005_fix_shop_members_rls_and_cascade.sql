-- ============================================================
-- Migration: fix_shop_members_rls_and_cascade
-- Created: 2026-03-20
-- Fixes:
--   1. shop_members SELECT RLS policy had infinite recursion
--      (queried shop_members to authorize reading shop_members)
--   2. shops.owner_id ON DELETE RESTRICT blocked account deletion
--      cascade chain (auth.users → members → blocked by shops FK)
-- ============================================================

-- ============================================================
-- Fix 1: Replace self-referencing shop_members SELECT policy
-- ============================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Shop members can view co-members" ON public.shop_members;

-- Members can see their own memberships
CREATE POLICY "Members can view own memberships"
  ON public.shop_members FOR SELECT
  TO authenticated
  USING (member_id = (SELECT auth.uid()));

-- Shop owners can see all members of their shops
CREATE POLICY "Shop owners can view all shop members"
  ON public.shop_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = shop_members.shop_id
        AND owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- Fix 2: Change shops.owner_id from RESTRICT to CASCADE
-- ============================================================

-- Drop the existing FK constraint
ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_owner_id_fkey;

-- Re-add with ON DELETE CASCADE so account deletion works
ALTER TABLE public.shops
  ADD CONSTRAINT shops_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- ============================================================
-- Fix 3: Clean up slugs when a member is deleted
-- ============================================================

-- Create a trigger to release member slugs before deletion
CREATE OR REPLACE FUNCTION public.handle_member_deletion()
RETURNS trigger AS $$
BEGIN
  -- Release the member's slug from the shared slugs table
  DELETE FROM public.slugs
  WHERE entity_type = 'member' AND entity_id = OLD.id;

  -- Release slugs for any shops owned by this member
  -- (shops will be cascade-deleted, but slugs won't auto-clean)
  DELETE FROM public.slugs
  WHERE entity_type = 'shop' AND entity_id IN (
    SELECT id FROM public.shops WHERE owner_id = OLD.id
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_member_before_delete
  BEFORE DELETE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.handle_member_deletion();
