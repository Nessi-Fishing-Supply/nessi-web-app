-- Fix: listings.seller_id ON DELETE RESTRICT blocks member deletion.
-- Change to SET NULL so listings are soft-orphaned (already soft-deleted by API layer)
-- rather than blocking the entire cascade chain.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_seller_id_fkey;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.members(id)
  ON DELETE SET NULL;

-- Also fix member_id FK if it exists
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_member_id_fkey;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id)
  ON DELETE SET NULL;
