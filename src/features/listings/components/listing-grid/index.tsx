import { ReactNode } from 'react';
import styles from './listing-grid.module.scss';

interface ListingGridProps {
  children: ReactNode;
}

export default function ListingGrid({ children }: ListingGridProps) {
  return <div className={styles.grid}>{children}</div>;
}
