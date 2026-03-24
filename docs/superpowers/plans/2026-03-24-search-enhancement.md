# Search Enhancement & UI Facelift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the search experience with recent searches, category quick-browse, lowered autocomplete threshold, and a full UI facelift for the search bar, search results page, and filter system.

**Architecture:** Data layer hooks feed presentational components (RecentSearches, SearchQuickCategories) which are consumed by a new DesktopSearchDropdown and the existing SearchOverlay. The search results page gets an Etsy-style top filter bar with animated toggle sidebar (CSS Grid transition), replacing the permanent rail. Mobile filters become a full-screen takeover instead of a bottom sheet.

**Tech Stack:** Next.js 16 App Router, React, Tanstack Query, SCSS Modules, CSS custom properties, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-search-enhancement-design.md`

**Branch:** `feat/search-enhancement-ui-facelift`

---

## File Map

| Action | Path                                                                                           | Responsibility                                     |
| ------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Create | `src/features/listings/hooks/use-recent-searches.ts`                                           | localStorage-backed recent searches hook           |
| Create | `src/features/listings/hooks/__tests__/use-recent-searches.test.ts`                            | Unit tests for recent searches                     |
| Create | `src/features/listings/components/recent-searches/index.tsx`                                   | Recent searches list (controlled)                  |
| Create | `src/features/listings/components/recent-searches/recent-searches.module.scss`                 | Styles                                             |
| Create | `src/features/listings/components/search-quick-categories/index.tsx`                           | Category chip row (controlled)                     |
| Create | `src/features/listings/components/search-quick-categories/search-quick-categories.module.scss` | Styles                                             |
| Create | `src/features/listings/components/desktop-search-dropdown/index.tsx`                           | Multi-section dropdown (controlled)                |
| Create | `src/features/listings/components/desktop-search-dropdown/desktop-search-dropdown.module.scss` | Styles                                             |
| Modify | `src/features/listings/hooks/use-autocomplete.ts`                                              | Threshold 3→2                                      |
| Modify | `src/app/api/listings/autocomplete/route.ts`                                                   | Threshold 3→2                                      |
| Modify | `src/features/listings/hooks/use-search-filters.ts`                                            | Exclude `sort` from active filter count            |
| Modify | `src/components/navigation/navbar/index.tsx`                                                   | Pill search bar, integrate dropdown, threshold 3→2 |
| Modify | `src/components/navigation/navbar/navbar.module.scss`                                          | Pill-shaped search bar styles                      |
| Modify | `src/features/listings/components/autocomplete/index.tsx`                                      | Add search icon per suggestion, section header     |
| Modify | `src/features/listings/components/autocomplete/autocomplete.module.scss`                       | Polish suggestion styling                          |
| Modify | `src/features/listings/components/search-overlay/index.tsx`                                    | Add on-focus content, threshold 3→2                |
| Modify | `src/features/listings/components/search-overlay/search-overlay.module.scss`                   | Styles for new sections                            |
| Modify | `src/app/(frontend)/search/search-results.tsx`                                                 | Top filter bar + toggle sidebar layout             |
| Modify | `src/app/(frontend)/search/search-results.module.scss`                                         | CSS Grid layout with sidebar transition            |
| Modify | `src/features/listings/components/filter-panel/index.tsx`                                      | Animated sidebar desktop + full-screen mobile      |
| Modify | `src/features/listings/components/filter-panel/filter-panel.module.scss`                       | Sidebar animation, full-screen mobile              |
| Modify | `src/features/listings/components/filter-chips/filter-chips.module.scss`                       | Polish chip styling                                |
| Modify | `src/features/listings/CLAUDE.md`                                                              | Document new hooks and components                  |

---

## Task 1: Create branch and `useRecentSearches` hook with tests

**Files:**

- Create: `src/features/listings/hooks/use-recent-searches.ts`
- Create: `src/features/listings/hooks/__tests__/use-recent-searches.test.ts`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/search-enhancement-ui-facelift
```

- [ ] **Step 2: Write the test file**

