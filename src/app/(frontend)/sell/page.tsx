import type { Metadata } from 'next';
import Link from 'next/link';
import FeeCalculator from './fee-calculator';
import styles from './sell-page.module.scss';

export const metadata: Metadata = {
  title: 'Sell Your Fishing Gear',
  description:
    "List your fishing gear on Nessi with fees as low as 6%. See exactly what you'll earn with our fee calculator.",
};

export default function SellPage() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heading}>Sell Your Fishing Gear on Nessi</h1>
        <p className={styles.subheading}>
          Low fees, no hidden charges. Keep more of what you earn.
        </p>
      </div>

      <FeeCalculator />

      <div className={styles.cta}>
        <h2 className={styles.ctaHeading}>Ready to start selling?</h2>
        <p className={styles.ctaText}>
          Join Nessi and reach thousands of anglers looking for quality gear.
        </p>
        <Link href="/register" className={styles.ctaButton}>
          Get started
        </Link>
      </div>
    </div>
  );
}
