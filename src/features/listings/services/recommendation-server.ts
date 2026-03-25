import { createClient } from '@/libs/supabase/server';
import { CONDITION_TIERS } from '@/features/listings/constants/condition';
import { getRecentlyViewedIds } from '@/features/recently-viewed/services/recently-viewed-server';
import type {
  ListingWithPhotos,
  ListingCategory,
  ListingCondition,
} from '@/features/listings/types/listing';
import type {
  SimilarParams,
  SellerParams,
  AlsoLikedParams,
} from '@/features/listings/types/recommendation';

async function getSimilarListings(params: SimilarParams): Promise<ListingWithPhotos[]> {
  const { listingId, category, condition, excludeListingId } = params;

  const conditionIndex = CONDITION_TIERS.findIndex((tier) => tier.value === condition);
  const adjacentConditions = CONDITION_TIERS.slice(
    Math.max(0, conditionIndex - 1),
    Math.min(CONDITION_TIERS.length, conditionIndex + 2),
  ).map((tier) => tier.value);

  const supabase = await createClient();
  let query = supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('category', category as ListingCategory)
    .eq('status', 'active')
    .is('deleted_at', null)
    .neq('id', listingId)
    .in('condition', adjacentConditions as ListingCondition[])
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .limit(12);

  if (excludeListingId && excludeListingId !== listingId) {
    query = query.neq('id', excludeListingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch similar listings: ${error.message}`);
  }

  return (data ?? []) as ListingWithPhotos[];
}

async function getSellerListings(params: SellerParams): Promise<ListingWithPhotos[]> {
  const { sellerId, shopId, excludeListingId } = params;

  const supabase = await createClient();
  let query = supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .limit(12);

  if (shopId) {
    query = query.eq('shop_id', shopId);
  } else {
    query = query.eq('seller_id', sellerId);
  }

  if (excludeListingId) {
    query = query.neq('id', excludeListingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch seller listings: ${error.message}`);
  }

  return (data ?? []) as ListingWithPhotos[];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAlsoLikedListings(params: AlsoLikedParams): Promise<ListingWithPhotos[]> {
  const { listingIds, userId } = params;

  let resolvedIds: string[] = (listingIds ?? []).filter((id) => UUID_REGEX.test(id));

  if (userId) {
    const dbIds = await getRecentlyViewedIds(userId);
    if (dbIds.length > 0) {
      resolvedIds = dbIds;
    }
  }

  if (resolvedIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data: sourcedListings, error: sourcedError } = await supabase
    .from('listings')
    .select('category')
    .in('id', resolvedIds)
    .is('deleted_at', null);

  if (sourcedError) {
    throw new Error(`Failed to fetch source listing categories: ${sourcedError.message}`);
  }

  const categories = [...new Set((sourcedListings ?? []).map((l) => l.category))];

  if (categories.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_photos(*)')
    .in('category', categories)
    .eq('status', 'active')
    .is('deleted_at', null)
    .not('id', 'in', `(${resolvedIds.join(',')})`)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_photos', ascending: true })
    .limit(12);

  if (error) {
    throw new Error(`Failed to fetch also liked listings: ${error.message}`);
  }

  return (data ?? []) as ListingWithPhotos[];
}

export async function getRecommendationsServer(
  params: SimilarParams | SellerParams | AlsoLikedParams,
): Promise<ListingWithPhotos[]> {
  switch (params.context) {
    case 'similar':
      return getSimilarListings(params);
    case 'seller':
      return getSellerListings(params);
    case 'also_liked':
      return getAlsoLikedListings(params);
  }
}
