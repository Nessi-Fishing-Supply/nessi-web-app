import { useQuery } from '@tanstack/react-query';
import { getRecommendations } from '@/features/listings/services/recommendation';
import type { RecommendationsParams } from '@/features/listings/types/recommendation';

type SimilarArgs = {
  context: 'similar';
  listingId?: string;
  category?: string;
  condition?: string;
  excludeListingId?: string;
};

type SellerArgs = {
  context: 'seller';
  sellerId?: string;
  shopId?: string;
  excludeListingId?: string;
};

type AlsoLikedArgs = {
  context: 'also_liked';
  listingIds?: string[];
  userId?: string;
};

type UseRecommendationsArgs = SimilarArgs | SellerArgs | AlsoLikedArgs;

export function useRecommendations(args: UseRecommendationsArgs) {
  let enabled = false;
  let queryKey: unknown[];
  let params: RecommendationsParams | null = null;

  if (args.context === 'similar') {
    enabled = !!args.listingId && !!args.category && !!args.condition;
    queryKey = ['listings', 'recommendations', 'similar', args.listingId];
    if (enabled) {
      params = {
        context: 'similar',
        listingId: args.listingId!,
        category: args.category!,
        condition: args.condition!,
        ...(args.excludeListingId ? { excludeListingId: args.excludeListingId } : {}),
      };
    }
  } else if (args.context === 'seller') {
    enabled = !!args.sellerId;
    queryKey = ['listings', 'recommendations', 'seller', args.sellerId, args.shopId];
    if (enabled) {
      params = {
        context: 'seller',
        sellerId: args.sellerId!,
        ...(args.shopId ? { shopId: args.shopId } : {}),
        ...(args.excludeListingId ? { excludeListingId: args.excludeListingId } : {}),
      };
    }
  } else {
    enabled = !!(args.listingIds?.length || args.userId);
    queryKey = [
      'listings',
      'recommendations',
      'also_liked',
      args.userId,
      args.listingIds?.join(','),
    ];
    if (enabled) {
      params = {
        context: 'also_liked',
        ...(args.listingIds?.length ? { listingIds: args.listingIds } : {}),
        ...(args.userId ? { userId: args.userId } : {}),
      };
    }
  }

  return useQuery({
    queryKey,
    queryFn: () => getRecommendations(params!),
    enabled,
  });
}
