'use client';

import styles from './species-browse-row.module.scss';

export type SpeciesItem = {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
};

interface SpeciesBrowseRowProps {
  species: SpeciesItem[];
  onSelect: (id: string) => void;
  className?: string;
}

export default function SpeciesBrowseRow({ species, onSelect, className }: SpeciesBrowseRowProps) {
  return (
    <div
      className={`${styles.row}${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Browse by species"
    >
      {species.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.item} ${item.isActive ? styles.active : styles.inactive}`}
          onClick={() => onSelect(item.id)}
          aria-pressed={item.isActive}
        >
          <span className={styles.circle} aria-hidden="true">
            <span className={styles.emoji}>{item.emoji}</span>
          </span>
          <span className={styles.name}>{item.name}</span>
        </button>
      ))}
    </div>
  );
}
