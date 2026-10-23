-- ============================================================
-- Migration: backfill_shop_slugs_add_members_slug_unique
-- Created: 2026-03-23
--
-- Fixes two inconsistencies in the slug system:
-- 1. Existing shops have slugs on their rows but were never
--    registered in the shared slugs table (collision risk)
-- 2. members.slug lacks a UNIQUE constraint (shops.slug has one)
-- ============================================================

-- ============================================================
-- Backfill: register existing shop slugs in the slugs table
-- ============================================================

INSERT INTO public.slugs (slug, entity_type, entity_id)
SELECT slug, 'shop', id
FROM public.shops
WHERE deleted_at IS NULL
  AND slug IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- Add UNIQUE constraint on members.slug for parity with shops
-- ============================================================

ALTER TABLE public.members
  ADD CONSTRAINT members_slug_key UNIQUE (slug);
