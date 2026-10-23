'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './recently-sold-ticker.module.scss';

interface SaleItem {
  title: string;
  price: number;
  thumbnail: string;
  timeAgo: string;
}

interface RecentlySoldTickerProps {
  sales: SaleItem[];
  className?: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function RecentlySoldTicker({ sales, className }: RecentlySoldTickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sales.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sales.length);
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sales.length]);

  return (
    <div
      className={`${styles.ticker}${className ? ` ${className}` : ''}`}
      aria-live="polite"
      aria-label="Recently sold items"
    >
      <div className={styles.header}>
        <span className={styles.headerLabel}>Recently Sold</span>
        <span className={styles.pulse} aria-hidden="true" />
      </div>
      <div className={styles.feed} aria-atomic="true">
        {sales.map((sale, index) => (
          <div
            key={index}
            className={`${styles.row} ${index === activeIndex ? styles.rowVisible : styles.rowHidden}`}
            aria-hidden={index !== activeIndex}
          >
            <div className={styles.thumbnail}>
              <Image
                src={sale.thumbnail}
                alt={sale.title}
                width={36}
                height={36}
                sizes="36px"
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div className={styles.info}>
              <p className={styles.title}>{sale.title}</p>
              <p className={styles.time}>{sale.timeAgo}</p>
            </div>
            <span className={styles.price}>{formatPrice(sale.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
