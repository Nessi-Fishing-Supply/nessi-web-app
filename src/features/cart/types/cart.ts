import type { Database } from '@/types/database';
import type { Listing } from '@/features/listings/types/listing';
import type { ListingPhoto } from '@/features/listings/types/listing-photo';

export type CartItem = Database['public']['Tables']['cart_items']['Row'];

export type CartItemInsert = Omit<
  Database['public']['Tables']['cart_items']['Insert'],
  'id' | 'added_at' | 'expires_at'
>;

export type CartItemWithListing = CartItem & {
  listing: Pick<
    Listing,
    'title' | 'price_cents' | 'cover_photo_url' | 'status' | 'seller_id' | 'member_id' | 'shop_id'
  > & {
    listing_photos: ListingPhoto[];
  };
};

export type GuestCartItem = {
  listingId: string;
  priceAtAdd: number;
  addedAt: string;
  addedFrom?: string;
};

export type CartValidationResult = {
  valid: CartItemWithListing[];
  removed: {
    item: CartItemWithListing;
    reason: 'sold' | 'deleted' | 'expired' | 'deactivated';
  }[];
  priceChanged: {
    item: CartItemWithListing;
    oldPrice: number;
    newPrice: number;
  }[];
};
