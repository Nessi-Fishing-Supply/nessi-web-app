'use client';

import { HiOutlineCurrencyDollar } from 'react-icons/hi';
import Button from '@/components/controls/button';
import styles from './start-selling-cta.module.scss';

interface StartSellingCtaProps {
  onStartSelling: () => void;
}

export default function StartSellingCta({ onStartSelling }: StartSellingCtaProps) {
  return (
    <div className={styles.card}>
      <HiOutlineCurrencyDollar className={styles.icon} aria-hidden="true" />
      <h2 className={styles.heading}>Start selling your gear</h2>
      <p className={styles.description}>
        Turn your unused fishing gear into cash. List items for free and reach thousands of anglers.
      </p>
      <div className={styles.action}>
        <Button onClick={onStartSelling} style="primary">
          Start selling
        </Button>
      </div>
    </div>
  );
}
