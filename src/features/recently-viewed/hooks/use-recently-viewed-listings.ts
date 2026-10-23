'use client';

import { useQuery } from '@tanstack/react-query';
import { getListingsByIds } from '@/features/listings/services/listing';
import { useRecentlyViewed } from './use-recently-viewed';
import type { ListingWithPhotos } from '@/features/listings/types/listing';

export function useRecentlyViewedListings(): { listings: ListingWithPhotos[]; isLoading: boolean } {
  const { items } = useRecentlyViewed();

  const ids = items.map((item) => item.listingId);
  const sortedIds = [...ids].sort();

  const { data, isLoading } = useQuery({
    queryKey: ['recently-viewed-listings', sortedIds],
    queryFn: () => getListingsByIds(ids),
    enabled: ids.length > 0,
  });

  if (!data || ids.length === 0) {
    return { listings: [], isLoading: ids.length > 0 && isLoading };
  }

  const indexMap = new Map(ids.map((id, index) => [id, index]));
  const listings = [...data].sort((a, b) => {
    const aIndex = indexMap.get(a.id) ?? Infinity;
    const bIndex = indexMap.get(b.id) ?? Infinity;
    return aIndex - bIndex;
  });

  return { listings, isLoading };
}
