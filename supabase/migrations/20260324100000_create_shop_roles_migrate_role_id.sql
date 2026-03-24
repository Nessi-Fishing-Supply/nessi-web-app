-- ============================================================
-- Migration: create_shop_roles_migrate_role_id
-- Issue: #236
-- Created: 2026-03-24
--
-- Creates shop_roles table with system roles, migrates
-- shop_members.role TEXT → role_id UUID FK, and updates
-- all affected RLS policies and indexes.
-- ============================================================

-- ============================================================
-- Deterministic system role UUIDs (application constants)
-- ============================================================
-- Owner:       '11111111-1111-1111-1111-111111111101'
-- Manager:     '11111111-1111-1111-1111-111111111102'
-- Contributor: '11111111-1111-1111-1111-111111111103'

-- ============================================================
-- 1. Create shop_roles table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shop_roles (
  id          UUID PRIMARY KEY,
  shop_id     UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  permissions JSONB NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for custom roles (shop_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS shop_roles_shop_slug_unique
  ON public.shop_roles (shop_id, slug) WHERE shop_id IS NOT NULL;

-- Unique constraint for system roles (shop_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS shop_roles_system_slug_unique
  ON public.shop_roles (slug) WHERE shop_id IS NULL;

-- Index for lookups by shop_id
CREATE INDEX IF NOT EXISTS shop_roles_shop_id_idx
  ON public.shop_roles (shop_id) WHERE shop_id IS NOT NULL;

-- ============================================================
-- 2. Seed system roles
-- ============================================================

INSERT INTO public.shop_roles (id, shop_id, name, slug, permissions, is_system, sort_order)
VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    NULL,
    'Owner',
    'owner',
    '{"listings": "full", "pricing": "full", "orders": "full", "messaging": "full", "shop_settings": "full", "members": "full"}'::jsonb,
    TRUE,
    1
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    NULL,
    'Manager',
    'manager',
    '{"listings": "full", "pricing": "full", "orders": "full", "messaging": "full", "shop_settings": "view", "members": "none"}'::jsonb,
    TRUE,
    2
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    NULL,
    'Contributor',
    'contributor',
    '{"listings": "full", "pricing": "none", "orders": "none", "messaging": "none", "shop_settings": "none", "members": "none"}'::jsonb,
    TRUE,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Add role_id column to shop_members (nullable initially)
-- ============================================================

ALTER TABLE public.shop_members
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.shop_roles(id);

-- ============================================================
-- 4. Backfill role_id from existing role TEXT column
-- ============================================================

UPDATE public.shop_members
  SET role_id = '11111111-1111-1111-1111-111111111101'
  WHERE role = 'owner' AND role_id IS NULL;

UPDATE public.shop_members
  SET role_id = '11111111-1111-1111-1111-111111111102'
  WHERE role = 'admin' AND role_id IS NULL;

UPDATE public.shop_members
  SET role_id = '11111111-1111-1111-1111-111111111103'
  WHERE role = 'contributor' AND role_id IS NULL;

-- ============================================================
-- 5. Set role_id to NOT NULL
-- ============================================================

ALTER TABLE public.shop_members
  ALTER COLUMN role_id SET NOT NULL;

-- ============================================================
-- 6. Drop old one-owner index
-- ============================================================

DROP INDEX IF EXISTS public.shop_members_one_owner_per_shop;

-- ============================================================
-- 7. Drop RLS policy that depends on role column BEFORE dropping it
-- ============================================================

DROP POLICY IF EXISTS "Shop owner or admin can update shop" ON public.shops;

-- ============================================================
-- 8. Drop the old role CHECK constraint and column
-- ============================================================

ALTER TABLE public.shop_members
  DROP CONSTRAINT IF EXISTS shop_members_role_check;

ALTER TABLE public.shop_members
  DROP COLUMN IF EXISTS role;

-- ============================================================
-- 9. Recreate one-owner index with role_id
-- ============================================================

CREATE UNIQUE INDEX shop_members_one_owner_per_shop
  ON public.shop_members (shop_id)
  WHERE role_id = '11111111-1111-1111-1111-111111111101';

-- ============================================================
-- 10. Recreate shops UPDATE policy with role_id
-- ============================================================

CREATE POLICY "Shop owner or manager can update shop"
  ON public.shops FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = shops.id
        AND member_id = (SELECT auth.uid())
        AND role_id IN (
          '11111111-1111-1111-1111-111111111101',
          '11111111-1111-1111-1111-111111111102'
        )
    )
  );

-- ============================================================
-- 11. RLS on shop_roles
-- ============================================================

ALTER TABLE public.shop_roles ENABLE ROW LEVEL SECURITY;

-- System roles visible to all authenticated users
CREATE POLICY "Authenticated users can view system roles"
  ON public.shop_roles FOR SELECT
  TO authenticated
  USING (shop_id IS NULL);

-- Custom roles visible to shop members
CREATE POLICY "Shop members can view their shop roles"
  ON public.shop_roles FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT sm.shop_id FROM public.shop_members sm
      WHERE sm.member_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 12. Index role_id on shop_members for FK lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS shop_members_role_id_idx
  ON public.shop_members (role_id);
