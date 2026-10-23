-- Migration: watchers and price_drop_notifications tables

-- 1. Create watchers table
CREATE TABLE IF NOT EXISTS public.watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  watched_at timestamptz NOT NULL DEFAULT now(),
  last_notified_price_cents integer,
  CONSTRAINT watchers_listing_user_unique UNIQUE (listing_id, user_id)
);

-- 2. Create price_drop_notifications table
CREATE TABLE IF NOT EXISTS public.price_drop_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price_cents integer NOT NULL,
  new_price_cents integer NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS watchers_user_id_idx ON public.watchers(user_id);
CREATE INDEX IF NOT EXISTS price_drop_notifications_processed_created_at_idx
  ON public.price_drop_notifications(processed, created_at);

-- 4. Trigger function: update_watcher_count (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_watcher_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings
    SET watcher_count = watcher_count + 1
    WHERE id = NEW.listing_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.listings
    SET watcher_count = GREATEST(0, watcher_count - 1)
    WHERE id = OLD.listing_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger on watchers
DROP TRIGGER IF EXISTS watchers_update_count ON public.watchers;
CREATE TRIGGER watchers_update_count
  AFTER INSERT OR DELETE ON public.watchers
  FOR EACH ROW EXECUTE FUNCTION public.update_watcher_count();

-- 5. Trigger function: detect_price_drop (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.detect_price_drop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price_cents < OLD.price_cents THEN
    INSERT INTO public.price_drop_notifications (listing_id, old_price_cents, new_price_cents)
    VALUES (NEW.id, OLD.price_cents, NEW.price_cents);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on listings for price drops
DROP TRIGGER IF EXISTS listings_detect_price_drop ON public.listings;
CREATE TRIGGER listings_detect_price_drop
  AFTER UPDATE OF price_cents ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.detect_price_drop();

-- 6. RLS on watchers
ALTER TABLE public.watchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watchers_select_own" ON public.watchers;
CREATE POLICY "watchers_select_own"
  ON public.watchers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "watchers_insert_own" ON public.watchers;
CREATE POLICY "watchers_insert_own"
  ON public.watchers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "watchers_delete_own" ON public.watchers;
CREATE POLICY "watchers_delete_own"
  ON public.watchers
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 7. RLS on price_drop_notifications (service_role only)
ALTER TABLE public.price_drop_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_drop_notifications_service_role_select" ON public.price_drop_notifications;
CREATE POLICY "price_drop_notifications_service_role_select"
  ON public.price_drop_notifications
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "price_drop_notifications_service_role_update" ON public.price_drop_notifications;
CREATE POLICY "price_drop_notifications_service_role_update"
  ON public.price_drop_notifications
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
