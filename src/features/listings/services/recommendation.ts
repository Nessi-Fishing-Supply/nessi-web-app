import { get } from '@/libs/fetch';
import type {
  RecommendationsParams,
  RecommendationsResponse,
} from '@/features/listings/types/recommendation';

const BASE_URL = '/api/listings';

function buildQueryString(params: RecommendationsParams): string {
  const search = new URLSearchParams();
  search.set('context', params.context);

  if (params.context === 'similar') {
    search.set('listingId', params.listingId);
    search.set('category', params.category);
    search.set('condition', params.condition);
    if (params.excludeListingId) search.set('excludeListingId', params.excludeListingId);
  } else if (params.context === 'seller') {
    search.set('sellerId', params.sellerId);
    if (params.shopId) search.set('shopId', params.shopId);
    if (params.excludeListingId) search.set('excludeListingId', params.excludeListingId);
  } else if (params.context === 'also_liked') {
    if (params.listingIds?.length) search.set('listingIds', params.listingIds.join(','));
    if (params.userId) search.set('userId', params.userId);
  }

  return `?${search.toString()}`;
}

export const getRecommendations = async (
  params: RecommendationsParams,
): Promise<RecommendationsResponse> =>
  get<RecommendationsResponse>(`${BASE_URL}/recommendations${buildQueryString(params)}`);
