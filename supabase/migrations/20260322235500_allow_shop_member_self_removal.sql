-- Allow shop members to remove themselves (leave a shop)
-- Previously only shop owners could remove members
DROP POLICY IF EXISTS "Shop owner can remove members" ON public.shop_members;

CREATE POLICY "Shop owner or self can remove members"
  ON public.shop_members FOR DELETE
  TO authenticated
  USING (
    -- Owner can remove anyone
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = shop_members.shop_id
        AND owner_id = (SELECT auth.uid())
    )
    OR
    -- Members can remove themselves
    member_id = (SELECT auth.uid())
  );
