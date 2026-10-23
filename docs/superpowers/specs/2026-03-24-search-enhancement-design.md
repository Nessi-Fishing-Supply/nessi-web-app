# Search Enhancement & UI Facelift

**Date:** 2026-03-24
**Status:** Draft
**Closes:** #134, #135, #136, #137

## Summary

Enhance the existing search experience with recent searches, category quick-browse, lowered autocomplete threshold, and a full UI facelift for the search bar, autocomplete dropdown, search results page, and filter system. No live listing results in the dropdown — follows the standard Etsy/Reverb redirect-to-`/search` pattern.

## Design Decisions

| Decision                        | Choice                                          | Rationale                                                                                    |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Live search results in dropdown | **No**                                          | Reverb, Etsy, eBay don't do it. Performance concern at scale. Redundant with /search page.   |
| Search bar style                | **Pill-shaped with orange search button**       | Modern, clean, prominent CTA. Matches brand accent.                                          |
| Autocomplete threshold          | **2 chars** (down from 3)                       | Better responsiveness without performance cost (autocomplete is lightweight)                 |
| Desktop filter layout           | **Etsy-style: top filter bar + toggle sidebar** | More grid space by default (4 cols). Familiar pattern. Sidebar animates in, content resizes. |
| Mobile filter layout            | **Full-screen takeover** (not bottom sheet)     | Matches Etsy mobile pattern. More room for filter groups. Sticky "Show results" footer.      |
| On-focus dropdown content       | **Recent searches + category chips**            | Helps discovery and repeat searches. Standard marketplace pattern.                           |
| Suggestion select behavior      | **Navigate to /search** (unchanged)             | Standard pattern. No fill-input-only behavior.                                               |

## Scope

### In Scope

1. **Data layer hooks** — `useRecentSearches` (localStorage), lower autocomplete to 2 chars
2. **Search bar redesign** — pill-shaped input, integrated orange search button, clear button, polished dropdown
3. **Desktop search dropdown** — on-focus: recent searches + category chips. On type: autocomplete suggestions with section headers and icons
4. **Mobile search overlay enhancement** — same on-focus content (recent searches + category chips) added to existing overlay
5. **Search results page filter redesign** — Etsy-style top filter bar with toggle sidebar
6. **Mobile filter redesign** — full-screen filter panel replacing bottom sheet

### Out of Scope

- `useLiveSearch` hook (dropped — no inline listing results)
- `LiveSearchResultItem` / `LiveSearchResults` components (dropped)
- Changes to `/api/listings/search` route logic
- Changes to listing cards or grid component
- Pagination/infinite scroll changes

## Architecture

### 1. Data Layer

#### `useRecentSearches` Hook

**File:** `src/features/listings/hooks/use-recent-searches.ts`

```
Returns: {
  recentSearches: string[]        // max 5, most recent first
  addRecentSearch: (term) => void // deduplicates, moves to front
  removeRecentSearch: (term) => void
  clearRecentSearches: () => void
}
```

- localStorage key: `nessi-recent-searches`
- SSR-safe: `useState` with lazy initializer checking `typeof window !== 'undefined'`
- Capped at 5 entries
- Duplicate terms moved to front (not re-added)
- Unit tests required

#### Autocomplete Threshold Change

- `src/features/listings/hooks/use-autocomplete.ts`: change `>= 3` to `>= 2`
- `src/app/api/listings/autocomplete/route.ts`: change `< 3` to `< 2`
- `src/components/navigation/navbar/index.tsx`: change `searchQuery.length >= 3` to `>= 2` (line 82 guard)
- `src/features/listings/components/search-overlay/index.tsx`: change `query.length >= 3` to `>= 2` (line 29 guard)

**Important:** There are 4 places where the threshold is hardcoded. All must be updated together.

### 2. Search Bar Redesign (Desktop Navbar)

**Modify:** `src/components/navigation/navbar/` (index.tsx + navbar.module.scss)

Current state: plain bordered input with primary-colored placeholder, search icon button inside. Autocomplete renders as a flat unstyled list below.

New design:

- **Pill-shaped** container with `border-radius: var(--radius-700)`, dark border (`--color-neutral-800`)
- **Search icon** on the left inside the input
- **Clear button** (X) appears when query is non-empty
- **Orange search button** integrated on the right side of the pill (`--color-accent-500` background, white icon, rounded right side)
- **Input** placeholder: "Search fishing gear..."

