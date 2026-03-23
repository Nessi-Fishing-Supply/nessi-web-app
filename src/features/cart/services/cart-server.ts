import { createClient } from '@/libs/supabase/server';
import type {
  CartItem,
  CartItemWithListing,
  CartValidationResult,
  GuestCartItem,
} from '@/features/cart/types/cart';
import type { SellerIdentity } from '@/features/listings/types/listing';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CART_SIZE = 25;
const EXPIRY_DAYS = 30;

// ---------- Read operations ----------

export async function getCartServer(userId: string): Promise<CartItemWithListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cart_items')
    .select(
      '*, listing:listings(title, price_cents, cover_photo_url, status, seller_id, member_id, shop_id, condition, listing_photos(*))',
    )
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch cart: ${error.message}`);
  }

  const items = (data ?? []) as Omit<CartItemWithListing, 'seller'>[];

  // Collect unique shop_ids and seller_ids for batch fetching
  const shopIds = [...new Set(items.map((i) => i.listing?.shop_id).filter(Boolean) as string[])];
  const sellerIds = [
    ...new Set(
      items
        .map((i) => (i.listing?.shop_id ? null : i.listing?.seller_id))
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

  // Attach seller identity to each cart item
  return items.map((item) => {
    let seller: SellerIdentity | null = null;

    if (item.listing?.shop_id) {
      const shop = shopMap.get(item.listing.shop_id);
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

    if (!seller && item.listing?.seller_id) {
      const member = memberMap.get(item.listing.seller_id);
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

    return { ...item, seller } as CartItemWithListing;
  });
}

export async function getCartCountServer(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('cart_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch cart count: ${error.message}`);
  }

  return count ?? 0;
}

// ---------- Write operations ----------

export async function addToCartServer(
  userId: string,
  listingId: string,
  _priceCents: number,
  addedFrom?: string,
): Promise<CartItem> {
  const supabase = await createClient();

  // 1. Fetch listing — must exist and be active
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, price_cents, status, seller_id, shop_id')
    .eq('id', listingId)
    .is('deleted_at', null)
    .single();

  if (listingError || !listing) {
    throw new Error('Listing not found or no longer active');
  }

  if (listing.status !== 'active') {
    throw new Error('Listing not found or no longer active');
  }

  // 2. Cannot add own member listing (shop listings are purchasable by the shop owner)
  if (listing.seller_id === userId && !listing.shop_id) {
    throw new Error('Cannot add your own listing to cart');
  }

  // 3. Check for duplicate (better error than DB unique constraint)
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existing) {
    throw new Error('Item already in cart');
  }

  // 4. Cart size cap
  const currentCount = await getCartCountServer(userId);
  if (currentCount >= MAX_CART_SIZE) {
    throw new Error('Cart is full (maximum 25 items)');
  }

  // 5. Insert with price snapshotted from DB (ignore client-provided price)
  const { data: inserted, error: insertError } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      listing_id: listingId,
      price_at_add: listing.price_cents,
      added_from: addedFrom ?? null,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to add item to cart: ${insertError?.message}`);
  }

  return inserted as CartItem;
}

export async function removeFromCartServer(userId: string, cartItemId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Cart item not found');
  }
}

export async function clearCartServer(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to clear cart: ${error.message}`);
  }
}

export async function refreshExpiryServer(userId: string, cartItemId: string): Promise<CartItem> {
  const supabase = await createClient();
  const newExpiry = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('cart_items')
    .update({ expires_at: newExpiry })
    .eq('id', cartItemId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Cart item not found');
  }

  return data as CartItem;
}

// ---------- Validation & merge ----------

export async function validateCartServer(userId: string): Promise<CartValidationResult> {
  const items = await getCartServer(userId);

  const result: CartValidationResult = {
    valid: [],
    removed: [],
    priceChanged: [],
  };

  for (const item of items) {
    const { listing } = item;

    if (!listing) {
      result.removed.push({ item, reason: 'deleted' });
      continue;
    }

    if (listing.status === 'sold') {
      result.removed.push({ item, reason: 'sold' });
      continue;
    }

    if (listing.status !== 'active') {
      result.removed.push({ item, reason: 'deactivated' });
      continue;
    }

    if (item.price_at_add !== listing.price_cents) {
      result.priceChanged.push({
        item,
        oldPrice: item.price_at_add,
        newPrice: listing.price_cents,
      });
      continue;
    }

    result.valid.push(item);
  }

  return result;
}

export async function mergeGuestCartServer(
  userId: string,
  guestItems: GuestCartItem[],
): Promise<number> {
  const supabase = await createClient();
  let mergedCount = 0;

  // Get current cart count to enforce cap across the merge
  let currentCount = await getCartCountServer(userId);

  for (const guestItem of guestItems) {
    // Validate UUID format
    if (!UUID_REGEX.test(guestItem.listingId)) {
      continue;
    }

    // Enforce cart cap
    if (currentCount >= MAX_CART_SIZE) {
      break;
    }

    // Fetch listing from DB — ignore guest-provided price
    const { data: listing } = await supabase
      .from('listings')
      .select('id, price_cents, status, seller_id')
      .eq('id', guestItem.listingId)
      .is('deleted_at', null)
      .single();

    if (!listing || listing.status !== 'active') {
      continue;
    }

    // Skip own listings
    if (listing.seller_id === userId) {
      continue;
    }

    // Skip duplicates
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', guestItem.listingId)
      .maybeSingle();

    if (existing) {
      continue;
    }

    // Insert with DB-snapshotted price
    const { error: insertError } = await supabase.from('cart_items').insert({
      user_id: userId,
      listing_id: guestItem.listingId,
      price_at_add: listing.price_cents,
      added_from: guestItem.addedFrom ?? null,
    });

    if (!insertError) {
      mergedCount++;
      currentCount++;
    }
  }

  return mergedCount;
}
