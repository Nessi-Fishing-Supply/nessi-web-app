-- ============================================================
-- Migration: create_profiles_table
-- Created: 2026-03-19
-- ============================================================

-- Table
CREATE TABLE profiles (
  -- Identity
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT NOT NULL,
  slug               TEXT NOT NULL,
  avatar_url         TEXT,
  bio                TEXT,

  -- Fishing identity
  primary_species    TEXT[] NOT NULL DEFAULT '{}',
  primary_technique  TEXT[] NOT NULL DEFAULT '{}',
  home_state         CHAR(2),
  years_fishing      INTEGER,

  -- Seller status
  is_seller              BOOLEAN NOT NULL DEFAULT FALSE,
  is_stripe_connected    BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_account_id      TEXT,
  stripe_onboarding_status TEXT NOT NULL DEFAULT 'not_started',

  -- Reputation (denormalized, updated by triggers on reviews/orders)
  average_rating         NUMERIC(3,2),
  review_count           INTEGER NOT NULL DEFAULT 0,
  total_transactions     INTEGER NOT NULL DEFAULT 0,

  -- Activity
  last_seen_at           TIMESTAMPTZ,
  response_time_hours    NUMERIC(5,1),

  -- Onboarding & lifecycle
  onboarding_completed_at  TIMESTAMPTZ,
  deleted_at               TIMESTAMPTZ,

  -- Preferences
  notification_preferences JSONB NOT NULL DEFAULT '{"email":{"orders":true,"messages":true,"price_drops":true,"marketing":false}}',

  -- Timestamps
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX profiles_display_name_unique ON profiles (LOWER(display_name));
CREATE UNIQUE INDEX profiles_slug_unique ON profiles (slug);
CREATE INDEX profiles_home_state_idx ON profiles (home_state);
CREATE INDEX profiles_is_seller_idx ON profiles (is_seller) WHERE is_seller = TRUE;

-- Constraints
ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 3 AND 40);
ALTER TABLE profiles ADD CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 280);
ALTER TABLE profiles ADD CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');

-- Trigger Functions

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _display_name TEXT;
  _base_slug    TEXT;
  _slug         TEXT;
  _attempt      INTEGER := 0;
BEGIN
  _display_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), 'User');

  _base_slug := LOWER(_display_name);
  _base_slug := REGEXP_REPLACE(_base_slug, '[^a-z0-9]+', '-', 'g');
  _base_slug := TRIM(BOTH '-' FROM _base_slug);

  LOOP
    _slug := _base_slug || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    BEGIN
      INSERT INTO public.profiles (id, display_name, slug)
      VALUES (NEW.id, _display_name, _slug);
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      _attempt := _attempt + 1;
      IF _attempt >= 5 THEN
        RAISE EXCEPTION 'Could not generate a unique slug for user % after 5 attempts', NEW.id;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_profiles_system_fields()
RETURNS trigger AS $$
BEGIN
  NEW.stripe_account_id        := OLD.stripe_account_id;
  NEW.is_stripe_connected      := OLD.is_stripe_connected;
  NEW.stripe_onboarding_status := OLD.stripe_onboarding_status;
  NEW.average_rating           := OLD.average_rating;
  NEW.review_count             := OLD.review_count;
  NEW.total_transactions       := OLD.total_transactions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_profiles_system_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profiles_system_fields();

-- ============================================================
-- Row Level Security: profiles
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (public marketplace)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can insert only their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- Authenticated users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- Row Level Security: products
-- ============================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view products (public marketplace)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can insert their own products
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only update their own products
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only delete their own products
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- Row Level Security: product_images
-- ============================================================

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images (follows product visibility)
CREATE POLICY "Product images are viewable by everyone"
  ON product_images FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can insert images for their own products
CREATE POLICY "Users can insert images for own products"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id
      AND products.user_id = (SELECT auth.uid())
    )
  );

-- Users can update images for their own products
CREATE POLICY "Users can update images for own products"
  ON product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id
      AND products.user_id = (SELECT auth.uid())
    )
  );

-- Users can delete images for their own products
CREATE POLICY "Users can delete images for own products"
  ON product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id
      AND products.user_id = (SELECT auth.uid())
    )
  );
