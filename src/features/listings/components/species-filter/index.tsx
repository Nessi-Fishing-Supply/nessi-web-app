'use client';

import { SPECIES_LIST } from '@/features/listings/config/species';
import type { Species } from '@/features/listings/config/species';
import styles from './species-filter.module.scss';

interface SpeciesFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  counts?: Partial<Record<string, number>>;
}

export default function SpeciesFilter({ selected, onChange, counts }: SpeciesFilterProps) {
  function handleChange(value: Species) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className="sr-only">Filter by species</legend>

      <div className={styles.list}>
        {SPECIES_LIST.map((species) => {
          const inputId = `species-filter-${species.value}`;
          const isChecked = selected.includes(species.value);
          const count = counts?.[species.value];

          return (
            <label key={species.value} htmlFor={inputId} className={styles.row}>
              <input
                type="checkbox"
                id={inputId}
                value={species.value}
                checked={isChecked}
                onChange={() => handleChange(species.value)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkbox} aria-hidden="true" />
              <span className={styles.label}>{species.label}</span>
              {counts !== undefined && <span className={styles.count}>({count ?? 0})</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
