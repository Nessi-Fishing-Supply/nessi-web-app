'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineCamera } from 'react-icons/hi';

import Pill from '@/components/indicators/pill';
import { LISTING_STATUS_LABELS, LISTING_STATUS_COLORS } from '@/features/listings/constants/status';
import { formatPrice } from '@/features/shared/utils/format';
import type { ListingWithPhotos, ListingStatus } from '@/features/listings/types/listing';

import styles from './listing-row.module.scss';

interface ListingRowProps {
  listing: ListingWithPhotos;
  onActionsClick?: (listing: ListingWithPhotos) => void;
  onPriceClick?: (listing: ListingWithPhotos) => void;
}

function getDaysListed(listing: ListingWithPhotos): number {
  const dateStr = listing.published_at ?? listing.created_at;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function ListingRow({ listing, onActionsClick, onPriceClick }: ListingRowProps) {
  const status = listing.status as ListingStatus;
  const thumbnail = listing.listing_photos?.[0]?.thumbnail_url ?? listing.cover_photo_url;
  const daysListed = getDaysListed(listing);
  const isDraft = status === 'draft';
  const isActive = status === 'active';
  const hasDetailPage = status === 'active' || status === 'sold';
  const detailHref = `/listing/${listing.id}`;

  return (
    <div className={styles.row}>
      {hasDetailPage ? (
        <Link href={detailHref} className={styles.thumbnailLink}>
          <div className={styles.thumbnail}>
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={listing.title}
                fill
                sizes="(max-width: 480px) 60px, 80px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className={styles.thumbnailEmpty} aria-hidden="true">
                <HiOutlineCamera size={24} color="var(--color-neutral-400)" />
              </div>
            )}
          </div>
        </Link>
      ) : (
        <div className={styles.thumbnail}>
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={listing.title}
              fill
              sizes="(max-width: 480px) 60px, 80px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className={styles.thumbnailEmpty} aria-hidden="true">
              <HiOutlineCamera size={24} color="var(--color-neutral-400)" />
            </div>
          )}
        </div>
      )}

      <div className={styles.info}>
        {hasDetailPage ? (
          <Link href={detailHref} className={styles.titleLink}>
            {listing.title}
          </Link>
        ) : (
          <p className={styles.title}>{listing.title}</p>
        )}
        <div className={styles.meta}>
          <Pill color={LISTING_STATUS_COLORS[status]}>{LISTING_STATUS_LABELS[status]}</Pill>
          {daysListed > 0 && <span className={styles.stat}>{daysListed}d listed</span>}
          {listing.view_count > 0 && (
            <span className={styles.stat}>{listing.view_count} views</span>
          )}
          {listing.watcher_count > 0 && (
            <span className={styles.stat}>{listing.watcher_count} watchers</span>
          )}
        </div>
        {isDraft && (
          <Link href={`/dashboard/listings/new?draftId=${listing.id}`} className={styles.draftLink}>
            Continue editing
          </Link>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.price} ${isActive && onPriceClick ? styles.priceEditable : ''}`}
          onClick={isActive && onPriceClick ? () => onPriceClick(listing) : undefined}
          aria-label={
            isActive && onPriceClick ? `Edit price: ${formatPrice(listing.price_cents)}` : undefined
          }
          disabled={!isActive || !onPriceClick}
        >
          {formatPrice(listing.price_cents)}
        </button>
        {onActionsClick && (
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => onActionsClick(listing)}
            aria-label={`Actions for ${listing.title}`}
          >
            ⋮
          </button>
        )}
      </div>
    </div>
  );
}
