'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { useSellerListings } from '@/features/listings/hooks/use-listings';
import ListingCard from '@/features/listings/components/listing-card';
import Button from '@/components/controls/button';
import Grid from '@/components/layout/grid';

export default function Listings() {
  const router = useRouter();
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
      <Button onClick={() => router.push('/dashboard/listings/new')}>Create Listing</Button>
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