All styling must use CSS custom property tokens — no hardcoded hex, px, or rgba values.

### 3. Desktop Search Dropdown

**Create:** `src/features/listings/components/desktop-search-dropdown/` (index.tsx + .module.scss)

Extracted from navbar to keep it manageable. Controlled component receiving all data + callbacks as props.

**States:**

**A) On focus, empty query:**

```
┌─────────────────────────────────┐
│ Recent Searches                 │
│ ○ shimano rods              ✕   │
│ ○ fly fishing vest          ✕   │
│ ○ spinning reel             ✕   │
│                   Clear all     │
│─────────────────────────────────│
│ Categories                      │
│ [🎣 Rods] [⚙ Reels] [🪝 Lures] │
│ [🦋 Flies] [🔧 Tackle] ...     │
└─────────────────────────────────┘
```

- Recent searches section hidden when list is empty
- Clock icon per recent search item, X remove button
- Category chips: pill-shaped with icon + label, horizontally wrapping
- Clicking recent search → navigate to `/search?q={term}`
- Clicking category chip → navigate to `/search?category={value}` (intentionally different from navbar category bar which uses `/category/{slug}` — the dropdown is a search shortcut, the navbar is browse)

**B) Query >= 2 chars:**

```
┌─────────────────────────────────┐
│ Suggestions                     │
│ 🔍 shimano rods          [→]   │
│ 🔍 shimano reels         [→]   │
│ 🔍 shimano zodias        [→]   │
│─────────────────────────────────│
│ Categories                      │
│ [🎣 Rods] [⚙ Reels] [🪝 Lures] │
└─────────────────────────────────┘
```

- Section header "Suggestions" in small uppercase
- Search icon per suggestion, matching query portion bolded
- Keyboard nav: ArrowUp/Down cycles suggestions (existing pattern)
- Clicking suggestion → navigate to `/search?q={term}`, add to recent searches
- Categories section stays visible below suggestions

**Dropdown styling:**

- White background, subtle shadow via `--shadow-md` token (or define one if missing)
- `border-radius: 0 0 var(--radius-500) var(--radius-500)` (rounds bottom, flat top connects to search bar)
- Max height ~400px via spacing tokens, `overflow-y: auto`
- Width matches the search form width
- Closes on: blur (with setTimeout delay), Escape, click outside, navigation

**Note:** Category chips use `react-icons` components from `LISTING_CATEGORIES` (via `getCategoryIcon()`), not emoji. Wireframe emojis above are placeholders.

**Interactions:**

- `onMouseDown` with `preventDefault()` on interactive elements to prevent input blur (existing pattern from Autocomplete)
- Submitting form → navigate to `/search?q={query}`, add to recent searches, close dropdown

### 4. Mobile Search Overlay Enhancement

**Modify:** `src/features/listings/components/search-overlay/` (index.tsx + .module.scss)

Preserve the existing shell (portal, focus trap, scroll lock, ARIA dialog, Escape key). Add on-focus content below the input:

**On focus, empty query:**

- Recent searches list (clock icon, term, X remove button, "Clear all" link)
- Category chips row (horizontal scroll, pill-shaped with icon + label)

**Query >= 2 chars:**

- Autocomplete suggestions (existing, threshold lowered to 2)

**Behavioral changes:**

- Selecting a suggestion → navigate to `/search?q={term}`, add to recent searches, close overlay
- Selecting a category chip → navigate to `/search?category={value}`, close overlay
- Submitting → navigate to `/search?q={query}`, add to recent searches, close overlay
- Selecting a recent search → navigate to `/search?q={term}`, close overlay

### 5. Search Results Page — Filter Redesign

**Modify:** `src/app/(frontend)/search/search-results.tsx` + `search-results.module.scss`

#### Desktop Layout (>= lg)

Current: permanent 240px sidebar rail (at lg+) + content area. Grid columns determined by `ListingGrid` (2→3→4 responsive).
New: full-width content with toggle sidebar. When sidebar closed, grid gets an extra column. When open, grid loses a column.

**Default state (filters hidden):**

```
┌──────────────────────────────────────────────────┐
│ [⊞ Show filters] [Rods ✕] [New ✕] [Free Ship.]  │ Sort: Most relevant ▾ │
│──────────────────────────────────────────────────│
│ 42 results for "shimano rods"                    │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                     │
│ │    │ │    │ │    │ │    │   ← 4-column grid    │
│ └────┘ └────┘ └────┘ └────┘                     │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                     │
│ │    │ │    │ │    │ │    │                       │
│ └────┘ └────┘ └────┘ └────┘                     │
└──────────────────────────────────────────────────┘
```

