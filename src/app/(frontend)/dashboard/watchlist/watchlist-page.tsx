'use client';

import Link from 'next/link';
import { HiOutlineHeart } from 'react-icons/hi';
import { useWatchlist } from '@/features/watchlist/hooks/use-watchlist';
import ListingCard from '@/features/listings/components/listing-card';
import ListingGrid from '@/features/listings/components/listing-grid';
import ListingSkeleton from '@/features/listings/components/listing-skeleton';
import Button from '@/components/controls/button';
import styles from './watchlist-page.module.scss';

export default function WatchlistPage() {
  const { data: listings, isLoading, isError } = useWatchlist();

  if (isLoading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Watchlist</h1>
        <ListingGrid>
          <ListingSkeleton count={8} />
        </ListingGrid>
        <span className="sr-only" role="status" aria-live="polite">
          Loading your watchlist
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Watchlist</h1>
        <p className={styles.error} role="alert">
          Something went wrong loading your watchlist. Please try again.
        </p>
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Watchlist</h1>
        <div className={styles.emptyState}>
          <HiOutlineHeart className={styles.emptyIcon} aria-hidden="true" />
          <h2 className={styles.emptyHeading}>Your watchlist is empty</h2>
          <p className={styles.emptyText}>Watch listings to get notified when prices drop.</p>
          <Link href="/listings">
            <Button style="primary">Browse listings</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Watchlist</h1>
      <ListingGrid>
        {listings.map((listing, index) => {
          const isSold = listing.status === 'sold';
          return (
            <div key={listing.id} className={styles.cardWrapper}>
              <ListingCard listing={listing} priority={index === 0} />
              {isSold && (
                <div className={styles.soldOverlay} aria-label="Sold">
                  <span className={styles.soldLabel}>Sold</span>
                </div>
              )}
            </div>
          );
        })}
      </ListingGrid>
    </div>
  );
}
