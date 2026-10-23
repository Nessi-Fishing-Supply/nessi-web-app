import { useInfiniteQuery } from '@tanstack/react-query';
import { getListings } from '@/features/listings/services/listing';
import type { PaginatedListings } from '@/features/listings/services/listing';

interface ListingsInfiniteParams {
  category?: string;
  sort?: string;
  limit?: number;
}

export function useListingsInfinite({ category, sort, limit = 24 }: ListingsInfiniteParams = {}) {
  return useInfiniteQuery<PaginatedListings>({
    queryKey: ['listings', 'infinite', { category, sort }],
    queryFn: ({ pageParam }) =>
      getListings({
        category,
        sort: sort as 'newest' | 'price_asc' | 'price_desc' | 'watched' | undefined,
        limit,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = lastPage.page * lastPage.limit;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}
