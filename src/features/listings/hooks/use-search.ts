import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { searchListings, trackSearchSuggestion } from '../services/search';
import type { SearchFilters } from '../types/search';
import type { PaginatedListings } from '../services/listing';

export function useSearchListingsInfinite(filters: SearchFilters) {
  return useInfiniteQuery<PaginatedListings>({
    queryKey: ['listings', 'search', filters],
    queryFn: ({ pageParam }) =>
      searchListings({
        ...filters,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = lastPage.page * lastPage.limit;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

export function useTrackSearchSuggestion() {
  return useMutation({
    mutationFn: (term: string) => trackSearchSuggestion(term),
  });
}
