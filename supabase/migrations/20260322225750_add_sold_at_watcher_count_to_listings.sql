ALTER TABLE public.listings ADD COLUMN sold_at timestamptz NULL;
ALTER TABLE public.listings ADD COLUMN watcher_count integer NOT NULL DEFAULT 0;