Create `src/features/listings/hooks/__tests__/use-recent-searches.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentSearches } from '../use-recent-searches';

const STORAGE_KEY = 'nessi-recent-searches';

beforeEach(() => {
  localStorage.clear();
});

describe('useRecentSearches', () => {
  it('returns empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('returns parsed items from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['shimano', 'fly rod']));
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual(['shimano', 'fly rod']);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('adds a search term', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('shimano'));
    expect(result.current.recentSearches).toEqual(['shimano']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['shimano']);
  });

  it('moves duplicate to front', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['rod', 'reel', 'lure']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('reel'));
    expect(result.current.recentSearches).toEqual(['reel', 'rod', 'lure']);
  });

  it('caps at 5 entries, evicting oldest', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['a', 'b', 'c', 'd', 'e']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('f'));
    expect(result.current.recentSearches).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(result.current.recentSearches).toHaveLength(5);
  });

  it('trims whitespace and ignores empty terms', () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addRecentSearch('  '));
    expect(result.current.recentSearches).toEqual([]);
    act(() => result.current.addRecentSearch('  shimano  '));
    expect(result.current.recentSearches).toEqual(['shimano']);
  });

  it('removes a specific term', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['rod', 'reel', 'lure']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.removeRecentSearch('reel'));
    expect(result.current.recentSearches).toEqual(['rod', 'lure']);
  });

  it('clears all searches', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['rod', 'reel']));
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.clearRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test:run -- src/features/listings/hooks/__tests__/use-recent-searches.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Write the hook implementation**

Create `src/features/listings/hooks/use-recent-searches.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'nessi-recent-searches';
const MAX_RECENT = 5;

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeToStorage(items: string[]) {
  if (items.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(readFromStorage);

  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
      writeToStorage(next);
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((t) => t !== term);
      writeToStorage(next);
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    writeToStorage([]);
    setRecentSearches([]);
  }, []);

  return { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:run -- src/features/listings/hooks/__tests__/use-recent-searches.test.ts`
Expected: all 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/listings/hooks/use-recent-searches.ts src/features/listings/hooks/__tests__/use-recent-searches.test.ts
git commit -m "feat(search): add useRecentSearches hook with localStorage + tests"
```

---

## Task 2: Lower autocomplete threshold to 2 chars (all 4 locations)

**Files:**

- Modify: `src/features/listings/hooks/use-autocomplete.ts`
- Modify: `src/app/api/listings/autocomplete/route.ts`
- Modify: `src/components/navigation/navbar/index.tsx` (line 82)
- Modify: `src/features/listings/components/search-overlay/index.tsx` (line 29)

- [ ] **Step 1: Update the hook**

In `src/features/listings/hooks/use-autocomplete.ts`, line 12:
Change `enabled: debouncedQuery.length >= 3,` → `enabled: debouncedQuery.length >= 2,`

- [ ] **Step 2: Update the API route**

In `src/app/api/listings/autocomplete/route.ts`, line 15:
Change `if (!rawQ || rawQ.trim().length < 3)` → `if (!rawQ || rawQ.trim().length < 2)`
Also update the error message on line 16: `'Query must be at least 2 characters'`

- [ ] **Step 3: Update the navbar guard**

In `src/components/navigation/navbar/index.tsx`, line 82:
Change `searchQuery.length >= 3` → `searchQuery.length >= 2`

- [ ] **Step 4: Update the overlay guard**

In `src/features/listings/components/search-overlay/index.tsx`, line 29:
Change `query.length >= 3` → `query.length >= 2`

- [ ] **Step 5: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm typecheck`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/features/listings/hooks/use-autocomplete.ts src/app/api/listings/autocomplete/route.ts src/components/navigation/navbar/index.tsx src/features/listings/components/search-overlay/index.tsx
git commit -m "feat(search): lower autocomplete threshold from 3 to 2 chars"
```

---

## Task 3: Exclude `sort` from active filter count

**Files:**

- Modify: `src/features/listings/hooks/use-search-filters.ts`

- [ ] **Step 1: Update `countActiveFilters`**

In `src/features/listings/hooks/use-search-filters.ts`, line 55:
Change `if (key === 'q' || key === 'page' || key === 'limit') continue;`
→ `if (key === 'q' || key === 'page' || key === 'limit' || key === 'sort') continue;`

- [ ] **Step 2: Update `hasActiveFilters`**

In the same file, line 127:
Change `if (key !== 'q' && key !== 'page' && key !== 'limit') return true;`
→ `if (key !== 'q' && key !== 'page' && key !== 'limit' && key !== 'sort') return true;`

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm typecheck`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/hooks/use-search-filters.ts
git commit -m "fix(search): exclude sort from active filter count"
```

---

## Task 4: Create `RecentSearches` presentational component

**Files:**

- Create: `src/features/listings/components/recent-searches/index.tsx`
- Create: `src/features/listings/components/recent-searches/recent-searches.module.scss`

- [ ] **Step 1: Create the component**

Create `src/features/listings/components/recent-searches/index.tsx`:

```tsx
'use client';

import { HiOutlineClock, HiOutlineX } from 'react-icons/hi';
import styles from './recent-searches.module.scss';

interface RecentSearchesProps {
  searches: string[];
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClearAll: () => void;
}

export default function RecentSearches({
  searches,
  onSelect,
  onRemove,
  onClearAll,
}: RecentSearchesProps) {
  if (searches.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent searches</h3>
        <button type="button" className={styles.clearAll} onClick={onClearAll}>
          Clear all
        </button>
      </div>
      <ul className={styles.list} role="list">
        {searches.map((term) => (
          <li key={term} className={styles.item} role="listitem">
            <button
              type="button"
              className={styles.termButton}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(term);
              }}
            >
              <HiOutlineClock className={styles.clockIcon} aria-hidden="true" />
              <span>{term}</span>
            </button>
            <button
              type="button"
              className={styles.removeButton}
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(term);
              }}
              aria-label={`Remove ${term} from recent searches`}
            >
              <HiOutlineX aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create the SCSS module**

Create `src/features/listings/components/recent-searches/recent-searches.module.scss`:

```scss
.container {
  padding: var(--spacing-300) var(--spacing-400);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-200);
}

