import type { Database } from '@/types/database';
import type { ListingPhoto } from './listing-photo';

export type Listing = Database['public']['Tables']['listings']['Row'];

export type ListingInsert = Omit<
  Database['public']['Tables']['listings']['Insert'],
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'view_count'
  | 'favorite_count'
  | 'inquiry_count'
  | 'search_vector'
>;

export type ListingUpdate = Omit<
  Database['public']['Tables']['listings']['Update'],
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'view_count'
  | 'favorite_count'
  | 'inquiry_count'
  | 'search_vector'
>;

export type ListingCondition = Database['public']['Enums']['listing_condition'];

export type ListingCategory = Database['public']['Enums']['listing_category'];

export type ListingStatus = Database['public']['Enums']['listing_status'];

export type ListingWithPhotos = Listing & { listing_photos: ListingPhoto[] };

export type ListingDraft = Partial<ListingInsert>;

export type SellerProfile = {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  slug: string;
  created_at: string;
  is_seller: boolean;
};

export type ShopProfile = {
  shop_name: string;
  avatar_url: string | null;
  slug: string;
  created_at: string;
  is_verified: boolean;
};

export type SellerIdentity =
  | ({ type: 'member' } & SellerProfile)
  | ({ type: 'shop' } & ShopProfile);

export type ListingDetailData = ListingWithPhotos & { seller: SellerIdentity | null };
