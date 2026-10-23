import type { Database } from '@/types/database';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

export type Watcher = Database['public']['Tables']['watchers']['Row'];

export type WatcherInsert = Omit<
  Database['public']['Tables']['watchers']['Insert'],
  'id' | 'watched_at'
>;

export type WatchStatus = { is_watching: boolean };

export type WatchedListing = ListingWithPhotos & { watched_at: string };

export type PriceDropNotification = Database['public']['Tables']['price_drop_notifications']['Row'];
