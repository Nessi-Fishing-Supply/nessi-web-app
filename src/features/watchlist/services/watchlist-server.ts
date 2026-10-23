import { createClient } from '@/libs/supabase/server';
import type { Watcher, WatchStatus, WatchedListing } from '@/features/watchlist/types/watcher';

export async function addWatcherServer(userId: string, listingId: string): Promise<Watcher> {
  const supabase = await createClient();

  const { data: watcher, error } = await supabase
    .from('watchers')
    .insert({ user_id: userId, listing_id: listingId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: fetchError } = await supabase
        .from('watchers')
        .select()
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .single();

      if (fetchError || !existing) {
        throw new Error(`Failed to fetch existing watcher: ${fetchError?.message}`);
      }

      return existing as Watcher;
    }
    throw new Error(`Failed to add watcher: ${error.message}`);
  }

  return watcher as Watcher;
}

export async function removeWatcherServer(
  userId: string,
  listingId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watchers')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .select();

  if (error) {
    throw new Error(`Failed to remove watcher: ${error.message}`);
  }

  return { success: Array.isArray(data) && data.length > 0 };
}

export async function getWatchStatusServer(
  userId: string,
  listingId: string,
): Promise<WatchStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watchers')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get watch status: ${error.message}`);
  }

  return { is_watching: !!data };
}

export async function getWatchedListingsServer(userId: string): Promise<WatchedListing[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('watchers')
    .select('watched_at, listings(*, listing_photos(*))')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get watched listings: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const results: WatchedListing[] = [];

  for (const row of data) {
    const listing = row.listings;
    if (!listing || listing.deleted_at !== null) continue;
    results.push({
      ...listing,
      listing_photos: listing.listing_photos ?? [],
      watched_at: row.watched_at,
    } as WatchedListing);
  }

  return results;
}
