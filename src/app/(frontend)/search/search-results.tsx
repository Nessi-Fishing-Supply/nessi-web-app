'use client';

import { useEffect, useRef } from 'react';
import { useSearchFilters } from '@/features/listings/hooks/use-search-filters';
import { useSearchListingsInfinite, useTrackSearchSuggestion } from '@/features/listings/hooks/use-search';
import ListingCard from '@/features/listings/components/listing-card';
import ListingGrid from '@/features/listings/components/listing-grid';
import ListingSkeleton from '@/features/listings/components/listing-skeleton';
import InfiniteScroll from '@/features/listings/components/infinite-scroll';
import SortSelect from '@/features/listings/components/sort-select';
import EmptyState from '@/features/listings/components/empty-state';
import styles from './search-results.module.scss';

export default function SearchResults() {
  const { filters, setFilter } = useSearchFilters();
  const trackSuggestion = useTrackSearchSuggestion();
  const hasTracked = useRef(false);

  const sort = filters.sort || (filters.q ? 'newest' : 'newest');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useSearchListingsInfinite({
      ...filters,
      sort,
    });

  const listings = data?.pages.flatMap((page) => page.listings) ?? [];
  const total = data?.pages[0]?.total;

  useEffect(() => {
    hasTracked.current = false;
  }, [filters.q]);

  useEffect(() => {
    if (filters.q && filters.q.length >= 2 && !hasTracked.current) {
      trackSuggestion.mutate(filters.q);
      hasTracked.current = true;
    }
  }, [filters.q]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSortChange = (value: string) => {
    setFilter('sort', value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {total !== undefined && filters.q
            ? `${total} result${total !== 1 ? 's' : ''} for "${filters.q}"`
            : 'Search Results'}
        </h1>
        <SortSelect value={sort} onChange={handleSortChange} />
      </div>

      {isLoading ? (
        <ListingGrid>
          <ListingSkeleton count={8} />
        </ListingGrid>
      ) : listings.length === 0 ? (
        <EmptyState
          message={`No results for "${filters.q}"`}
          description="Try different keywords or browse a category."
          ctaLabel="Browse all listings"
          ctaHref="/"
        />
      ) : (
        <InfiniteScroll
          onLoadMore={fetchNextPage}
          hasMore={!!hasNextPage}
          isLoading={isFetchingNextPage}
        >
          <ListingGrid>
            {listings.map((listing, index) => (
              <ListingCard key={listing.id} listing={listing} priority={index === 0} />
            ))}
          </ListingGrid>
        </InfiniteScroll>
      )}
    </div>
  );
}
