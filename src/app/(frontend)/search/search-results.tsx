'use client';

import { useEffect, useRef, useState } from 'react';
import { HiAdjustments } from 'react-icons/hi';
import { useSearchFilters } from '@/features/listings/hooks/use-search-filters';
import {
  useSearchListingsInfinite,
  useTrackSearchSuggestion,
} from '@/features/listings/hooks/use-search';
import FilterPanel from '@/features/listings/components/filter-panel';
import FilterChips from '@/features/listings/components/filter-chips';
import ListingCard from '@/features/listings/components/listing-card';
import ListingGrid from '@/features/listings/components/listing-grid';
import ListingSkeleton from '@/features/listings/components/listing-skeleton';
import InfiniteScroll from '@/features/listings/components/infinite-scroll';
import SortSelect from '@/features/listings/components/sort-select';
import EmptyState from '@/features/listings/components/empty-state';
import styles from './search-results.module.scss';

export default function SearchResults() {
  const { filters, setFilter, removeFilter, clearAllFilters, hasActiveFilters, activeFilterCount } =
    useSearchFilters();
  const trackSuggestion = useTrackSearchSuggestion();
  const hasTracked = useRef(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sort = filters.sort || (filters.q ? 'relevance' : 'newest');

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

  const handleFilterToggle = () => {
    // Desktop: toggle sidebar. Mobile: open full-screen panel.
    if (window.innerWidth >= 1000) {
      setFiltersOpen((prev) => !prev);
    } else {
      setMobileFiltersOpen(true);
    }
  };

  return (
    <main className={styles.container}>
      {/* Top filter bar */}
      <div className={styles.filterBar}>
        <button
          type="button"
          className={`${styles.filterToggle}${filtersOpen || mobileFiltersOpen ? ` ${styles.filterToggleActive}` : ''}`}
          onClick={handleFilterToggle}
          aria-expanded={filtersOpen}
          aria-controls="filter-sidebar"
        >
          <HiAdjustments aria-hidden="true" />
          <span className={styles.filterToggleLabel}>
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </span>
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </button>

        {hasActiveFilters && (
          <FilterChips
            filters={filters}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
          />
        )}

        <div className={styles.sortWrapper}>
          <SortSelect value={sort} onChange={handleSortChange} showRelevance={!!filters.q} />
        </div>
      </div>

      {/* Main layout with optional sidebar */}
      <div className={`${styles.layout}${filtersOpen ? ` ${styles.sidebarOpen}` : ''}`}>
        <FilterPanel
          filters={filters}
          onFilterChange={(key, value) =>
            setFilter(key, value as string | string[] | number | boolean | undefined)
          }
          onClearAll={clearAllFilters}
          activeFilterCount={activeFilterCount}
          resultCount={total}
          isOpen={filtersOpen}
          isMobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
        />
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {total !== undefined && filters.q
                ? `${total} result${total !== 1 ? 's' : ''} for "${filters.q}"`
                : 'Search Results'}
            </h1>
          </div>

          {isLoading ? (
            <ListingGrid>
              <ListingSkeleton count={8} />
            </ListingGrid>
          ) : listings.length === 0 && hasActiveFilters ? (
            <EmptyState
              message="Nothing here yet"
              description="Try adjusting your filters or search terms."
              ctaLabel="Clear all filters"
              ctaHref={filters.q ? `/search?q=${encodeURIComponent(filters.q)}` : '/search'}
            />
          ) : listings.length === 0 ? (
            <EmptyState
              message={filters.q ? `No results for "${filters.q}"` : 'No results found'}
              description={
                filters.q
                  ? 'Try a different search term.'
                  : 'Try different keywords or browse a category.'
              }
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
      </div>
    </main>
  );
}
