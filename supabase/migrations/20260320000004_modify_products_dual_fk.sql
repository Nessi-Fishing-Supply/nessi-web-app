-- ============================================================
-- Migration: modify_products_dual_fk
-- Created: 2026-03-20
-- Drops user_id from products, adds member_id / shop_id dual FK
-- pattern with is_visible flag. Updates RLS on products and
-- product_images to respect the new ownership model.
-- ============================================================

-- ============================================================
-- Step 1: Drop existing RLS policies BEFORE altering columns
-- (policies reference user_id — must be removed first)
-- ============================================================

-- products
DROP POLICY IF EXISTS "Products are viewable by everyone"     ON public.products;
DROP POLICY IF EXISTS "Users can insert own products"         ON public.products;
DROP POLICY IF EXISTS "Users can update own products"         ON public.products;
DROP POLICY IF EXISTS "Users can delete own products"         ON public.products;

-- product_images
DROP POLICY IF EXISTS "Product images are viewable by everyone"      ON public.product_images;
DROP POLICY IF EXISTS "Users can insert images for own products"     ON public.product_images;
DROP POLICY IF EXISTS "Users can update images for own products"     ON public.product_images;
DROP POLICY IF EXISTS "Users can delete images for own products"     ON public.product_images;

-- ============================================================
-- Step 2: Modify products table
-- ============================================================

ALTER TABLE public.products DROP COLUMN IF EXISTS user_id;

ALTER TABLE public.products
  ADD COLUMN member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  ADD COLUMN shop_id   UUID REFERENCES public.shops(id)   ON DELETE CASCADE,
  ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.products
  ADD CONSTRAINT products_single_owner_check
  CHECK (
    (member_id IS NOT NULL AND shop_id IS NULL)
    OR
    (member_id IS NULL AND shop_id IS NOT NULL)
  );

-- ============================================================
-- Step 3: Indexes on new FK columns
-- ============================================================

CREATE INDEX products_member_id_idx ON public.products (member_id);
CREATE INDEX products_shop_id_idx   ON public.products (shop_id);

-- ============================================================
-- Step 4: RLS policies — products
-- ============================================================

-- SELECT: everyone sees visible products; owners see all their own
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  TO authenticated, anon
  USING (
    is_visible = TRUE
    OR member_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = products.shop_id
        AND member_id = (SELECT auth.uid())
    )
  );

-- INSERT: member_id matches caller OR caller is a shop_member of the given shop
CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = products.shop_id
        AND member_id = (SELECT auth.uid())
    )
  );

-- UPDATE: same ownership check
CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    member_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = products.shop_id
        AND member_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    member_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = products.shop_id
        AND member_id = (SELECT auth.uid())
    )
  );

-- DELETE: same ownership check
CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    member_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = products.shop_id
        AND member_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- Step 5: RLS policies — product_images
-- ============================================================

-- SELECT: visible products are open to all; owners see images for their hidden products too
CREATE POLICY "Product images are viewable by everyone"
  ON public.product_images FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND (
          p.is_visible = TRUE
          OR p.member_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = p.shop_id
              AND sm.member_id = (SELECT auth.uid())
          )
        )
    )
  );

-- INSERT: caller must own the parent product
CREATE POLICY "Users can insert images for own products"
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND (
          p.member_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = p.shop_id
              AND sm.member_id = (SELECT auth.uid())
          )
        )
    )
  );

-- UPDATE: same ownership check
CREATE POLICY "Users can update images for own products"
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND (
          p.member_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = p.shop_id
              AND sm.member_id = (SELECT auth.uid())
          )
        )
    )
  );

-- DELETE: same ownership check
CREATE POLICY "Users can delete images for own products"
  ON public.product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND (
          p.member_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.shop_members sm
            WHERE sm.shop_id = p.shop_id
              AND sm.member_id = (SELECT auth.uid())
          )
        )
    )
  );
