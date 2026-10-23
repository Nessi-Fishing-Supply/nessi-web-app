'use client';

import { useMemo } from 'react';
import ListingScrollStrip from '@/components/layout/listing-scroll-strip';
import { useRecommendations } from '@/features/listings/hooks/use-recommendations';

type AlsoLikedStripProps = {
  userId: string;
  excludeListingIds?: string[];
};

export default function AlsoLikedStrip({ userId, excludeListingIds }: AlsoLikedStripProps) {
  const { data, isLoading } = useRecommendations({
    context: 'also_liked',
    userId,
  });

  const listings = useMemo(() => {
    const all = data?.listings ?? [];
    if (!excludeListingIds?.length) return all;
    return all.filter((listing) => !excludeListingIds.includes(listing.id));
  }, [data?.listings, excludeListingIds]);

  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <ListingScrollStrip
      title="You Might Also Like"
      listings={listings}
      ariaLabel="Recommendations based on your browsing history"
      isLoading={isLoading}
    />
  );
}
