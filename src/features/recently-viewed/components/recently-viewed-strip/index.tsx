'use client';

import ListingScrollStrip from '@/components/layout/listing-scroll-strip';
import { useRecentlyViewedListings } from '@/features/recently-viewed/hooks/use-recently-viewed-listings';

export default function RecentlyViewedStrip() {
  const { listings, isLoading } = useRecentlyViewedListings();

  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <ListingScrollStrip
      title="Recently Viewed"
      listings={listings}
      ariaLabel="Recently viewed listings"
      isLoading={isLoading}
    />
  );
}
