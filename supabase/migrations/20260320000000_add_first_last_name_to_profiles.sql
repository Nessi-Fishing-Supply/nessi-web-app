-- Add first_name and last_name columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- Backfill existing profiles from auth.users metadata
UPDATE public.profiles p
SET
  first_name = NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'firstName', '')), ''),
  last_name  = NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'lastName', '')), '')
FROM auth.users u
WHERE p.id = u.id;

-- Update trigger to also copy first_name and last_name on signup
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
      INSERT INTO public.profiles (id, display_name, slug, first_name, last_name)
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
