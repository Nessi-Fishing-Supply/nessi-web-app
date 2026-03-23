'use client';

import styles from './sort-select.module.scss';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Most recent' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'watched', label: 'Most watched' },
] as const;

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  showRelevance?: boolean;
}

export default function SortSelect({ value, onChange, showRelevance = false }: SortSelectProps) {
  return (
    <div className={styles.wrapper}>
      <label htmlFor="sort-select" className={styles.label}>
        Sort by
      </label>
      <select
        id="sort-select"
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {showRelevance && <option value="relevance">Relevance</option>}
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
