'use client';

import React from 'react';
import { useListings } from '@/features/listings/hooks/use-listings';
import ListingCard from '@/features/listings/components/listing-card';
import Grid from '@/components/layout/grid';

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
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Grid>
      )}
    </main>
  );
}
