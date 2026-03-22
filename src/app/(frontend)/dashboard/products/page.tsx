'use client';

import React from 'react';
import { useAuth } from '@/features/auth/context';
import { useSellerListings } from '@/features/listings/hooks/use-listings';
import ListingCard from '@/features/listings/components/listing-card';
import Grid from '@/components/layout/grid';

export default function Listings() {
  const { isAuthenticated } = useAuth();
  const { data: listings = [], isLoading } = useSellerListings();

  if (!isAuthenticated) {
    return <p>Please sign in to view your listings.</p>;
  }

  if (isLoading) {
    return <p>Loading your listings...</p>;
  }

  return (
    <div>
      <h1>My Listings</h1>
      <p>Manage your listings here.</p>
      {listings.length === 0 ? (
        <p>You don&#39;t have any listings yet.</p>
      ) : (
        <Grid columns={4}>
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </Grid>
      )}
    </div>
  );
}
