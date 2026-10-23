import styles from './listing-skeleton.module.scss';

interface ListingSkeletonProps {
  count?: number;
}

export default function ListingSkeleton({ count = 8 }: ListingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.card} aria-hidden="true">
          <div className={styles.image} />
          <div className={styles.content}>
            <div className={styles.line} />
            <div className={styles.lineShort} />
            <div className={styles.lineShorter} />
          </div>
        </div>
      ))}
    </>
  );
}
