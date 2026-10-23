-- ============================================================
-- Migration: create_shop_invites
-- Issue: #250
-- Created: 2026-03-25
--
-- Creates invite_status enum and shop_invites table with
-- RLS policies for email-based shop invitations.
-- ============================================================

-- ============================================================
-- 1. Create invite_status enum
-- ============================================================

CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- ============================================================
-- 2. Create shop_invites table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shop_invites (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role_id    UUID        NOT NULL REFERENCES public.shop_roles(id) ON DELETE RESTRICT,
  token      UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status     public.invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- ============================================================
-- 3. Create indexes
-- ============================================================

-- For listing invites per shop
CREATE INDEX IF NOT EXISTS shop_invites_shop_id_idx
  ON public.shop_invites (shop_id);

-- For checking existing invites during registration
CREATE INDEX IF NOT EXISTS shop_invites_email_idx
  ON public.shop_invites (email);

-- Prevent duplicate pending invites for the same shop + email
CREATE UNIQUE INDEX IF NOT EXISTS shop_invites_pending_unique
  ON public.shop_invites (shop_id, email)
  WHERE status = 'pending';

-- ============================================================
-- 4. Enable RLS and create SELECT policy
-- ============================================================

ALTER TABLE public.shop_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members can view their shop invites"
  ON public.shop_invites FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT sm.shop_id FROM public.shop_members sm
      WHERE sm.member_id = (SELECT auth.uid())
    )
  );
