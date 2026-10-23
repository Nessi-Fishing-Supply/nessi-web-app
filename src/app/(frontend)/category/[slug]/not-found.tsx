import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Category Not Found</h1>
      <p className={styles.description}>
        The category you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link href="/" className={styles.link}>
        Back to home
      </Link>
    </div>
  );
}
