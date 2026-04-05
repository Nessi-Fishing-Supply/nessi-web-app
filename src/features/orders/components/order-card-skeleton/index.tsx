import styles from './order-card-skeleton.module.scss';

interface OrderCardSkeletonProps {
  count?: number;
}

export default function OrderCardSkeleton({ count = 4 }: OrderCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.card} aria-hidden="true">
          <div className={styles.thumbnail} />
          <div className={styles.details}>
            <div className={styles.lineTitle} />
            <div className={styles.lineSeller} />
            <div className={styles.lineMeta} />
          </div>
          <div className={styles.badge} />
        </div>
      ))}
    </>
  );
}
