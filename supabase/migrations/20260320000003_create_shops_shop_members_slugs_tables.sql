-- ============================================================
-- Migration: create_shops_shop_members_slugs_tables
-- Created: 2026-03-20
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

-- shops
CREATE TABLE public.shops (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  shop_name                TEXT NOT NULL,
  slug                     TEXT UNIQUE NOT NULL,
  avatar_url               TEXT,
  description              TEXT,
  hero_banner_url          TEXT,
  brand_colors             JSONB,
  is_verified              BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_tier        TEXT NOT NULL DEFAULT 'basic',
  subscription_status      TEXT NOT NULL DEFAULT 'active',
  stripe_account_id        TEXT,
  is_stripe_connected      BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_onboarding_status TEXT NOT NULL DEFAULT 'not_started',
  stripe_subscription_id   TEXT,
  average_rating           NUMERIC(3,2),
  review_count             INTEGER NOT NULL DEFAULT 0,
  total_transactions       INTEGER NOT NULL DEFAULT 0,
  deleted_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shop_members
CREATE TABLE public.shop_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, member_id)
);

-- slugs
CREATE TABLE public.slugs (
  slug         TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Constraints
-- ============================================================

ALTER TABLE public.shops ADD CONSTRAINT shop_name_length
  CHECK (char_length(shop_name) BETWEEN 3 AND 60);

ALTER TABLE public.shops ADD CONSTRAINT slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');

ALTER TABLE public.shops ADD CONSTRAINT subscription_tier_check
  CHECK (subscription_tier IN ('basic', 'premium'));

ALTER TABLE public.shops ADD CONSTRAINT subscription_status_check
  CHECK (subscription_status IN ('active', 'past_due', 'cancelled', 'trialing'));

ALTER TABLE public.shop_members ADD CONSTRAINT shop_members_role_check
  CHECK (role IN ('owner', 'admin', 'contributor'));

ALTER TABLE public.slugs ADD CONSTRAINT slugs_entity_type_check
  CHECK (entity_type IN ('member', 'shop'));

-- ============================================================
-- Indexes
-- ============================================================

-- shops
CREATE INDEX shops_owner_id_idx ON public.shops (owner_id);
CREATE INDEX shops_is_verified_idx ON public.shops (is_verified) WHERE is_verified = TRUE;
CREATE INDEX shops_subscription_tier_idx ON public.shops (subscription_tier);

-- shop_members
CREATE UNIQUE INDEX shop_members_one_owner_per_shop ON public.shop_members (shop_id) WHERE role = 'owner';
CREATE INDEX shop_members_member_id_idx ON public.shop_members (member_id);

-- slugs
CREATE UNIQUE INDEX slugs_entity_lookup ON public.slugs (entity_type, entity_id);

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER on_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_slug(
  p_slug        TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID
) RETURNS void AS $$
BEGIN
  -- Validate slug format
  IF p_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
    RAISE EXCEPTION 'Invalid slug format: %', p_slug;
  END IF;

  -- Validate entity_type
  IF p_entity_type NOT IN ('member', 'shop') THEN
    RAISE EXCEPTION 'Invalid entity_type: %. Must be ''member'' or ''shop''.', p_entity_type;
  END IF;

  -- Release any existing slug for this entity
  DELETE FROM public.slugs
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  -- Claim the new slug (raises unique_violation if already taken)
  INSERT INTO public.slugs (slug, entity_type, entity_id)
  VALUES (p_slug, p_entity_type, p_entity_id);

  -- Update the entity's own slug column
  IF p_entity_type = 'member' THEN
    UPDATE public.members SET slug = p_slug WHERE id = p_entity_id;
  ELSIF p_entity_type = 'shop' THEN
    UPDATE public.shops SET slug = p_slug WHERE id = p_entity_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_slug_available(
  p_slug TEXT
) RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM public.slugs WHERE slug = p_slug);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.release_slug(
  p_entity_type TEXT,
  p_entity_id   UUID
) RETURNS void AS $$
BEGIN
  DELETE FROM public.slugs
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Update handle_new_user() to also insert into slugs
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _display_name TEXT;
  _first_name TEXT;
  _last_name TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _attempt INTEGER := 0;
BEGIN
  _first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'firstName', '')), '');
  _last_name  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'lastName', '')), '');
  _display_name := COALESCE(_first_name, 'User');

  _base_slug := LOWER(_display_name);
  _base_slug := REGEXP_REPLACE(_base_slug, '[^a-z0-9]+', '-', 'g');
  _base_slug := TRIM(BOTH '-' FROM _base_slug);

  LOOP
    _slug := _base_slug || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    BEGIN
      INSERT INTO public.members (id, display_name, slug, first_name, last_name)
      VALUES (NEW.id, _display_name, _slug, _first_name, _last_name);

      INSERT INTO public.slugs (slug, entity_type, entity_id)
      VALUES (_slug, 'member', NEW.id);

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

-- ============================================================
-- Backfill slugs for existing members
-- ============================================================

INSERT INTO public.slugs (slug, entity_type, entity_id)
SELECT slug, 'member', id FROM public.members
ON CONFLICT DO NOTHING;

-- ============================================================
-- Row Level Security: shops
-- ============================================================

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Shops are viewable by everyone
CREATE POLICY "Shops are viewable by everyone"
  ON public.shops FOR SELECT
  TO authenticated, anon
  USING (true);

-- Users can create own shops
CREATE POLICY "Users can create own shops"
  ON public.shops FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- Shop owner or admin can update shop
CREATE POLICY "Shop owner or admin can update shop"
  ON public.shops FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_members
      WHERE shop_id = shops.id
        AND member_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
  );

-- Only shop owner can delete shop
CREATE POLICY "Only shop owner can delete shop"
  ON public.shops FOR DELETE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- ============================================================
-- Row Level Security: shop_members
-- ============================================================

ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;

-- Shop members can view co-members
CREATE POLICY "Shop members can view co-members"
  ON public.shop_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_members sm
      WHERE sm.shop_id = shop_members.shop_id
        AND sm.member_id = (SELECT auth.uid())
    )
  );

-- Only shop owner can add members
CREATE POLICY "Only shop owner can add members"
  ON public.shop_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = shop_id
        AND owner_id = (SELECT auth.uid())
    )
  );

-- Only shop owner can update member roles
CREATE POLICY "Only shop owner can update member roles"
  ON public.shop_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = shop_members.shop_id
        AND owner_id = (SELECT auth.uid())
    )
  );

-- Only shop owner can remove members
CREATE POLICY "Only shop owner can remove members"
  ON public.shop_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = shop_members.shop_id
        AND owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- Row Level Security: slugs
-- ============================================================

ALTER TABLE public.slugs ENABLE ROW LEVEL SECURITY;

-- Slugs are viewable by everyone
CREATE POLICY "Slugs are viewable by everyone"
  ON public.slugs FOR SELECT
  TO authenticated, anon
  USING (true);