**Filters visible (sidebar open):**

```
┌──────────────────────────────────────────────────────────┐
│         [⊞ Hide filters] [Rods ✕] [New ✕]  Sort: Most relevant ▾ │
│──────────────────────────────────────────────────────────│
│ Filters    Reset │ 42 results for "shimano rods"         │
│                  │ ┌────┐ ┌────┐ ┌────┐                  │
│ Category     ▾   │ │    │ │    │ │    │  ← 3-col grid    │
│ ☑ Rods           │ └────┘ └────┘ └────┘                  │
│ ☐ Reels          │ ┌────┐ ┌────┐ ┌────┐                  │
│                  │ │    │ │    │ │    │                   │
│ Condition    ▾   │ └────┘ └────┘ └────┘                  │
│                  │                                        │
│ Price        ▾   │                                        │
│                  │                                        │
│ Location     ▾   │                                        │
│                  │                                        │
│ Free Shipping    │                                        │
└──────────────────────────────────────────────────────────┘
```

- Sidebar slides in from the left with CSS transition (`transform: translateX` + `width` transition, ~300ms ease)
- Content area resizes smoothly (CSS `transition` on `margin-left` or grid column change)
- "Show filters" / "Hide filters" button is a pill with filter icon, toggles sidebar visibility
- Sidebar width: 260px, sticky positioning
- Filter groups use `<details>` accordions (keep existing pattern, polish styling)
- "Reset" link clears all filters
- Sidebar open/closed state persisted in `useState` (no localStorage needed — resets per visit is fine)

#### Top Filter Bar (both breakpoints)

**New wrapper:** The top filter bar is a single horizontal row composed of existing components in a new layout structure within `search-results.tsx`. No separate `FilterBar` component needed — it's a flex row containing:

1. **Filter toggle button** — pill with filter icon + "Show/Hide filters" text (desktop) or icon-only (mobile). `aria-expanded` toggles.
2. **`FilterChips`** — existing component, rendered inline (horizontal scroll on mobile, `flex-wrap` on desktop)
3. **`SortSelect`** — existing component, pushed to far right via `margin-left: auto`

- On mobile: filter toggle button opens full-screen filter panel (replaces bottom sheet)
- On desktop: filter toggle button slides in/out the sidebar

**Note:** `sort` should be excluded from `activeFilterCount` in `useSearchFilters` (add to the skip list alongside `q`, `page`, `limit`) so the filter badge doesn't count sort selection as an active filter.

#### Mobile Layout (< lg)

**Default:**

```
┌──────────────────────────┐
│ [⊞] [Rods ✕]  Most relevant ▾ │
│──────────────────────────│
│ 42 results for "shimano" │
│ ┌─────┐ ┌─────┐         │
│ │     │ │     │  2-col   │
│ └─────┘ └─────┘         │
│ ┌─────┐ ┌─────┐         │
│ │     │ │     │          │
│ └─────┘ └─────┘         │
└──────────────────────────┘
```

**Filters open (full-screen takeover):**

```
┌──────────────────────────┐
│ Filters           Reset  │
│──────────────────────────│
│                          │
│ Category                 │
│ ☑ Rods                   │
│ ☐ Reels                  │
│ ☐ Lures                  │
│                          │
│ Condition                │
│ ...                      │
│                          │
│ Price                    │
│ [$0    ] — [$100+  ]    │
│                          │
│ Location                 │
│ ...                      │
│                          │
│ Free Shipping  [toggle]  │
│                          │
│──────────────────────────│
│ [  Show results (42)   ] │  ← sticky footer
└──────────────────────────┘
```

- Full-screen portal (same pattern as SearchOverlay — portal to `#modal-root`, focus trap, scroll lock)
- Header: "Filters" title + "Reset" link
- Body: scrollable filter groups (reuse existing filter group components)
- Sticky footer: "Show results (N)" button (primary, full-width)
- Results count from current `useSearchListingsInfinite` total
- Closing applies all filter changes (filters update URL params in real-time via `useSearchFilters`)

### 6. Component Changes Summary

