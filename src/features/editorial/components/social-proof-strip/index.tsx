'use client';

import styles from './social-proof-strip.module.scss';

interface SocialProofStripProps {
  variant: 'stats' | 'activity';
  stats?: { label: string; value: string }[];
  activity?: {
    userName: string;
    location: string;
    itemName: string;
    price: number;
    timeAgo: string;
  };
  className?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function SocialProofStrip({
  variant,
  stats,
  activity,
  className,
}: SocialProofStripProps) {
  if (variant === 'stats' && stats) {
    return (
      <div
        className={`${styles.statsStrip}${className ? ` ${className}` : ''}`}
        aria-label="Marketplace statistics"
      >
        {stats.map((stat, index) => (
          <div key={stat.label} className={styles.statItem}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
            {index < stats.length - 1 && (
              <span className={styles.divider} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'activity' && activity) {
    return (
      <div
        className={`${styles.activityStrip}${className ? ` ${className}` : ''}`}
        aria-live="polite"
        aria-label="Recent activity"
      >
        <span className={styles.pulse} aria-hidden="true" />
        <p className={styles.activityText}>
          <span className={styles.activityUser}>{activity.userName}</span>
          {' from '}
          <span>{activity.location}</span>
          {' bought '}
          <span className={styles.activityItem}>{activity.itemName}</span>
          {' for '}
          <span className={styles.activityPrice}>{formatPrice(activity.price)}</span>
        </p>
        <span className={styles.activityTime}>{activity.timeAgo}</span>
      </div>
    );
  }

  return null;
}
