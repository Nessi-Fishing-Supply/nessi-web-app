import type { Database } from '@/types/database';

export type ListingPhoto = Database['public']['Tables']['listing_photos']['Row'];

export type ListingPhotoInsert = Omit<
  Database['public']['Tables']['listing_photos']['Insert'],
  'id' | 'created_at'
>;

export type ListingPhotoUpdate = Omit<
  Database['public']['Tables']['listing_photos']['Update'],
  'id' | 'created_at'
>;

export type UploadResult = {
  photo: ListingPhoto;
  url: string;
  thumbnailUrl: string;
};
