-- ============================================================
-- Remove display_name from members
-- Members are identified by first_name + last_name only.
-- Handles auto-generated at registration, immutable for members.
-- Supabase runs each migration file in an implicit transaction.
-- ============================================================

-- Step 1: Backfill any null first_name/last_name from display_name
-- For first_name: take the first word of display_name
UPDATE public.members
SET first_name = COALESCE(first_name, SPLIT_PART(display_name, ' ', 1), 'User')
WHERE first_name IS NULL;

-- For last_name: if display_name has no space (e.g. "BassKing"), use 'Angler' fallback
UPDATE public.members
SET last_name = CASE
  WHEN last_name IS NOT NULL THEN last_name
  WHEN POSITION(' ' IN display_name) > 0
    THEN TRIM(SUBSTRING(display_name FROM POSITION(' ' IN display_name) + 1))
  ELSE 'Angler'
END
WHERE last_name IS NULL;

-- Step 2: Rewrite handle_new_user() to stop referencing display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _first_name TEXT;
  _last_name TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _counter INTEGER := 0;
BEGIN
  _first_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'firstName'), ''), 'User');
  _last_name  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'lastName'), ''), 'Angler');

  -- Generate base slug from first-last name
  _base_slug := LOWER(_first_name || '-' || _last_name);
  _base_slug := REGEXP_REPLACE(_base_slug, '[^a-z0-9]+', '-', 'g');
  _base_slug := TRIM(BOTH '-' FROM _base_slug);

  -- Try clean slug first, then increment on collision
  _slug := _base_slug;
  LOOP
    BEGIN
      INSERT INTO public.members (id, first_name, last_name, slug)
      VALUES (NEW.id, _first_name, _last_name, _slug);

      INSERT INTO public.slugs (slug, entity_type, entity_id)
      VALUES (_slug, 'member', NEW.id);

      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      _counter := _counter + 1;
      IF _counter >= 100 THEN
        RAISE EXCEPTION 'Could not generate unique slug for user % after 100 attempts', NEW.id;
      END IF;
      _slug := _base_slug || '-' || _counter;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Make first_name and last_name NOT NULL
ALTER TABLE public.members ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.members ALTER COLUMN last_name SET NOT NULL;

-- Step 4: Drop the display_name unique index (renamed from profiles_display_name_unique)
DROP INDEX IF EXISTS public.profiles_display_name_unique;
DROP INDEX IF EXISTS public.members_display_name_unique;

-- Step 5: Drop the display_name_length constraint
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS display_name_length;

-- Step 6: Drop the display_name column
ALTER TABLE public.members DROP COLUMN display_name;
