'use client';

import { HiStar, HiOutlineChatAlt } from 'react-icons/hi';
import Avatar from '@/components/controls/avatar';
import Button from '@/components/controls/button';
import styles from './trust-stat-row.module.scss';

interface TrustStatRowProps {
  sellerName: string;
  avatarUrl?: string;
  rating: number;
  salesCount: number;
  responseTime: string;
  joinedDate: string;
  onMessage?: () => void;
  className?: string;
}

function renderStars(rating: number) {
  const clamped = Math.max(0, Math.min(5, rating));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className={styles.stars} aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <HiStar key={`full-${i}`} className={styles.starFull} aria-hidden="true" />
      ))}
      {half && (
        <HiStar key="half" className={styles.starHalf} aria-hidden="true" />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <HiStar key={`empty-${i}`} className={styles.starEmpty} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function TrustStatRow({
  sellerName,
  avatarUrl,
  rating,
  salesCount,
  responseTime,
  joinedDate,
  onMessage,
  className,
}: TrustStatRowProps) {
  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      <div className={styles.topRow}>
        <Avatar size="lg" name={sellerName} imageUrl={avatarUrl} />
        <div className={styles.identity}>
          <span className={styles.name}>{sellerName}</span>
          <div className={styles.ratingRow}>
            {renderStars(rating)}
            <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
          </div>
        </div>
        {onMessage && (
          <Button
            onClick={onMessage}
            style="primary"
            ariaLabel={`Message ${sellerName}`}
            icon={<HiOutlineChatAlt aria-hidden="true" />}
            iconPosition="left"
          >
            Message
          </Button>
        )}
      </div>
      <div className={styles.statsRow} role="list">
        <div className={styles.stat} role="listitem">
          <span className={styles.statLabel}>Response time</span>
          <span className={styles.statValue}>{responseTime}</span>
        </div>
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.stat} role="listitem">
          <span className={styles.statLabel}>Joined</span>
          <span className={styles.statValue}>{joinedDate}</span>
        </div>
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.stat} role="listitem">
          <span className={styles.statLabel}>Sales</span>
          <span className={styles.statValue}>{salesCount}</span>
        </div>
      </div>
    </div>
  );
}
