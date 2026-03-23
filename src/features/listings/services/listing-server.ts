import { createClient } from '@/libs/supabase/server';
import type {
  ListingDetailData,
  ListingWithPhotos,
  SellerIdentity,
} from '@/features/listings/types/listing';

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

export async function getListingWithSellerServer(id: string): Promise<ListingDetailData | null> {
  const supabase = await createClient();
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .single();

  if (listingError || !listing) return null;

  let seller: SellerIdentity | null = null;

  if (listing.shop_id) {
    const { data: shop } = await supabase
      .from('shops')
      .select('shop_name, avatar_url, slug, created_at, is_verified')
      .eq('id', listing.shop_id)
      .is('deleted_at', null)
      .single();

    if (shop) {
      seller = { type: 'shop', ...shop };
    }
  }

  if (!seller) {
    const { data: member } = await supabase
      .from('members')
      .select('first_name, last_name, avatar_url, slug, created_at, is_seller')
      .eq('id', listing.seller_id)
      .single();

    if (member) {
      seller = { type: 'member', ...member };
    }
  }

  return { ...(listing as ListingWithPhotos), seller };
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
