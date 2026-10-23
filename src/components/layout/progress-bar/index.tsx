'use client';

import React, { useId } from 'react';
import styles from './progress-bar.module.scss';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max,
  label,
  showPercentage = false,
  className,
}: ProgressBarProps) {
  const id = useId();
  const labelId = `progress-label-${id}`;
  const clampedValue = Math.min(Math.max(value, 0), max);
  const percentage = max > 0 ? Math.round((clampedValue / max) * 100) : 0;

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {(label || showPercentage) && (
        <div className={styles.meta}>
          {label && (
            <span id={labelId} className={styles.label}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={styles.percentage} aria-hidden="true">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-labelledby={label ? labelId : undefined}
        aria-label={!label ? `${percentage}% complete` : undefined}
        className={styles.track}
      >
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
