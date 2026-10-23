'use client';

import { LISTING_CATEGORIES } from '../../constants/category';
import type { ListingCategory } from '../../types/listing';
import styles from './search-quick-categories.module.scss';

interface SearchQuickCategoriesProps {
  onSelect: (category: ListingCategory) => void;
}

export default function SearchQuickCategories({ onSelect }: SearchQuickCategoriesProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Categories</h3>
      <ul className={styles.list} role="list">
        {LISTING_CATEGORIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <li key={entry.value} role="listitem">
              <button
                type="button"
                className={styles.chip}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(entry.value);
                }}
              >
                <Icon className={styles.chipIcon} aria-hidden="true" />
                <span>{entry.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