.title {
  font-size: var(--font-size-200);
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.clearAll {
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-400);
  color: var(--color-primary-500);
  font-weight: 600;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    border-radius: var(--radius-100);
  }
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--spacing-200);
  min-height: 44px;
}

.termButton {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-200);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-200) var(--spacing-100);
  border-radius: var(--radius-200);
  font-size: var(--font-size-600);
  color: var(--color-neutral-800);
  text-align: left;

  &:hover {
    background-color: var(--color-neutral-100);
    color: var(--color-primary-500);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}

.clockIcon {
  width: var(--spacing-500);
  height: var(--spacing-500);
  color: var(--color-neutral-400);
  flex-shrink: 0;
}

.removeButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-neutral-400);
  border-radius: var(--radius-200);

  > svg {
    width: var(--spacing-400);
    height: var(--spacing-400);
  }

  &:hover {
    color: var(--color-neutral-700);
    background-color: var(--color-neutral-100);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/components/recent-searches/
git commit -m "feat(search): add RecentSearches presentational component"
```

---

## Task 5: Create `SearchQuickCategories` presentational component

**Files:**

- Create: `src/features/listings/components/search-quick-categories/index.tsx`
- Create: `src/features/listings/components/search-quick-categories/search-quick-categories.module.scss`

- [ ] **Step 1: Create the component**

Create `src/features/listings/components/search-quick-categories/index.tsx`:

```tsx
'use client';

import { LISTING_CATEGORIES } from '../../constants/category';
import type { ListingCategory } from '../../types/listing';
import styles from './search-quick-categories.module.scss';

interface SearchQuickCategoriesProps {
  onSelect: (category: ListingCategory) => void;
}

export default function SearchQuickCategories({ onSelect }: SearchQuickCategoriesProps) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Categories</h3>
      <ul className={styles.list} role="list">
        {LISTING_CATEGORIES.map((entry) => {
          const Icon = entry.icon;
          return (
            <li key={entry.value} role="listitem">
              <button
                type="button"
                className={styles.chip}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(entry.value);
                }}
              >
                <Icon className={styles.chipIcon} aria-hidden="true" />
                <span>{entry.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create the SCSS module**

Create `src/features/listings/components/search-quick-categories/search-quick-categories.module.scss`:

```scss
@use '@/styles/mixins/breakpoints' as *;

.container {
  padding: var(--spacing-200) var(--spacing-400) var(--spacing-300);
}

.title {
  font-size: var(--font-size-200);
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 var(--spacing-200);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: var(--spacing-200);
  overflow-x: auto;

  @include breakpoint(md) {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-100);
  padding: var(--spacing-200) var(--spacing-300);
  background-color: var(--color-neutral-100);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-700);
  cursor: pointer;
  font-size: var(--font-size-400);
  color: var(--color-neutral-700);
  white-space: nowrap;
  min-height: 44px;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;

  &:hover {
    border-color: var(--color-primary-500);
    color: var(--color-primary-500);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}

.chipIcon {
  width: var(--spacing-400);
  height: var(--spacing-400);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/components/search-quick-categories/
git commit -m "feat(search): add SearchQuickCategories chip row component"
```

---

## Task 6: Create `DesktopSearchDropdown` component

**Files:**

- Create: `src/features/listings/components/desktop-search-dropdown/index.tsx`
- Create: `src/features/listings/components/desktop-search-dropdown/desktop-search-dropdown.module.scss`

- [ ] **Step 1: Create the component**

Create `src/features/listings/components/desktop-search-dropdown/index.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the SCSS module**

Create `src/features/listings/components/desktop-search-dropdown/desktop-search-dropdown.module.scss`:

```scss
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-top: none;
  border-radius: 0 0 var(--radius-500) var(--radius-500);
  box-shadow: var(--shadow-300);
  max-height: 400px;
  overflow-y: auto;
}

.divider {
  height: 1px;
  background-color: var(--color-neutral-200);
  margin: 0 var(--spacing-400);
}

.sectionHeader {
  font-size: var(--font-size-200);
  font-weight: 600;
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: var(--spacing-300) var(--spacing-400) var(--spacing-100);
}
```

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/components/desktop-search-dropdown/
git commit -m "feat(search): add DesktopSearchDropdown multi-section component"
```

---

## Task 7: Polish `Autocomplete` component with search icons

**Files:**

- Modify: `src/features/listings/components/autocomplete/index.tsx`
- Modify: `src/features/listings/components/autocomplete/autocomplete.module.scss`

- [ ] **Step 1: Add search icon to each suggestion item**

Update `src/features/listings/components/autocomplete/index.tsx`:

- Add import: `import { HiSearch } from 'react-icons/hi';`
- Wrap each suggestion item content in icon + text:

```tsx
<li ...>
  <HiSearch className={styles.icon} aria-hidden="true" />
  <span>{suggestion.term}</span>
</li>
```

- [ ] **Step 2: Update SCSS for icon layout**

Update `src/features/listings/components/autocomplete/autocomplete.module.scss`:

Replace the entire file with:

```scss
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--spacing-200);
  padding: var(--spacing-300) var(--spacing-400);
  cursor: pointer;
  font-size: var(--font-size-600);
  color: var(--color-neutral-800);
  border-radius: var(--radius-200);
  margin: 0 var(--spacing-200);

  &:hover,
  &.active {
    background-color: var(--color-neutral-100);
    color: var(--color-primary-500);
  }
}

.icon {
  width: var(--spacing-400);
  height: var(--spacing-400);
  color: var(--color-neutral-400);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/components/autocomplete/
git commit -m "style(search): polish autocomplete with search icons and spacing"
```

---

## Task 8: Redesign navbar search bar + integrate dropdown

**Files:**

- Modify: `src/components/navigation/navbar/index.tsx`
- Modify: `src/components/navigation/navbar/navbar.module.scss`

- [ ] **Step 1: Update navbar component**

In `src/components/navigation/navbar/index.tsx`:

1. Add imports:

   ```tsx
   import { HiOutlineX } from 'react-icons/hi';
   import DesktopSearchDropdown from '@/features/listings/components/desktop-search-dropdown';
   import { useRecentSearches } from '@/features/listings/hooks/use-recent-searches';
   import type { ListingCategory } from '@/features/listings/types/listing';
   ```

2. Inside the `Navbar` component, add the recent searches hook:

   ```tsx
   const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
     useRecentSearches();
   ```

3. Add a `showDropdown` state (rename `showAutocomplete` → `showDropdown`):
   - The dropdown should open on focus (not just when suggestions exist)
   - Replace `showAutocomplete` usage throughout with `showDropdown`
   - `setShowDropdown(true)` on focus and input change
   - `setTimeout(() => setShowDropdown(false), 200)` on blur

4. Update `handleSearchSubmit` to also call `addRecentSearch(query.trim())` before navigating

5. Update `handleSearchSelect` to also call `addRecentSearch(suggestion.term)`

6. Add category select handler:

   ```tsx
   const handleCategorySelect = (category: ListingCategory) => {
     router.push(`/search?category=${category}`);
     setShowDropdown(false);
     searchInputRef.current?.blur();
   };
   ```

7. Add recent search select handler:

   ```tsx
   const handleRecentSearchSelect = (term: string) => {
     router.push(`/search?q=${encodeURIComponent(term)}`);
     setSearchQuery(term);
     setShowDropdown(false);
     searchInputRef.current?.blur();
   };
   ```

8. Replace the entire `<form>` block (lines 204-250 in the current file) with:

```tsx
<form className={styles.form} role="search" aria-label="Site search" onSubmit={handleSearchSubmit}>
  <label htmlFor="site-search" className="sr-only">
    Search fishing gear
  </label>
  <div className={styles.searchPill}>
    <span className={styles.searchPillIcon}>
      <HiSearch aria-hidden="true" />
    </span>
    <input
      ref={searchInputRef}
      id="site-search"
      type="search"
      placeholder="Search fishing gear..."
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
        setSearchActiveIndex(-1);
        setShowDropdown(true);
      }}
      onFocus={() => setShowDropdown(true)}
      onBlur={() => {
        setTimeout(() => setShowDropdown(false), 200);
      }}
      onKeyDown={handleSearchKeyDown}
      aria-autocomplete="list"
      aria-expanded={showDropdown}
      aria-controls={showDropdown ? 'desktop-search-suggestions' : undefined}
      aria-activedescendant={
        searchActiveIndex >= 0
          ? `desktop-search-suggestions-option-${searchActiveIndex}`
          : undefined
      }
      autoComplete="off"
    />
    {searchQuery && (
      <button
        type="button"
        className={styles.clearButton}
        onClick={() => {
          setSearchQuery('');
          setSearchActiveIndex(-1);
          searchInputRef.current?.focus();
        }}
        aria-label="Clear search"
      >
        <HiOutlineX aria-hidden="true" />
      </button>
    )}
    <button className={styles.searchSubmit} type="submit" aria-label="Submit search">
      <HiSearch aria-hidden="true" />
    </button>
  </div>
  <DesktopSearchDropdown
    isOpen={showDropdown}
    query={searchQuery}
    suggestions={searchSuggestions}
    showSuggestions={hasSearchSuggestions}
    activeIndex={searchActiveIndex}
    listId="desktop-search-suggestions"
    recentSearches={recentSearches}
    onSelectSuggestion={handleSearchSelect}
    onSelectRecentSearch={handleRecentSearchSelect}
    onRemoveRecentSearch={removeRecentSearch}
    onClearRecentSearches={clearRecentSearches}
    onSelectCategory={handleCategorySelect}
  />
</form>
```

Note: The `hasSearchSuggestions` guard also needs updating to use the new threshold:

```tsx
const hasSearchSuggestions = searchSuggestions.length > 0 && searchQuery.length >= 2;
```

- [ ] **Step 2: Update navbar SCSS**

Replace the `.form`, `.searchButton`, and add new styles in `navbar.module.scss`:

```scss
.form {
  position: relative;
  flex-grow: 1;
  display: none;

  @include breakpoint(md) {
    display: block;
  }
}

.searchPill {
  display: flex;
  align-items: center;
  border: 2px solid var(--color-neutral-800);
  border-radius: var(--radius-700);
  background-color: var(--color-white);
  overflow: hidden;
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: var(--color-primary-500);
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    padding: var(--spacing-200) var(--spacing-300);
    font-size: var(--font-size-600);
    background: transparent;
    color: var(--color-neutral-900);
    min-width: 0;

    &::placeholder {
      color: var(--color-neutral-500);
    }

    // Remove native clear button
    &::-webkit-search-cancel-button {
      display: none;
    }
  }
}

.searchPillIcon {
  display: flex;
  align-items: center;
  padding-left: var(--spacing-300);
  color: var(--color-neutral-500);

  > svg {
    width: var(--spacing-500);
    height: var(--spacing-500);
  }
}

.clearButton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-neutral-400);
  padding: 0;

  > svg {
    width: var(--spacing-400);
    height: var(--spacing-400);
  }

  &:hover {
    color: var(--color-neutral-700);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: -2px;
    border-radius: var(--radius-100);
  }
}

.searchSubmit {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-accent-500);
  border: none;
  cursor: pointer;
  padding: var(--spacing-200) var(--spacing-400);
  color: var(--color-white);
  border-radius: 0 var(--radius-700) var(--radius-700) 0;
  min-height: 44px;

  > svg {
    width: var(--spacing-500);
    height: var(--spacing-500);
  }

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent-500);
    outline-offset: 2px;
  }
}
```

Remove the old `.searchButton` class.

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/components/navigation/navbar/
git commit -m "feat(search): redesign navbar search bar as pill + integrate dropdown"
```

---

## Task 9: Enhance mobile `SearchOverlay` with on-focus content

**Files:**

- Modify: `src/features/listings/components/search-overlay/index.tsx`
- Modify: `src/features/listings/components/search-overlay/search-overlay.module.scss`

- [ ] **Step 1: Update overlay component**

In `src/features/listings/components/search-overlay/index.tsx`:

1. Add imports:

   ```tsx
   import { useRecentSearches } from '../../hooks/use-recent-searches';
   import RecentSearches from '../recent-searches';
   import SearchQuickCategories from '../search-quick-categories';
   import type { ListingCategory } from '../../types/listing';
   ```

2. Add recent searches hook inside the component:

   ```tsx
   const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } =
     useRecentSearches();
   ```

3. Update `navigateToSearch` to also call `addRecentSearch(term)`

4. Add category select handler:

   ```tsx
   const handleCategorySelect = useCallback(
     (category: ListingCategory) => {
       router.push(`/search?category=${category}`);
       onClose();
     },
     [router, onClose],
   );
   ```

5. Add recent search select handler:

   ```tsx
   const handleRecentSearchSelect = useCallback(
     (term: string) => {
       addRecentSearch(term);
       navigateToSearch(term);
     },
     [addRecentSearch, navigateToSearch],
   );
   ```

6. Below the `<Autocomplete>` component (or instead of it when query is empty), render on-focus content:
   ```tsx
   {
     query.length < 2 && (
       <div className={styles.onFocusContent}>
         <RecentSearches
           searches={recentSearches}
           onSelect={handleRecentSearchSelect}
           onRemove={removeRecentSearch}
           onClearAll={clearRecentSearches}
         />
         <SearchQuickCategories onSelect={handleCategorySelect} />
       </div>
     );
   }
   ```

- [ ] **Step 2: Add SCSS for on-focus content**

Add to `search-overlay.module.scss`:

```scss
.onFocusContent {
  flex: 1;
  overflow-y: auto;
  padding-top: var(--spacing-300);
}
```

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/components/search-overlay/
git commit -m "feat(search): add recent searches + category chips to mobile overlay"
```

---

## Task 10: Redesign `FilterPanel` — animated sidebar + full-screen mobile

**Files:**

- Modify: `src/features/listings/components/filter-panel/index.tsx`
- Modify: `src/features/listings/components/filter-panel/filter-panel.module.scss`

- [ ] **Step 1: Refactor FilterPanel with new props and full-screen mobile**

Update the `FilterPanelProps` interface and the component. Replace the entire file `src/features/listings/components/filter-panel/index.tsx` with:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { HiOutlineX } from 'react-icons/hi';
import type { SearchFilters } from '../../types/search';
import type { ListingCategory, ListingCondition } from '../../types/listing';
import CategoryFilter from '../category-filter';
import ConditionFilter from '../condition-filter';
import PriceRangeFilter from '../price-range-filter';
import StateFilter from '../state-filter';
import BooleanFilter from '../boolean-filter';
import SpeciesFilter from '../species-filter';
import ListingTypeFilter from '../listing-type-filter';
import styles from './filter-panel.module.scss';

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (key: string, value: unknown) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  resultCount: number | undefined;
  isOpen: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function FilterPanel({
  filters,
  onFilterChange,
  onClearAll,
  activeFilterCount,
  resultCount,
  isOpen,
  isMobileOpen,
  onMobileClose,
}: FilterPanelProps) {
  const mobileRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Store trigger element and lock scroll on mobile open
  useEffect(() => {
    if (isMobileOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => mobileRef.current?.focus());
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Restore focus when mobile closes
  useEffect(() => {
    if (!isMobileOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isMobileOpen]);

  // Escape key + focus trap for mobile
  useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onMobileClose();
        return;
      }

      if (event.key === 'Tab' && mobileRef.current) {
        const focusable = mobileRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onMobileClose]);

  const filterContent = (
    <>
      {activeFilterCount > 0 && (
        <button className={styles.clearAll} onClick={onClearAll} type="button">
          Clear all filters
        </button>
      )}

      <details className={styles.group} open>
        <summary className={styles.groupTitle}>Category</summary>
        <CategoryFilter
          selected={(filters.category ?? []) as ListingCategory[]}
          onChange={(val) => onFilterChange('category', val)}
        />
      </details>

      <details className={styles.group} open>
        <summary className={styles.groupTitle}>Condition</summary>
        <ConditionFilter
          selected={(filters.condition ?? []) as ListingCondition[]}
          onChange={(val) => onFilterChange('condition', val)}
        />
      </details>

      <details className={styles.group} open>
        <summary className={styles.groupTitle}>Price</summary>
        <PriceRangeFilter
          min={filters.price_min}
          max={filters.price_max}
          onChangeMin={(val) => onFilterChange('price_min', val)}
          onChangeMax={(val) => onFilterChange('price_max', val)}
        />
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>Location</summary>
        <StateFilter
          value={filters.location_state}
          onChange={(val) => onFilterChange('location_state', val)}
        />
      </details>

      <div className={styles.toggleGroup}>
        <BooleanFilter
          label="Free shipping"
          checked={filters.free_shipping ?? false}
          onChange={(val) => onFilterChange('free_shipping', val)}
        />
      </div>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>Species</summary>
        <SpeciesFilter
          selected={filters.species ?? []}
          onChange={(val) => onFilterChange('species', val)}
        />
      </details>

      <details className={styles.group}>
        <summary className={styles.groupTitle}>Listing Type</summary>
        <ListingTypeFilter
          selected={filters.listing_type ?? []}
          onChange={(val) => onFilterChange('listing_type', val)}
        />
      </details>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — visibility controlled by parent via isOpen */}
      {isOpen && (
        <aside className={styles.sidebar} role="region" aria-label="Filters">
          <h2 className={styles.sidebarTitle}>Filters</h2>
          {filterContent}
        </aside>
      )}

      {/* Mobile full-screen filter panel */}
      {isMobileOpen &&
        ReactDOM.createPortal(
          <div
            className={styles.mobileOverlay}
            ref={mobileRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className={styles.mobileHeader}>
              <h2 className={styles.mobileTitle}>Filters</h2>
              <button className={styles.resetButton} onClick={onClearAll} type="button">
                Reset
              </button>
            </div>
            <div className={styles.mobileBody}>{filterContent}</div>
            <div className={styles.mobileFooter}>
              <button className={styles.showResultsButton} onClick={onMobileClose} type="button">
                Show {resultCount !== undefined ? `${resultCount} ` : ''}results
              </button>
            </div>
          </div>,
          document.getElementById('modal-root') as HTMLElement,
        )}
    </>
  );
}
```

- [ ] **Step 2: Update FilterPanel SCSS**

Replace the desktop rail styles:

```scss
// Desktop sidebar — toggled by parent, not always visible
.sidebar {
  display: none;

  @include breakpoint(lg) {
    display: block;
    width: 260px;
    min-width: 260px;
    position: sticky;
    top: var(--spacing-400);
    max-height: calc(100vh - var(--spacing-900));
    overflow-y: auto;
    padding-right: var(--spacing-400);
    border-right: 1px solid var(--color-neutral-200);
  }
}
```

Replace mobile sheet styles with full-screen:

```scss
.mobileOverlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: var(--color-white);
  display: flex;
  flex-direction: column;
  outline: none;
}

.mobileHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-400);
  border-bottom: 1px solid var(--color-neutral-200);
  flex-shrink: 0;
}

