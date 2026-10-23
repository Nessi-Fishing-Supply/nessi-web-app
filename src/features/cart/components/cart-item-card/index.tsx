'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HiOutlineX } from 'react-icons/hi';

import Pill from '@/components/indicators/pill';
import ConditionBadge from '@/features/listings/components/condition-badge';
import { formatPrice } from '@/features/shared/utils/format';
import type { CartItemWithListing } from '@/features/cart/types/cart';

import styles from './cart-item-card.module.scss';

interface CartItemCardProps {
  item: CartItemWithListing;
  onRemove: (cartItemId: string) => void;
  isRemoving?: boolean;
}

export default function CartItemCard({ item, onRemove, isRemoving = false }: CartItemCardProps) {
  const { listing } = item;

  const thumbnailUrl = listing.cover_photo_url ?? listing.listing_photos[0]?.image_url ?? null;

  const hasPriceChanged = item.price_at_add !== listing.price_cents;

  return (
    <article className={styles.card}>
      <div className={styles.thumbnail}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={listing.title}
            fill
            sizes="80px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className={styles.thumbnailPlaceholder} aria-hidden="true" />
        )}
      </div>

      <div className={styles.content}>
        <Link href={`/listing/${item.listing_id}`} className={styles.title}>
          {listing.title}
        </Link>

        <div className={styles.meta}>
          <ConditionBadge condition={listing.condition} size="sm" />

          <div className={styles.pricing}>
            {hasPriceChanged ? (
              <>
                <s className={styles.oldPrice}>{formatPrice(item.price_at_add)}</s>
                <span className={styles.currentPrice}>{formatPrice(listing.price_cents)}</span>
              </>
            ) : (
              <span className={styles.currentPrice}>{formatPrice(listing.price_cents)}</span>
            )}
          </div>
        </div>

        {hasPriceChanged && (
          <div className={styles.priceChangedNotice}>
            <Pill color="warning">Price changed</Pill>
          </div>
        )}
      </div>

      <button
        type="button"
        className={styles.removeButton}
        aria-label={`Remove ${listing.title} from cart`}
        aria-busy={isRemoving}
        disabled={isRemoving}
        onClick={() => onRemove(item.id)}
      >
        <HiOutlineX aria-hidden="true" />
      </button>
    </article>
  );
}
