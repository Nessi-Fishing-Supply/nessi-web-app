'use client';

import styles from './listing-type-filter.module.scss';

const LISTING_TYPES = [
  { value: 'used', label: 'Used' },
  { value: 'custom', label: 'Custom / Handmade' },
  { value: 'new', label: 'New' },
];

interface ListingTypeFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function ListingTypeFilter({ selected, onChange }: ListingTypeFilterProps) {
  function handleChange(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Filter by listing type</legend>

      <div className={styles.list}>
        {LISTING_TYPES.map((type) => {
          const inputId = `listing-type-filter-${type.value}`;
          const isChecked = selected.includes(type.value);

          return (
            <label key={type.value} htmlFor={inputId} className={styles.row}>
              <input
                type="checkbox"
                id={inputId}
                value={type.value}
                checked={isChecked}
                onChange={() => handleChange(type.value)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkbox} aria-hidden="true" />
              <span className={styles.label}>{type.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
