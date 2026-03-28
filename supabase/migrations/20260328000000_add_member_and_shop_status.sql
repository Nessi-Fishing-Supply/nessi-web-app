-- ============================================================
-- Migration: add_member_and_shop_status
-- Created: 2026-03-28
-- Purpose: Add formal status enums to members and shops tables
--          so lifecycle state machines can be extracted.
-- ============================================================

-- ============================================================
-- Member status
-- ============================================================

CREATE TYPE public.member_status AS ENUM (
  'onboarding',
  'active',
  'suspended',
  'deleted'
);

ALTER TABLE public.members
  ADD COLUMN status public.member_status NOT NULL DEFAULT 'onboarding';

-- Backfill existing members based on current implicit states
UPDATE public.members SET status = 'deleted'    WHERE deleted_at IS NOT NULL;
UPDATE public.members SET status = 'active'     WHERE deleted_at IS NULL AND onboarding_completed_at IS NOT NULL;
UPDATE public.members SET status = 'onboarding' WHERE deleted_at IS NULL AND onboarding_completed_at IS NULL;

CREATE INDEX members_status_idx ON public.members (status);

-- ============================================================
-- Shop status
-- ============================================================

CREATE TYPE public.shop_status AS ENUM (
  'active',
  'suspended',
  'archived',
  'deleted'
);

ALTER TABLE public.shops
  ADD COLUMN status public.shop_status NOT NULL DEFAULT 'active';

-- Backfill existing shops based on current implicit states
UPDATE public.shops SET status = 'deleted' WHERE deleted_at IS NOT NULL;
UPDATE public.shops SET status = 'active'  WHERE deleted_at IS NULL;

CREATE INDEX shops_status_idx ON public.shops (status);