.mobileTitle {
  font-size: var(--font-size-900);
  font-weight: 700;
  color: var(--color-neutral-900);
}

.resetButton {
  background: none;
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-700);
  padding: var(--spacing-200) var(--spacing-400);
  font-size: var(--font-size-400);
  color: var(--color-neutral-700);
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background-color: var(--color-neutral-100);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}

.mobileBody {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-300) 0;
}

.mobileFooter {
  flex-shrink: 0;
  padding: var(--spacing-400);
  border-top: 1px solid var(--color-neutral-200);
}
```

Keep the existing `.showResultsButton`, `.group`, `.groupTitle`, `.toggleGroup`, `.clearAll` styles.

- [ ] **Step 3: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/features/listings/components/filter-panel/
git commit -m "feat(search): refactor FilterPanel — animated sidebar + full-screen mobile"
```

---

## Task 11: Redesign search results page layout

**Files:**

- Modify: `src/app/(frontend)/search/search-results.tsx`
- Modify: `src/app/(frontend)/search/search-results.module.scss`

- [ ] **Step 1: Rewrite the SearchResults component**

Replace `src/app/(frontend)/search/search-results.tsx` with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { HiAdjustments } from 'react-icons/hi';
import { useSearchFilters } from '@/features/listings/hooks/use-search-filters';
import {
  useSearchListingsInfinite,
  useTrackSearchSuggestion,
} from '@/features/listings/hooks/use-search';
import FilterPanel from '@/features/listings/components/filter-panel';
import FilterChips from '@/features/listings/components/filter-chips';
import ListingCard from '@/features/listings/components/listing-card';
import ListingGrid from '@/features/listings/components/listing-grid';
import ListingSkeleton from '@/features/listings/components/listing-skeleton';
import InfiniteScroll from '@/features/listings/components/infinite-scroll';
import SortSelect from '@/features/listings/components/sort-select';
import EmptyState from '@/features/listings/components/empty-state';
import styles from './search-results.module.scss';

