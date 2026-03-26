'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import ListingCard from '@/features/listings/components/listing-card';
import ListingGrid from '@/features/listings/components/listing-grid';
import ListingSkeleton from '@/features/listings/components/listing-skeleton';
import InfiniteScroll from '@/features/listings/components/infinite-scroll';
import SortSelect from '@/features/listings/components/sort-select';
import EmptyState from '@/features/listings/components/empty-state';
import { useListingsInfinite } from '@/features/listings/hooks/use-listings-infinite';
import { RecentlyViewedStrip } from '@/features/recently-viewed';
import styles from './category-browse.module.scss';

type CategoryBrowseProps = {
  slug: string;
  label: string;
};

export default function CategoryBrowse({ slug, label }: CategoryBrowseProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sort = searchParams.get('sort') || 'newest';

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useListingsInfinite({
    category: slug,
    sort,
    limit: 24,
  });

  const listings = data?.pages.flatMap((page) => page.listings) ?? [];

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{label}</h1>
        <SortSelect value={sort} onChange={handleSortChange} />
      </div>

      <RecentlyViewedStrip />

      {isLoading ? (
        <ListingGrid>
          <ListingSkeleton count={8} />
        </ListingGrid>
      ) : listings.length === 0 ? (
        <EmptyState
          message={`No ${label.toLowerCase()} listed yet`}
          description="Check back soon — new gear is posted every day."
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
