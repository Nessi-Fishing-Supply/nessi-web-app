'use client';

import type { ReactNode } from 'react';
import styles from './verification-badge.module.scss';

interface VerificationBadgeProps {
  type: string;
  label: string;
  variant: 'success' | 'green' | 'orange' | 'maroon' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export default function VerificationBadge({
  type,
  label,
  variant,
  icon,
  className,
}: VerificationBadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${className ?? ''}`}
      data-type={type}
    >
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.label}>{label}</span>
    </span>
  );
}
