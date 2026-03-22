'use client';

import { useRef } from 'react';
import { LISTING_CATEGORIES } from '@/features/listings/constants/category';
import styles from './category-selector.module.scss';

interface CategorySelectorProps {
  value: string | null;
  onChange: (category: string) => void;
}

export default function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(LISTING_CATEGORIES[index].value);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % LISTING_CATEGORIES.length;
      tileRefs.current[next]?.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = (index - 1 + LISTING_CATEGORIES.length) % LISTING_CATEGORIES.length;
      tileRefs.current[prev]?.focus();
    }
  }

  return (
    <fieldset className={styles.fieldset} role="radiogroup" aria-required="true">
      <legend className="sr-only">Select a category</legend>

      <div className={styles.grid}>
        {LISTING_CATEGORIES.map((category, index) => {
          const Icon = category.icon;
          const isSelected = value === category.value;

          return (
            <div
              key={category.value}
              ref={(el) => {
                tileRefs.current[index] = el;
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected || (value === null && index === 0) ? 0 : -1}
              className={`${styles.tile}${isSelected ? ` ${styles.tileSelected}` : ''}`}
              onClick={() => onChange(category.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <Icon className={styles.icon} aria-hidden="true" />
              <span className={styles.label}>{category.label}</span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
