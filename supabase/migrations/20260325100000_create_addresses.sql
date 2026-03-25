-- ============================================================
-- Migration: create_addresses
-- Created: 2026-03-25
-- Creates the addresses table with RLS, indexes, and triggers
-- that enforce a 5-address limit and a single default per user.
-- ============================================================

-- ============================================================
-- Step 1: Create addresses table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  line1       TEXT        NOT NULL,
  line2       TEXT,
  city        TEXT        NOT NULL,
  state       TEXT        NOT NULL,
  zip         TEXT        NOT NULL,
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT addresses_user_label_unique UNIQUE (user_id, label)
);

-- ============================================================
-- Step 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON public.addresses (user_id);

-- ============================================================
-- Step 3: Enable RLS
-- ============================================================

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: RLS policies
-- ============================================================

-- SELECT: users can read their own addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "Users can view own addresses"
  ON public.addresses FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- INSERT: users can add their own addresses
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
CREATE POLICY "Users can insert own addresses"
  ON public.addresses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: users can update their own addresses
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses"
  ON public.addresses FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: users can delete their own addresses
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses"
  ON public.addresses FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- Step 5: Trigger function — enforce max 5 addresses per user
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_max_addresses()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.addresses
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'User may not have more than 5 addresses';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- Step 6: Trigger — max addresses check on INSERT
-- ============================================================

DROP TRIGGER IF EXISTS on_address_insert_limit ON public.addresses;
CREATE TRIGGER on_address_insert_limit
  BEFORE INSERT ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_addresses();

-- ============================================================
-- Step 7: Trigger function — ensure only one default per user
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_single_default()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- Step 8: Trigger — single default check on INSERT OR UPDATE
-- ============================================================

DROP TRIGGER IF EXISTS on_address_ensure_single_default ON public.addresses;
CREATE TRIGGER on_address_ensure_single_default
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default();

-- ============================================================
-- Step 9: Trigger function — auto-update updated_at on UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_addresses_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- Step 10: Trigger — updated_at on UPDATE
-- ============================================================

DROP TRIGGER IF EXISTS on_address_updated_at ON public.addresses;
CREATE TRIGGER on_address_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_addresses_updated_at();
