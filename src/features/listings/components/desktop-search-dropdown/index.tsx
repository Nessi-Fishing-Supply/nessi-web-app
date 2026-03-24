'use client';

import type { AutocompleteSuggestion } from '../../types/search';
import type { ListingCategory } from '../../types/listing';
import Autocomplete from '../autocomplete';
import RecentSearches from '../recent-searches';
import SearchQuickCategories from '../search-quick-categories';
import styles from './desktop-search-dropdown.module.scss';

interface DesktopSearchDropdownProps {
  isOpen: boolean;
  query: string;
  suggestions: AutocompleteSuggestion[];
  showSuggestions: boolean;
  activeIndex: number;
  listId: string;
  recentSearches: string[];
  onSelectSuggestion: (suggestion: AutocompleteSuggestion) => void;
  onSelectRecentSearch: (term: string) => void;
  onRemoveRecentSearch: (term: string) => void;
  onClearRecentSearches: () => void;
  onSelectCategory: (category: ListingCategory) => void;
}

export default function DesktopSearchDropdown({
  isOpen,
  query,
  suggestions,
  showSuggestions,
  activeIndex,
  listId,
  recentSearches,
  onSelectSuggestion,
  onSelectRecentSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
  onSelectCategory,
}: DesktopSearchDropdownProps) {
  if (!isOpen) return null;

  const showOnFocusContent = query.length < 2;

  return (
    <div className={styles.dropdown} aria-label="Search suggestions">
      {showOnFocusContent ? (
        <>
          <RecentSearches
            searches={recentSearches}
            onSelect={onSelectRecentSearch}
            onRemove={onRemoveRecentSearch}
            onClearAll={onClearRecentSearches}
          />
          {recentSearches.length > 0 && <div className={styles.divider} />}
          <SearchQuickCategories onSelect={onSelectCategory} />
        </>
      ) : (
        <>
          {showSuggestions && (
            <>
              <div className={styles.sectionHeader}>Suggestions</div>
              <Autocomplete
                suggestions={suggestions}
                isOpen={showSuggestions}
                onSelect={onSelectSuggestion}
                activeIndex={activeIndex}
                listId={listId}
              />
            </>
          )}
          <div className={styles.divider} />
          <SearchQuickCategories onSelect={onSelectCategory} />
        </>
      )}
    </div>
  );
}
