import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Transfer Not Found</h1>
        <p className={styles.description}>
          This transfer link is invalid or has already been used.
        </p>
        <Link href="/dashboard" className={styles.link}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
