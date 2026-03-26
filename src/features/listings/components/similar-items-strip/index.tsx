'use client';

import ListingScrollStrip from '@/components/layout/listing-scroll-strip';
import { useRecommendations } from '@/features/listings/hooks/use-recommendations';

type SimilarItemsStripProps = {
  listingId: string;
  category: string;
  condition: string;
};

export default function SimilarItemsStrip({
  listingId,
  category,
  condition,
}: SimilarItemsStripProps) {
  const { data, isLoading } = useRecommendations({
    context: 'similar',
    listingId,
    category,
    condition,
    excludeListingId: listingId,
  });

  const listings = data?.listings ?? [];

  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <ListingScrollStrip
      title="Similar Items"
      listings={listings}
      ariaLabel="Similar items"
      isLoading={isLoading}
    />
  );
}
