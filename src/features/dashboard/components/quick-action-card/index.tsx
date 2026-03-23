'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { HiChevronRight } from 'react-icons/hi';
import styles from './quick-action-card.module.scss';

interface QuickActionCardProps {
  icon: ReactNode;
  label: string;
  badge?: number;
  subtitle?: string;
  href: string;
  className?: string;
}

export default function QuickActionCard({
  icon,
  label,
  badge,
  subtitle,
  href,
  className,
}: QuickActionCardProps) {
  return (
    <Link href={href} className={`${styles.card}${className ? ` ${className}` : ''}`}>
      <div className={styles.iconWrap} aria-hidden="true">
        {icon}
      </div>
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={styles.badge} aria-label={`${badge} items`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <HiChevronRight className={styles.chevron} aria-hidden="true" />
    </Link>
  );
}
