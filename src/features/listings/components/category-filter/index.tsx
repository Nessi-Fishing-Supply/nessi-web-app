'use client';

import { LISTING_CATEGORIES } from '@/features/listings/constants/category';
import type { ListingCategory } from '@/features/listings/types/listing';
import styles from './category-filter.module.scss';

interface CategoryFilterProps {
  selected: ListingCategory[];
  onChange: (selected: ListingCategory[]) => void;
  counts?: Partial<Record<ListingCategory, number>>;
}

export default function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  function handleChange(value: ListingCategory) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Filter by category</legend>

      <div className={styles.list}>
        {LISTING_CATEGORIES.map((category) => {
          const inputId = `category-filter-${category.value}`;
          const isChecked = selected.includes(category.value);
          const count = counts?.[category.value];

          return (
            <label key={category.value} htmlFor={inputId} className={styles.row}>
              <input
                type="checkbox"
                id={inputId}
                value={category.value}
                checked={isChecked}
                onChange={() => handleChange(category.value)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkbox} aria-hidden="true" />
              <span className={styles.label}>{category.label}</span>
              {counts !== undefined && count !== undefined && (
                <span className={styles.count}>({count})</span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
