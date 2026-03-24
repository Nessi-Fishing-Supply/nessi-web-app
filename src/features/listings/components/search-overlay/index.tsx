'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useRouter } from 'next/navigation';
import { HiSearch, HiOutlineX } from 'react-icons/hi';
import { useAutocomplete } from '../../hooks/use-autocomplete';
import { useRecentSearches } from '../../hooks/use-recent-searches';
import Autocomplete from '../autocomplete';
import RecentSearches from '../recent-searches';
import SearchQuickCategories from '../search-quick-categories';
import type { AutocompleteSuggestion } from '../../types/search';
import type { ListingCategory } from '../../types/listing';
import styles from './search-overlay.module.scss';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const { data: suggestions = [] } = useAutocomplete(query);
  const showSuggestions = suggestions.length > 0 && query.length >= 2;

  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
    useRecentSearches();

  // Store triggering element and auto-focus input on open
  // Note: state (query, activeIndex) resets automatically on remount since component returns null when !isOpen
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key + focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && overlayRef.current) {
        const focusableElements = overlayRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navigateToSearch = useCallback(
    (term: string) => {
      addRecentSearch(term);
      router.push(`/search?q=${encodeURIComponent(term.trim())}`);
      onClose();
    },
    [router, onClose, addRecentSearch],
  );

  const handleCategorySelect = useCallback(
    (category: ListingCategory) => {
      router.push(`/search?category=${category}`);
      onClose();
    },
    [router, onClose],
  );

  const handleRecentSearchSelect = useCallback(
    (term: string) => {
      navigateToSearch(term);
    },
    [navigateToSearch],
  );

  const handleSelect = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      setQuery(suggestion.term);
      navigateToSearch(suggestion.term);
    },
    [navigateToSearch],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleSelect(suggestions[activeIndex]);
    } else {
      navigateToSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev >= suggestions.length - 1 ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    }
  };

  const clearInput = () => {
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div
        className={styles.content}
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        tabIndex={-1}
      >
        <div className={styles.header}>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close search"
            type="button"
          >
            <HiOutlineX aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.inputWrapper}>
            <HiSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              className={styles.input}
              placeholder="Search fishing gear..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              aria-autocomplete="list"
              aria-controls={showSuggestions ? 'search-overlay-suggestions' : undefined}
              aria-activedescendant={
                activeIndex >= 0 ? `search-overlay-suggestions-option-${activeIndex}` : undefined
              }
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearInput}
                aria-label="Clear search"
              >
                <HiOutlineX aria-hidden="true" />
              </button>
            )}
          </div>
          <Autocomplete
            suggestions={suggestions}
            isOpen={showSuggestions}
            onSelect={handleSelect}
            activeIndex={activeIndex}
            listId="search-overlay-suggestions"
          />
          {query.length < 2 && (
            <div className={styles.onFocusContent}>
              <RecentSearches
                searches={recentSearches}
                onSelect={handleRecentSearchSelect}
                onRemove={removeRecentSearch}
                onClearAll={clearRecentSearches}
              />
              <SearchQuickCategories onSelect={handleCategorySelect} />
            </div>
          )}
        </form>
      </div>
    </div>,
    document.getElementById('modal-root') as HTMLElement,
  );
}
