import { createClient } from '@/libs/supabase/server';
import type { RecentlyViewedItem, RecentlyViewedListingItem } from '../types/recently-viewed';
import type { SellerIdentity } from '@/features/listings/types/listing';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRecentlyViewedServer(
  userId: string,
): Promise<RecentlyViewedListingItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recently_viewed')
    .select(
      '*, listing:listings!inner(id, title, price_cents, cover_photo_url, status, condition, seller_id, shop_id)',
    )
    .eq('user_id', userId)
    .is('listing.deleted_at', null)
    .order('viewed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch recently viewed: ${error.message}`);
  }

  const items = (data ?? []).filter(
    (row) => row.listing && ['active', 'sold'].includes((row.listing as any).status),
  );

  // Collect unique shop_ids and seller_ids for batch fetching
  const shopIds = [
    ...new Set(items.map((i) => (i.listing as any)?.shop_id).filter(Boolean) as string[]),
  ];
  const sellerIds = [
    ...new Set(
      items
        .map((i) => ((i.listing as any)?.shop_id ? null : (i.listing as any)?.seller_id))
        .filter(Boolean) as string[],
    ),
  ];

  // Batch fetch shops
  const shopMap = new Map<
    string,
    {
      shop_name: string;
      avatar_url: string | null;
      slug: string;
      created_at: string;
      is_verified: boolean;
    } & { id: string }
  >();
  if (shopIds.length > 0) {
    const { data: shops } = await supabase
      .from('shops')
      .select('id, shop_name, avatar_url, slug, created_at, is_verified')
      .in('id', shopIds)
      .is('deleted_at', null);
    for (const shop of shops ?? []) {
      shopMap.set(shop.id, shop);
    }
  }

  // Batch fetch members
  const memberMap = new Map<
    string,
    {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      slug: string;
      created_at: string;
      is_seller: boolean;
    } & { id: string }
  >();
  if (sellerIds.length > 0) {
    const { data: members } = await supabase
      .from('members')
      .select('id, first_name, last_name, avatar_url, slug, created_at, is_seller')
      .in('id', sellerIds);
    for (const member of members ?? []) {
      memberMap.set(member.id, member);
    }
  }

  return items.map((row) => {
    const listing = row.listing as any;
    let seller: SellerIdentity | null = null;

    if (listing?.shop_id) {
      const shop = shopMap.get(listing.shop_id);
      if (shop) {
        seller = {
          type: 'shop',
          shop_name: shop.shop_name,
          avatar_url: shop.avatar_url,
          slug: shop.slug,
          created_at: shop.created_at,
          is_verified: shop.is_verified,
        };
      }
    }

    if (!seller && listing?.seller_id) {
      const member = memberMap.get(listing.seller_id);
      if (member) {
        seller = {
          type: 'member',
          first_name: member.first_name,
          last_name: member.last_name,
          avatar_url: member.avatar_url,
          slug: member.slug,
          created_at: member.created_at,
          is_seller: member.is_seller,
        };
      }
    }

    return {
      listingId: row.listing_id,
      viewedAt: row.viewed_at,
      title: listing.title,
      priceCents: listing.price_cents,
      status: listing.status,
      coverPhotoUrl: listing.cover_photo_url,
      condition: listing.condition,
      seller,
    } satisfies RecentlyViewedListingItem;
  });
}

export async function getRecentlyViewedIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recently_viewed')
    .select('listing_id')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch recently viewed IDs: ${error.message}`);
  }

  return (data ?? []).map((row) => row.listing_id);
}

export async function clearRecentlyViewedServer(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('recently_viewed').delete().eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to clear recently viewed: ${error.message}`);
  }
}

export async function mergeGuestViewsServer(
  userId: string,
  items: RecentlyViewedItem[],
): Promise<number> {
  const supabase = await createClient();

  const validItems = items.filter((item) => UUID_REGEX.test(item.listingId));
  if (validItems.length === 0) return 0;

  const { data, error } = await supabase
    .from('recently_viewed')
    .upsert(
      validItems.map((item) => ({
        user_id: userId,
        listing_id: item.listingId,
        viewed_at: item.viewedAt,
      })),
      { onConflict: 'user_id,listing_id' },
    )
    .select('id');

  if (error) {
    throw new Error(`Failed to merge guest views: ${error.message}`);
  }

  return data?.length ?? 0;
}
