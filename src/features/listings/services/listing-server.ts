import { createClient } from '@/libs/supabase/server';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

export async function getListingByIdServer(id: string): Promise<ListingWithPhotos | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .single();

  if (error || !data) return null;
  return data as ListingWithPhotos;
}

export async function getListingsByMemberServer(memberId: string): Promise<ListingWithPhotos[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_photos', ascending: true });

  if (error) {
    throw new Error(`Failed to fetch listings by member: ${error.message}`);
  }

  return (data ?? []) as ListingWithPhotos[];
}

export async function getListingsByShopServer(shopId: string): Promise<ListingWithPhotos[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('shop_id', shopId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_photos', ascending: true });

  if (error) {
    throw new Error(`Failed to fetch listings by shop: ${error.message}`);
  }

  return (data ?? []) as ListingWithPhotos[];
}

export async function getActiveListingsServer(): Promise<ListingWithPhotos[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_photos', ascending: true });

  if (error) {
    throw new Error(`Failed to fetch active listings: ${error.message}`);
  }

  return (data ?? []) as ListingWithPhotos[];
}
