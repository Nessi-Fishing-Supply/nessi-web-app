'use client';

import ListingScrollStrip from '@/components/layout/listing-scroll-strip';
import { useRecommendations } from '@/features/listings/hooks/use-recommendations';
import type { SellerIdentity } from '@/features/listings/types/listing';

type MoreFromSellerStripProps = {
  sellerId: string;
  seller: SellerIdentity;
  shopId?: string;
  excludeListingId: string;
};

export default function MoreFromSellerStrip({
  sellerId,
  seller,
  shopId,
  excludeListingId,
}: MoreFromSellerStripProps) {
  const { data, isLoading } = useRecommendations({
    context: 'seller',
    sellerId,
    shopId,
    excludeListingId,
  });

  const listings = data?.listings ?? [];
  const sellerName = seller.type === 'shop' ? seller.shop_name : seller.first_name;

  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <ListingScrollStrip
      title={`More From ${sellerName}`}
      listings={listings}
      ariaLabel={`More listings from ${sellerName}`}
      isLoading={isLoading}
    />
  );
}
