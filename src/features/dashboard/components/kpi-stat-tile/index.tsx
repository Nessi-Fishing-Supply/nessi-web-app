'use client';

import { HiArrowUp, HiArrowDown, HiMinus } from 'react-icons/hi';
import styles from './kpi-stat-tile.module.scss';

interface KpiStatTileProps {
  label: string;
  value: string;
  trend: {
    direction: 'up' | 'down' | 'flat';
    value: string;
    period: string;
  };
  className?: string;
}

const trendIcons = {
  up: HiArrowUp,
  down: HiArrowDown,
  flat: HiMinus,
};

export default function KpiStatTile({ label, value, trend, className }: KpiStatTileProps) {
  const TrendIcon = trendIcons[trend.direction];

  return (
    <div className={`${styles.tile}${className ? ` ${className}` : ''}`}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      <div className={`${styles.trend} ${styles[`trend${trend.direction.charAt(0).toUpperCase()}${trend.direction.slice(1)}`]}`}>
        <TrendIcon className={styles.trendIcon} aria-hidden="true" />
        <span className={styles.trendValue}>{trend.value}</span>
        <span className={styles.trendPeriod}>{trend.period}</span>
      </div>
    </div>
  );
}
