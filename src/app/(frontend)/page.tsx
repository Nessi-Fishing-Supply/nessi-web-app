'use client';

import React from 'react';
import { useListings } from '@/features/listings/hooks/use-listings';
import ListingCard from '@/features/listings/components/listing-card';
import Grid from '@/components/layout/grid';
import { RecentlyViewedStrip } from '@/features/recently-viewed';
import FollowedSellersStrip from '@/features/listings/components/followed-sellers-strip';

export default function Home() {
  const { data, isLoading } = useListings();
  const listings = data?.listings ?? [];

  if (isLoading) {
    return <p>Loading listings...</p>;
  }

  return (
    <main>
      {listings.length === 0 ? (
        <p>No listings available.</p>
      ) : (
        <Grid columns={4}>
          {listings.map((listing, index) => (
            <ListingCard key={listing.id} listing={listing} priority={index === 0} />
          ))}
        </Grid>
      )}
      <FollowedSellersStrip />
      <RecentlyViewedStrip />
    </main>
  );
}
