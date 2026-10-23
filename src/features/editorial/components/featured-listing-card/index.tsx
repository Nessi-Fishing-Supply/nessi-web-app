'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HiHeart, HiOutlineHeart, HiEye } from 'react-icons/hi';
import styles from './featured-listing-card.module.scss';

interface FeaturedListingCardProps {
  title: string;
  price: number;
  sellerName: string;
  image: string;
  conditionLabel: string;
  conditionVariant: string;
  watcherCount?: number;
  isFeatured?: boolean;
  isWatched?: boolean;
  onWatch?: () => void;
  href: string;
  className?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function FeaturedListingCard({
  title,
  price,
  sellerName,
  image,
  conditionLabel,
  conditionVariant,
  watcherCount,
  isFeatured = false,
  isWatched = false,
  onWatch,
  href,
  className,
}: FeaturedListingCardProps) {
  const [watched, setWatched] = useState(isWatched);

  function handleWatch(e: React.MouseEvent) {
    e.preventDefault();
    setWatched((prev) => !prev);
    onWatch?.();
  }

  return (
    <Link href={href} className={`${styles.card}${className ? ` ${className}` : ''}`}>
      <div className={styles.imageWrap}>
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 600px"
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.topLeft}>
          {isFeatured && <span className={styles.featuredBadge}>Featured</span>}
          <span className={`${styles.conditionPill} ${styles[`condition${conditionVariant}`]}`}>
            {conditionLabel}
          </span>
        </div>
        {onWatch && (
          <button
            type="button"
            className={styles.watchBtn}
            onClick={handleWatch}
            aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
            aria-pressed={watched}
          >
            {watched ? (
              <HiHeart className={styles.heartFilled} aria-hidden="true" />
            ) : (
              <HiOutlineHeart aria-hidden="true" />
            )}
          </button>
        )}
        <div className={styles.bottomOverlay}>
          <p className={styles.sellerLine}>{sellerName}</p>
          <p className={styles.title}>{title}</p>
          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(price)}</span>
            <span className={styles.orOffer}>or offer</span>
            {watcherCount !== undefined && watcherCount > 0 && (
              <span className={styles.watchers}>
                <HiEye aria-hidden="true" />
                {watcherCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
