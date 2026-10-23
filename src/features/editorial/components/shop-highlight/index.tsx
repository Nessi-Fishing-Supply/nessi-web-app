'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HiStar } from 'react-icons/hi';
import styles from './shop-highlight.module.scss';

interface ShopHighlightProps {
  shopName: string;
  location: string;
  avatarUrl?: string;
  heroImage: string;
  quote: string;
  identityTags: string[];
  previewItems: { image: string; price: number }[];
  rating: number;
  salesCount: number;
  shopUrl: string;
  className?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function ShopHighlight({
  shopName,
  location,
  avatarUrl,
  heroImage,
  quote,
  identityTags,
  previewItems,
  rating,
  salesCount,
  shopUrl,
  className,
}: ShopHighlightProps) {
  return (
    <article className={`${styles.card}${className ? ` ${className}` : ''}`}>
      <div className={styles.hero}>
        <Image
          src={heroImage}
          alt={`${shopName} shop`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <span className={styles.shopBadge}>Shop</span>
        <div className={styles.heroIdentity}>
          <div className={styles.avatar}>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={shopName}
                width={40}
                height={40}
                sizes="40px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span className={styles.avatarFallback} aria-hidden="true">
                {shopName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className={styles.heroMeta}>
            <p className={styles.heroName}>{shopName}</p>
            <p className={styles.heroLocation}>{location}</p>
          </div>
        </div>
      </div>
      <div className={styles.body}>
        <blockquote className={styles.quote}>{quote}</blockquote>
        {identityTags.length > 0 && (
          <div className={styles.tags} aria-label="Fishing identity">
            {identityTags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {previewItems.length > 0 && (
          <div className={styles.previewGrid}>
            {previewItems.slice(0, 3).map((item, index) => (
              <div key={index} className={styles.previewItem}>
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(max-width: 480px) 33vw, 120px"
                  style={{ objectFit: 'cover' }}
                />
                <span className={styles.previewPrice}>{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>
        )}
        <div className={styles.footer}>
          <div className={styles.stats}>
            <span className={styles.rating}>
              <HiStar className={styles.starIcon} aria-hidden="true" />
              {rating.toFixed(1)}
            </span>
            <span className={styles.sales}>{salesCount} sales</span>
          </div>
          <Link href={shopUrl} className={styles.cta}>
            Visit Shop
          </Link>
        </div>
      </div>
    </article>
  );
}
