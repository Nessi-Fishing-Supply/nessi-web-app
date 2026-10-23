'use client';

import ListingScrollStrip from '@/components/layout/listing-scroll-strip';
import { useFollowedSellerListings } from '@/features/listings/hooks/use-followed-seller-listings';

export default function FollowedSellersStrip() {
  const { data, isLoading } = useFollowedSellerListings();
  const listings = data?.listings ?? [];

  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <ListingScrollStrip
      title="From Sellers You Follow"
      listings={listings}
      ariaLabel="Listings from sellers you follow"
      isLoading={isLoading}
    />
  );
}