export default function SearchResults() {
  const { filters, setFilter, removeFilter, clearAllFilters, hasActiveFilters, activeFilterCount } =
    useSearchFilters();
  const trackSuggestion = useTrackSearchSuggestion();
  const hasTracked = useRef(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sort = filters.sort || (filters.q ? 'relevance' : 'newest');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useSearchListingsInfinite({
      ...filters,
      sort,
    });

  const listings = data?.pages.flatMap((page) => page.listings) ?? [];
  const total = data?.pages[0]?.total;

  useEffect(() => {
    hasTracked.current = false;
  }, [filters.q]);

  useEffect(() => {
    if (filters.q && filters.q.length >= 2 && !hasTracked.current) {
      trackSuggestion.mutate(filters.q);
      hasTracked.current = true;
    }
  }, [filters.q]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSortChange = (value: string) => {
    setFilter('sort', value);
  };

  const handleFilterToggle = () => {
    // Desktop: toggle sidebar. Mobile: open full-screen panel.
    if (window.innerWidth >= 1000) {
      setFiltersOpen((prev) => !prev);
    } else {
      setMobileFiltersOpen(true);
    }
  };

  return (
    <main className={styles.container}>
      {/* Top filter bar */}
      <div className={styles.filterBar}>
        <button
          type="button"
          className={`${styles.filterToggle}${filtersOpen || mobileFiltersOpen ? ` ${styles.filterToggleActive}` : ''}`}
          onClick={handleFilterToggle}
          aria-expanded={filtersOpen}
          aria-controls="filter-sidebar"
        >
          <HiAdjustments aria-hidden="true" />
          <span className={styles.filterToggleLabel}>
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </span>
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </button>

        {hasActiveFilters && (
          <FilterChips
            filters={filters}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
          />
        )}

        <div className={styles.sortWrapper}>
          <SortSelect value={sort} onChange={handleSortChange} showRelevance={!!filters.q} />
        </div>
      </div>

      {/* Main layout with optional sidebar */}
      <div className={`${styles.layout}${filtersOpen ? ` ${styles.sidebarOpen}` : ''}`}>
        <FilterPanel
          filters={filters}
          onFilterChange={(key, value) =>
            setFilter(key, value as string | string[] | number | boolean | undefined)
          }
          onClearAll={clearAllFilters}
          activeFilterCount={activeFilterCount}
          resultCount={total}
          isOpen={filtersOpen}
          isMobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
        />
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {total !== undefined && filters.q
                ? `${total} result${total !== 1 ? 's' : ''} for "${filters.q}"`
                : 'Search Results'}
            </h1>
          </div>

          {isLoading ? (
            <ListingGrid>
              <ListingSkeleton count={8} />
            </ListingGrid>
          ) : listings.length === 0 && hasActiveFilters ? (
            <EmptyState
              message="Nothing here yet"
              description="Try adjusting your filters or search terms."
              ctaLabel="Clear all filters"
              ctaHref={filters.q ? `/search?q=${encodeURIComponent(filters.q)}` : '/search'}
            />
          ) : listings.length === 0 ? (
            <EmptyState
              message={filters.q ? `No results for "${filters.q}"` : 'No results found'}
              description={
                filters.q
                  ? 'Try a different search term.'
                  : 'Try different keywords or browse a category.'
              }
              ctaLabel="Browse all listings"
              ctaHref="/"
            />
          ) : (
            <InfiniteScroll
              onLoadMore={fetchNextPage}
              hasMore={!!hasNextPage}
              isLoading={isFetchingNextPage}
            >
              <ListingGrid>
                {listings.map((listing, index) => (
                  <ListingCard key={listing.id} listing={listing} priority={index === 0} />
                ))}
              </ListingGrid>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </main>
  );
}
```

Note: `SortSelect` moved from the `.header` into the top `.filterBar`. The `FilterChips` also moved from inside `.content` into the filter bar.

- [ ] **Step 2: Update search results SCSS**

Replace `src/app/(frontend)/search/search-results.module.scss`:

```scss
@use '@/styles/mixins/breakpoints' as *;

.container {
  padding: var(--spacing-500) var(--spacing-300);

  @include breakpoint(md) {
    padding: var(--spacing-700) var(--spacing-500);
  }
}

.filterBar {
  display: flex;
  align-items: center;
  gap: var(--spacing-300);
  margin-bottom: var(--spacing-400);
  flex-wrap: nowrap;
  overflow-x: auto;

  @include breakpoint(md) {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

.filterToggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-200);
  padding: var(--spacing-200) var(--spacing-300);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-700);
  background-color: var(--color-white);
  font-size: var(--font-size-600);
  font-weight: 600;
  color: var(--color-neutral-900);
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  flex-shrink: 0;

  > svg {
    width: var(--spacing-400);
    height: var(--spacing-400);
  }

  &:hover {
    background-color: var(--color-neutral-100);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
}

.filterToggleActive {
  background-color: var(--color-primary-500);
  color: var(--color-white);
  border-color: var(--color-primary-500);

  &:hover {
    opacity: 0.9;
  }
}

.filterToggleLabel {
  display: none;

  @include breakpoint(md) {
    display: inline;
  }
}

.filterBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: var(--color-accent-500);
  color: var(--color-white);
  font-size: var(--font-size-200);
  font-weight: 700;
}

.sortWrapper {
  margin-left: auto;
  flex-shrink: 0;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-400);
  transition: grid-template-columns 0.3s ease;

  @include breakpoint(lg) {
    &.sidebarOpen {
      grid-template-columns: 260px 1fr;
    }
  }
}

.content {
  min-width: 0;
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-300);
  margin-bottom: var(--spacing-500);

  @include breakpoint(md) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.title {
  font-size: var(--font-size-1100);
  font-weight: 700;
  color: var(--color-neutral-900);
  margin: 0;

  @include breakpoint(md) {
    font-size: var(--font-size-1300);
  }
}
```

- [ ] **Step 3: Update filter chips SCSS for inline rendering**

The `FilterChips` component now renders inline within the filter bar (not as a standalone block). Update `src/features/listings/components/filter-chips/filter-chips.module.scss`:

Change `.container` to remove `margin-bottom` (the filter bar handles spacing):

```scss
.container {
  display: flex;
  align-items: center;
  gap: var(--spacing-300);
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 4: Run quality checks**

Run: `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add src/app/(frontend)/search/search-results.tsx src/app/(frontend)/search/search-results.module.scss src/features/listings/components/filter-chips/filter-chips.module.scss
git commit -m "feat(search): redesign search results with top filter bar + toggle sidebar"
```

---

## Task 12: Update `listings/CLAUDE.md` and run full validation

**Files:**

- Modify: `src/features/listings/CLAUDE.md`

- [ ] **Step 1: Update feature documentation**

Add the new hooks and components to the relevant tables in `src/features/listings/CLAUDE.md`:

Hooks table: add `useRecentSearches()` entry
Components table: add `RecentSearches`, `SearchQuickCategories`, `DesktopSearchDropdown` entries
Update `useAutocomplete` description: "min 2 chars" instead of "min 3 chars"

- [ ] **Step 2: Run full validation suite**

Run: `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles && pnpm test:run`
Expected: all pass

- [ ] **Step 3: Fix any issues found**

Address any lint, type, or test failures.

- [ ] **Step 4: Format if needed**

Run: `pnpm format`

- [ ] **Step 5: Commit**

```bash
git add src/features/listings/CLAUDE.md
git commit -m "docs: update listings CLAUDE.md with new search hooks and components"
```

---

## Task 13: Visual verification and polish

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Verify desktop search bar**

Open `http://localhost:3000`. Verify:

- Pill-shaped search bar with orange button renders correctly
- Focusing the input opens dropdown with category chips
- Typing 2+ chars shows autocomplete suggestions with search icons
- Selecting a suggestion navigates to `/search?q=...`
- Submitting navigates and records recent search
- Next focus shows the recent search in the dropdown

- [ ] **Step 3: Verify mobile search overlay**

Resize to mobile viewport (<600px). Verify:

- Mobile search icon opens full-screen overlay
- On focus: recent searches + category chips visible
- Typing shows autocomplete
- All navigation works

- [ ] **Step 4: Verify search results page**

Navigate to `/search?q=rod`. Verify:

- Top filter bar with toggle button + chips + sort
- Clicking "Show filters" slides sidebar in on desktop
- Grid resizes smoothly from 4→3 columns
- On mobile: filter button opens full-screen panel
- Full-screen panel has "Filters" header, "Reset" button, sticky footer

- [ ] **Step 5: Fix any visual issues**

Address spacing, alignment, color token mismatches.

- [ ] **Step 6: Final commit if polish changes were made**

```bash
git add -A
git commit -m "style(search): visual polish from manual verification"
```
