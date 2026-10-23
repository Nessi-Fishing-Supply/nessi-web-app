-- ============================================================
-- Migration: rename_profiles_to_members
-- Created: 2026-03-20
-- ============================================================

-- 1. Rename table
ALTER TABLE public.profiles RENAME TO members;

-- 2. Rename column
ALTER TABLE public.members RENAME COLUMN shop_name TO display_name;

-- 3. Rename constraints
-- DROP and recreate display_name_length because the CHECK body references the column name
ALTER TABLE public.members DROP CONSTRAINT shop_name_length;
ALTER TABLE public.members ADD CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 3 AND 40);
-- bio_length and slug_format are left as-is (they do not reference shop_name/display_name)

-- 4. Rename indexes
ALTER INDEX profiles_shop_name_unique RENAME TO members_display_name_unique;
ALTER INDEX profiles_slug_unique RENAME TO members_slug_unique;
ALTER INDEX profiles_home_state_idx RENAME TO members_home_state_idx;
ALTER INDEX profiles_is_seller_idx RENAME TO members_is_seller_idx;

-- 5. Drop old triggers first (must happen before dropping the old function they reference)
DROP TRIGGER IF EXISTS on_profiles_updated_at ON public.members;
DROP TRIGGER IF EXISTS on_profiles_system_fields ON public.members;

-- 6. Replace trigger function handle_profiles_system_fields → handle_members_system_fields
CREATE OR REPLACE FUNCTION public.handle_members_system_fields()
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

DROP FUNCTION IF EXISTS public.handle_profiles_system_fields();

-- 7. Recreate triggers with new names
CREATE TRIGGER on_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_members_system_fields
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.handle_members_system_fields();

-- 8. Replace handle_new_user() to use members table and display_name column
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

-- 9. Drop and recreate RLS policies with new names
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.members;
CREATE POLICY "Members are viewable by everyone"
  ON public.members FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.members;
CREATE POLICY "Users can insert own member row"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.members;
CREATE POLICY "Users can update own member row"
  ON public.members FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
