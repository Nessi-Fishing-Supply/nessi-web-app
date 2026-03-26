import ListingCard from '@/features/listings/components/listing-card';
import type { ListingWithPhotos } from '@/features/listings/types/listing';
import styles from './listing-scroll-strip.module.scss';

interface ListingScrollStripProps {
  title: string;
  listings: ListingWithPhotos[];
  ariaLabel: string;
  isLoading?: boolean;
}

export default function ListingScrollStrip({
  title,
  listings,
  ariaLabel,
  isLoading = false,
}: ListingScrollStripProps) {
  if (!isLoading && listings.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} role="region" aria-label={ariaLabel} aria-busy={isLoading}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.track}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={styles.skeletonItem} aria-hidden="true">
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                  <div className={styles.skeletonLineShorter} />
                </div>
              </div>
            ))
          : listings.map((listing, index) => (
              <div key={listing.id} className={styles.item}>
                <ListingCard listing={listing} priority={index === 0} />
              </div>
            ))}
      </div>
    </section>
  );
}
