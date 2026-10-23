'use client';

import { HiOutlineClock, HiOutlineX } from 'react-icons/hi';
import styles from './recent-searches.module.scss';

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll: () => void;
}

export default function RecentSearches({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}: RecentSearchesProps) {
  if (searches.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent searches</h3>
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          Clear all
        </button>
      </div>
      <ul className={styles.list} role="list">
        {searches.map((term) => (
          <li key={term} className={styles.item} role="listitem">
            <button
              type="button"
              className={styles.termButton}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(term);
              }}
            >
              <HiOutlineClock className={styles.clockIcon} aria-hidden="true" />
              <span>{term}</span>
            </button>
            <button
              type="button"
              className={styles.removeButton}
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(term);
              }}
              aria-label={`Remove ${term} from recent searches`}
            >
              <HiOutlineX aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
