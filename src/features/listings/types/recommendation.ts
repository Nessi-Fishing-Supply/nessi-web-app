import type { ListingWithPhotos } from './listing';

export type RecommendationContext = 'similar' | 'seller' | 'also_liked';

export type SimilarParams = {
  context: 'similar';
  listingId: string;
  category: string;
  condition: string;
  excludeListingId?: string;
};

export type SellerParams = {
  context: 'seller';
  sellerId: string;
  shopId?: string;
  excludeListingId?: string;
};

export type AlsoLikedParams = {
  context: 'also_liked';
  listingIds?: string[];
  userId?: string;
};

export type RecommendationsParams = SimilarParams | SellerParams | AlsoLikedParams;

export type RecommendationsResponse = {
  listings: ListingWithPhotos[];
  context: RecommendationContext;
};