| Action | File                                                                                           | Change                                  |
| ------ | ---------------------------------------------------------------------------------------------- | --------------------------------------- |
| Create | `src/features/listings/hooks/use-recent-searches.ts`                                           | New hook                                |
| Create | `src/features/listings/hooks/__tests__/use-recent-searches.test.ts`                            | Unit tests                              |
| Create | `src/features/listings/components/desktop-search-dropdown/index.tsx`                           | New component                           |
| Create | `src/features/listings/components/desktop-search-dropdown/desktop-search-dropdown.module.scss` | New styles                              |
| Create | `src/features/listings/components/search-quick-categories/index.tsx`                           | Category chips component                |
| Create | `src/features/listings/components/search-quick-categories/search-quick-categories.module.scss` | Styles                                  |
| Create | `src/features/listings/components/recent-searches/index.tsx`                                   | Recent searches list component          |
| Create | `src/features/listings/components/recent-searches/recent-searches.module.scss`                 | Styles                                  |
| Modify | `src/features/listings/hooks/use-autocomplete.ts`                                              | `>= 3` → `>= 2`                         |
| Modify | `src/app/api/listings/autocomplete/route.ts`                                                   | `< 3` → `< 2`                           |
| Modify | `src/components/navigation/navbar/index.tsx`                                                   | Search bar redesign, integrate dropdown |
| Modify | `src/components/navigation/navbar/navbar.module.scss`                                          | Pill-shaped search bar styles           |
| Modify | `src/features/listings/components/search-overlay/index.tsx`                                    | Add on-focus content                    |
| Modify | `src/features/listings/components/search-overlay/search-overlay.module.scss`                   | Styles for new sections                 |
| Modify | `src/app/(frontend)/search/search-results.tsx`                                                 | Filter bar + toggle sidebar layout      |
| Modify | `src/app/(frontend)/search/search-results.module.scss`                                         | New layout styles                       |
| Modify | `src/features/listings/components/filter-panel/index.tsx`                                      | Animated sidebar + full-screen mobile   |
| Modify | `src/features/listings/components/filter-panel/filter-panel.module.scss`                       | Sidebar animation, mobile full-screen   |
| Modify | `src/features/listings/components/filter-chips/filter-chips.module.scss`                       | Polish chip styling                     |
| Modify | `src/features/listings/components/autocomplete/autocomplete.module.scss`                       | Section headers, icons, polish          |
| Modify | `src/features/listings/hooks/use-search-filters.ts`                                            | Exclude `sort` from `activeFilterCount` |
| Modify | `src/features/listings/CLAUDE.md`                                                              | Document new hooks and components       |

### 7. Accessibility

- All existing ARIA patterns preserved (dialog, listbox, focus trap, scroll lock)
- Recent searches: `role="list"`, remove buttons with `aria-label="Remove {term} from recent searches"`
- Category chips: `role="list"` with `role="listitem"`, each chip is a link or button
- Desktop dropdown: `aria-expanded` on input, `aria-controls` pointing to dropdown ID
- Filter sidebar toggle: `aria-expanded`, `aria-controls`
- Mobile filter panel: `role="dialog"`, `aria-label="Filters"`, focus trap
- "Show results" button: includes count for screen readers
- All interactive elements: 44px minimum tap target, visible `:focus-visible` indicators

### 8. Animations

- **Desktop filter sidebar:** Use CSS Grid `grid-template-columns` transition (e.g., `0fr 1fr` → `260px 1fr`) for smooth sidebar reveal. Avoid transitioning `margin-left` as it triggers layout recalc on every frame and causes jank with image-heavy grids.
- **Mobile filter panel:** Full-screen slide-up from bottom (match existing overlay pattern). Remove overlay click-to-dismiss since it's full-screen (no visible backdrop).
- **Search dropdown:** No animation (appears/disappears instantly like Etsy)

## What We're NOT Building (from original tickets)

| Original Ticket Item                 | Status  | Reason                                                    |
| ------------------------------------ | ------- | --------------------------------------------------------- |
| `useLiveSearch` hook                 | Dropped | Performance concern at scale, redundant with /search page |
| `LiveSearchResultItem` component     | Dropped | No inline listing results                                 |
| `LiveSearchResults` component        | Dropped | No inline listing results                                 |
| Suggestion-fills-input behavior      | Dropped | Breaks learned UX pattern, confusing                      |
| "See all results" button in dropdown | Dropped | No inline results to "see all" of                         |

## Validation

```bash
pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles && pnpm test:run
```
