'use client';

import { HiSearch } from 'react-icons/hi';
import type { AutocompleteSuggestion } from '../../types/search';
import styles from './autocomplete.module.scss';

interface AutocompleteProps {
  suggestions: AutocompleteSuggestion[];
  isOpen: boolean;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  activeIndex: number;
  listId: string;
}

export default function Autocomplete({
  suggestions,
  isOpen,
  onSelect,
  activeIndex,
  listId,
}: AutocompleteProps) {
  if (!isOpen || suggestions.length === 0) return null;

  return (
    <ul className={styles.list} id={listId} role="listbox" aria-label="Search suggestions">
      {suggestions.map((suggestion, index) => (
        <li
          key={`${suggestion.type}-${suggestion.term}`}
          id={`${listId}-option-${index}`}
          role="option"
          aria-selected={activeIndex === index}
          className={`${styles.item}${activeIndex === index ? ` ${styles.active}` : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(suggestion);
          }}
        >
          <HiSearch className={styles.icon} aria-hidden="true" />
          <span>{suggestion.term}</span>
        </li>
      ))}
    </ul>
  );
}
