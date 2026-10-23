'use client';

import React from 'react';
import styles from './pill-selector.module.scss';

interface PillSelectorProps {
  options: readonly { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label: string;
}

const PillSelector: React.FC<PillSelectorProps> = ({ options, selected, onChange, label }) => {
  const handleToggle = (value: string) => {
    const isSelected = selected.includes(value);
    const updated = isSelected ? selected.filter((v) => v !== value) : [...selected, value];
    onChange(updated);
  };

  return (
    <div role="group" aria-label={label} className={styles.container}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => handleToggle(option.value)}
            className={`${styles.pill}${isSelected ? ` ${styles.selected}` : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default PillSelector;
