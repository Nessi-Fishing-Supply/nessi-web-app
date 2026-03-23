import type { CartItemWithListing, CartSellerGroup } from '@/features/cart/types/cart';

export function groupCartBySeller(items: CartItemWithListing[]): CartSellerGroup[] {
  if (items.length === 0) return [];

  const groups = new Map<string, CartSellerGroup>();

  for (const item of items) {
    const key = item.listing.shop_id
      ? `shop:${item.listing.shop_id}`
      : item.listing.seller_id
        ? `member:${item.listing.seller_id}`
        : 'unknown';

    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      existing.subtotalCents += item.listing.price_cents;
    } else {
      groups.set(key, {
        seller: item.seller,
        items: [item],
        subtotalCents: item.listing.price_cents,
      });
    }
  }

  return Array.from(groups.values());
}
