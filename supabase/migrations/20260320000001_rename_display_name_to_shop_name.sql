-- Rename column
ALTER TABLE public.profiles RENAME COLUMN display_name TO shop_name;

-- Drop old constraint and index, recreate with new names
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS display_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT shop_name_length CHECK (char_length(shop_name) BETWEEN 3 AND 40);

DROP INDEX IF EXISTS profiles_display_name_unique;
CREATE UNIQUE INDEX profiles_shop_name_unique ON public.profiles (LOWER(shop_name));

-- Update trigger to use shop_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _shop_name TEXT;
  _first_name TEXT;
  _last_name TEXT;
  _base_slug TEXT;
  _slug TEXT;
  _attempt INTEGER := 0;
BEGIN
  _first_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'firstName', '')), '');
  _last_name  := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'lastName', '')), '');
  _shop_name := COALESCE(_first_name, 'User');

  _base_slug := LOWER(_shop_name);
  _base_slug := REGEXP_REPLACE(_base_slug, '[^a-z0-9]+', '-', 'g');
  _base_slug := TRIM(BOTH '-' FROM _base_slug);

  LOOP
    _slug := _base_slug || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    BEGIN
      INSERT INTO public.profiles (id, shop_name, slug, first_name, last_name)
      VALUES (NEW.id, _shop_name, _slug, _first_name, _last_name);
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
