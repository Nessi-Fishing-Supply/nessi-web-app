# Implementation Plan: #28 — Keyword search with autocomplete, full-text results, and structured filter system

## Overview

5 phases, 25 total tasks
Estimated scope: large

## Phase 1: Foundation — types, config, services, API routes, and hooks

**Goal:** Establish all data layer infrastructure: search/filter types, config constants, API routes for search/autocomplete/suggestions, client services, and Tanstack Query hooks. No UI changes yet.
**Verify:** `pnpm build`

### Task 1.1: Create search types and filter config constants

Define the search-specific TypeScript types (search params, search results, autocomplete suggestion, filter state) and the static config files for species and US states that the filter system requires. Also add a `SearchSuggestion` type derived from the database schema.
**Files:**

- `src/features/listings/types/search.ts`
- `src/features/listings/config/species.ts`
- `src/features/listings/config/us-states.ts`
  **AC:**
- `SearchFilters` type includes fields: `q`, `category` (string[]), `condition` (string[]), `price_min`, `price_max`, `location_state`, `free_shipping`, `species` (string[]), `sort`, `page`, `limit`
- `AutocompleteSuggestion` type has `term`, `category`, `type` ('suggestion' | 'listing' | 'category')
- `SearchSuggestion` type derived from `Database['public']['Tables']['search_suggestions']['Row']`
- `US_STATES` exports array of `{ value: string; label: string }` for all 50 states + DC
- `SPECIES_LIST` exports array of `{ value: string; label: string }` for common fishing target species (bass, trout, walleye, catfish, crappie, pike, musky, salmon, steelhead, panfish, carp, striper, redfish, snook, tarpon)
- `pnpm typecheck` passes
  **Expert Domains:** nextjs

### Task 1.2: Create search API route with FTS and trigram support

Build the `GET /api/listings/search` route that performs full-text search using Supabase `textSearch()` on `search_vector` with websearch config, combined with `pg_trgm` similarity for typo tolerance. Supports all filter params from the URL. Returns paginated results with total count.
**Files:**

- `src/app/api/listings/search/route.ts`
  **AC:**
- Accepts query params: `q`, `category` (comma-separated), `condition` (comma-separated), `price_min`, `price_max`, `location_state`, `free_shipping`, `species`, `sort`, `page`, `limit`
- When `q` is provided, uses `textSearch('search_vector', q, { type: 'websearch' })` as primary search
- Falls back to trigram similarity (`similarity(title, q) > 0.3 OR similarity(brand, q) > 0.3`) when FTS returns 0 results (typo tolerance)
- Filters: `status = 'active'`, `deleted_at IS NULL`, plus all provided filter params
- `free_shipping` filter checks `shipping_paid_by = 'seller'`
- `location_state` filters on `listings.location_state`
- Returns `{ listings: ListingWithPhotos[], total: number, page: number, limit: number }`
- Sorting supports: `relevance` (default when q provided — uses `ts_rank`), `newest`, `price_asc`, `price_desc`, `watched`
- Returns 200 with empty listings array when no results
  **Expert Domains:** supabase, nextjs

### Task 1.3: Create autocomplete API route

Build the `GET /api/listings/autocomplete` route that returns up to 8 suggestions combining search_suggestions (by popularity), listing title prefix matches, and category name matches.
**Files:**

- `src/app/api/listings/autocomplete/route.ts`
  **AC:**
- Accepts query param `q` (minimum 3 characters, returns 400 if shorter)
- Queries `search_suggestions` table with `ilike('%${q}%')` ordered by `popularity` desc, limit 4
- Queries `listings` table for `title.ilike('%${q}%')` where `status = 'active'` and `deleted_at IS NULL`, limit 3, returns distinct title text
- Matches category names from `LISTING_CATEGORIES` constant (client-side filter, no DB query needed)
- Returns array of `{ term, type }` where type is `'suggestion'`, `'listing'`, or `'category'`, max 8 total
- Sanitizes `q` input to prevent SQL injection (parameterized queries via Supabase client)
  **Expert Domains:** supabase, nextjs

### Task 1.4: Create search suggestions tracking API route

Build the `POST /api/listings/search-suggestions` route that increments the popularity counter for a search term, or inserts a new row if it does not exist.
**Files:**

- `src/app/api/listings/search-suggestions/route.ts`
  **AC:**
- Accepts JSON body `{ term: string }` with minimum 2 characters
- Normalizes term to lowercase and trims whitespace
- Uses Supabase upsert: if term exists, increments `popularity` by 1; if not, inserts with `popularity: 1`
- Returns 200 on success
- Does not require authentication (search tracking is anonymous)
- Rate-limit safe: fire-and-forget from client, no error shown to user
  **Expert Domains:** supabase, nextjs

### Task 1.5: Create client-side search services

Build the client-side service functions that call the new API routes, following the pattern in `src/features/listings/services/listing.ts`.
**Files:**

- `src/features/listings/services/search.ts`
  **AC:**
- `searchListings(params: SearchFilters)` calls `GET /api/listings/search` with URL params, returns `PaginatedListings`
- `getAutocompleteSuggestions(q: string)` calls `GET /api/listings/autocomplete?q=${q}`, returns `AutocompleteSuggestion[]`
- `trackSearchSuggestion(term: string)` calls `POST /api/listings/search-suggestions`, returns void (fire-and-forget)
- Uses `get` and `post` from `@/libs/fetch`
- Builds query string from `SearchFilters` omitting undefined/empty values
  **Expert Domains:** nextjs

### Task 1.6: Create Tanstack Query hooks for search

Build the query hooks that consume the search services: `useSearchListings` (infinite query), `useAutocomplete` (debounced query), and `useTrackSearchSuggestion` (mutation).
**Files:**

- `src/features/listings/hooks/use-search.ts`
- `src/features/listings/hooks/use-autocomplete.ts`
- `src/features/listings/hooks/use-debounced-value.ts`
  **AC:**
- `useDebouncedValue(value, delay)` returns debounced value using `useState` + `useEffect` with cleanup timer
- `useSearchListingsInfinite(filters: SearchFilters)` uses `useInfiniteQuery` with query key `['listings', 'search', filters]`, calls `searchListings`, implements `getNextPageParam` identical to `useListingsInfinite` pattern
- `useAutocomplete(query: string)` debounces input by 200ms via `useDebouncedValue`, calls `getAutocompleteSuggestions` via `useQuery`, enabled only when debounced query length >= 3, staleTime 30s
- `useTrackSearchSuggestion()` uses `useMutation` calling `trackSearchSuggestion`, no cache invalidation needed
  **Expert Domains:** state-management

### Task 1.7: Create URL-synced search filter hook

Build `useSearchFilters` that reads all filter state from URL search params and provides setter functions that update the URL via `useRouter().replace()`. This is the single source of truth for filter state.
**Files:**

- `src/features/listings/hooks/use-search-filters.ts`
  **AC:**
- Reads from `useSearchParams()`: `q`, `category`, `condition`, `price_min`, `price_max`, `location_state`, `free_shipping`, `species`, `sort`
- Parses comma-separated values for `category`, `condition`, `species` into arrays
- Parses `price_min`, `price_max` into numbers (undefined if absent)
- Parses `free_shipping` as boolean
- Returns `{ filters: SearchFilters, setFilter(key, value), removeFilter(key), clearAllFilters(), hasActiveFilters: boolean, activeFilterCount: number }`
- `setFilter` updates URL param and calls `router.replace()` with new search params (resets `page` to undefined)
- `removeFilter` removes the param from URL
- `clearAllFilters` removes all filter params except `q`
- Array filters join with commas in URL: `condition=good,fair`
- Does not cause full page reload (uses `router.replace`)
  **Expert Domains:** nextjs, state-management

### Task 1.8: Update feature barrel exports

Add all new types, services, hooks, and config to the listings feature barrel file.
**Files:**

- `src/features/listings/index.ts`
  **AC:**
- Exports all new types from `types/search.ts`
- Exports all new services from `services/search.ts`
- Exports all new hooks: `useSearchListingsInfinite`, `useAutocomplete`, `useTrackSearchSuggestion`, `useDebouncedValue`, `useSearchFilters`
- Exports `US_STATES` from `config/us-states.ts` and `SPECIES_LIST` from `config/species.ts`
- `pnpm build` passes
  **Expert Domains:** nextjs

## Phase 2: Search overlay, autocomplete, and navbar integration

**Goal:** Upgrade the navbar search form to a functional search with autocomplete dropdown on desktop and a full-screen overlay on mobile. Submitting navigates to `/search?q=[query]`.
**Verify:** `pnpm build`

### Task 2.1: Create autocomplete dropdown component

Build a keyboard-navigable autocomplete dropdown that displays suggestions grouped by type (suggestions, listings, categories). Appears below the search input.
**Files:**

- `src/features/listings/components/autocomplete/index.tsx`
- `src/features/listings/components/autocomplete/autocomplete.module.scss`
  **AC:**
- Props: `suggestions: AutocompleteSuggestion[]`, `isOpen: boolean`, `onSelect: (term: string) => void`, `activeIndex: number`, `listId: string`
- Renders a `ul` with `role="listbox"` and `id={listId}`
- Each suggestion is `li` with `role="option"`, `aria-selected` based on `activeIndex`
- Suggestions grouped visually by type with subtle type labels (e.g., small "Suggestions", "Listings", "Categories" section headers)
- Each item shows the term text plus a subtle icon indicator for type (HiSearch for suggestions, HiOutlineTag for categories, HiOutlineShoppingBag for listings)
- Mobile-first SCSS: full-width dropdown below input, white background, subtle shadow, max-height with overflow-y auto
- Uses CSS custom property tokens only (no hardcoded colors/spacing)
  **Expert Domains:** scss

### Task 2.2: Create mobile search overlay component

Build a full-screen search overlay (portaled) with auto-focused input, autocomplete integration, focus trap, and body scroll lock. Follows the Modal component pattern.
**Files:**

- `src/features/listings/components/search-overlay/index.tsx`
- `src/features/listings/components/search-overlay/search-overlay.module.scss`
  **AC:**
- Props: `isOpen: boolean`, `onClose: () => void`
- Portaled to `#modal-root` (same as Modal component)
- When opened: auto-focuses the search input, locks body scroll (`document.body.style.overflow = 'hidden'`)
- Focus trap: Tab cycles within overlay (matches Modal pattern)
- Escape key closes overlay and restores focus to trigger element
- Contains: close button (X), search input, submit button, autocomplete dropdown
- Keyboard navigation: ArrowDown/ArrowUp navigate autocomplete suggestions, Enter selects highlighted or submits form
- Submit: validates min 2 chars, calls `router.push('/search?q=...')`, closes overlay
- Integrates `useAutocomplete` hook for suggestions
- Full-screen on mobile (100vh, 100vw), narrower panel on desktop via breakpoints
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-label="Search"`
  **Reuses:** Modal patterns from `src/components/layout/modal/`
  **Expert Domains:** nextjs, scss

### Task 2.3: Upgrade navbar with functional search

Modify the existing navbar to wire up the desktop search form (submit handler, autocomplete) and mobile search icon (opens overlay). Must not break existing navbar functionality (auth modals, dropdown, category bar).
**Files:**

- `src/components/navigation/navbar/index.tsx`
- `src/components/navigation/navbar/navbar.module.scss`
  **AC:**
- Desktop: existing `<form>` gets `onSubmit` handler that validates min 2 chars and navigates to `/search?q=[query]`
- Desktop: input gets `onChange` handler that shows autocomplete dropdown (using `useAutocomplete` hook)
- Desktop: input gets keyboard handlers for ArrowDown/ArrowUp/Enter/Escape to navigate autocomplete
- Desktop: input has `aria-autocomplete="list"`, `aria-controls` pointing to autocomplete listbox, `aria-activedescendant` for active suggestion
- Mobile: search icon button (visible below `md` breakpoint) opens SearchOverlay
- Mobile: inline search form hidden below `md` breakpoint (CSS `display: none`)
- Empty search submit is prevented (min 2 characters)
- Existing auth modals, dropdown menu, notification bar, and category bar remain unchanged
- Autocomplete closes on blur/escape
  **Reuses:** `src/features/listings/components/autocomplete/` (Task 2.1), `src/features/listings/components/search-overlay/` (Task 2.2)
  **Expert Domains:** nextjs, scss

## Phase 3: Search results page with SSR and infinite scroll

**Goal:** Create the `/search` route with server-rendered initial results, infinite scroll, sort controls, and proper metadata. Reuses listing grid components from #27.
**Verify:** `pnpm build`

### Task 3.1: Create search results server page with SSR and metadata

Build the `/search` page route with `generateMetadata` (dynamic title based on query, noindex when filters applied) and server-side initial data fetch for SEO.
**Files:**

- `src/app/(frontend)/search/page.tsx`
- `src/app/(frontend)/search/metadata.ts`
  **AC:**
- Server component that reads `searchParams` from the page props
- `generateMetadata`: title is `"[query]" — Search Results` when q exists, `"Search Fishing Gear"` when no q
- `robots: { index: false }` when any filter params beyond `q` are present (noindex with filters)
- Empty `q` param (or q < 2 chars) redirects to `/` via `redirect()`
- Wraps the client search component in `<Suspense>`
- SSR content present in page source for `/search?q=shimano` (renders initial results server-side or passes q to client component for hydration)
  **Expert Domains:** nextjs

### Task 3.2: Create search results client component

Build the client-side search results component that uses `useSearchListingsInfinite` with filters from URL params, renders the listing grid with infinite scroll, sort controls, result count, and integrates with the filter system layout.
**Files:**

- `src/app/(frontend)/search/search-results.tsx`
- `src/app/(frontend)/search/search-results.module.scss`
  **AC:**
- Uses `useSearchFilters` hook for all filter state
- Uses `useSearchListingsInfinite` with current filters
- Renders results count: "[X] results for '[query]'"
- Sort control using `SortSelect` component, adds `relevance` option when `q` is present
- Loading state: `ListingSkeleton` in `ListingGrid` (8 skeletons)
- Results: `ListingCard` in `ListingGrid` inside `InfiniteScroll`
- Mobile-first layout: full-width on mobile, with space for filter rail on desktop (left rail + content area at `lg` breakpoint)
- Empty state handled (placeholder div for now, completed in Phase 5)
- Fires `useTrackSearchSuggestion` mutation on initial mount with the `q` param value
  **Reuses:** `src/features/listings/components/listing-grid/`, `src/features/listings/components/listing-card/`, `src/features/listings/components/infinite-scroll/`, `src/features/listings/components/sort-select/`
  **Expert Domains:** nextjs, scss, state-management

## Phase 4: Filter system — components, panel, and bottom sheet

**Goal:** Build all filter components (standalone, no react-hook-form), the filter panel (desktop rail + mobile bottom sheet), and wire them to URL params via `useSearchFilters`.
**Verify:** `pnpm build`

### Task 4.1: Create category multi-select filter component

Build a standalone multi-select checkbox filter for categories, following the ConditionFilter pattern. Shows all 10 categories with optional counts.
**Files:**

- `src/features/listings/components/category-filter/index.tsx`
- `src/features/listings/components/category-filter/category-filter.module.scss`
  **AC:**
- Props: `selected: ListingCategory[]`, `onChange: (selected: ListingCategory[]) => void`, `counts?: Partial<Record<ListingCategory, number>>`
- Renders `fieldset` with `legend` (sr-only), checkbox list for all categories from `LISTING_CATEGORIES`
- Each checkbox label shows category label and optional count badge `(N)`
- Standalone controlled component (no FormProvider dependency)
- Follows ConditionFilter pattern: custom checkbox styling, accessible label association
  **Reuses:** Pattern from `src/features/listings/components/condition-filter/`
  **Expert Domains:** scss

### Task 4.2: Create price range filter component

Build a dual-input price range filter with min/max dollar inputs. Converts between dollars (display) and cents (URL params).
**Files:**

- `src/features/listings/components/price-range-filter/index.tsx`
- `src/features/listings/components/price-range-filter/price-range-filter.module.scss`
  **AC:**
- Props: `min: number | undefined`, `max: number | undefined`, `onChangeMin: (value: number | undefined) => void`, `onChangeMax: (value: number | undefined) => void`
- Two number inputs: "Min" and "Max" with `$` prefix visual indicator
- Inputs accept dollar values (display), emit cents to parent (multiply by 100)
- Validation: min must be less than max (visual warning if invalid, does not block input)
- Debounces URL update by 500ms (user types without rapid URL changes)
- `inputMode="numeric"` for mobile numeric keyboard
- Labels associated via `htmlFor`/`id`
- Mobile-first: inputs side by side with gap
  **Expert Domains:** scss

### Task 4.3: Create boolean filter (ships free toggle) and state select filter

Build the "Ships Free" toggle filter and the location state dropdown filter.
**Files:**

- `src/features/listings/components/boolean-filter/index.tsx`
- `src/features/listings/components/boolean-filter/boolean-filter.module.scss`
- `src/features/listings/components/state-filter/index.tsx`
- `src/features/listings/components/state-filter/state-filter.module.scss`
  **AC:**
- BooleanFilter: Props `label: string`, `checked: boolean`, `onChange: (checked: boolean) => void`. Renders label + Toggle component in a row layout. Standalone (no FormProvider).
- StateFilter: Props `value: string | undefined`, `onChange: (value: string | undefined) => void`. Renders a native `<select>` with "All states" default option, plus all 50 states + DC from `US_STATES` config. Label associated via `htmlFor`/`id`.
- Both are standalone controlled components
  **Reuses:** `src/components/controls/toggle/` for BooleanFilter
  **Expert Domains:** scss

### Task 4.4: Create species multi-select filter and listing type filter

Build the species filter (multi-select with counts showing "(0)") and listing type filter (Used/Custom/New pill selector style).
**Files:**

- `src/features/listings/components/species-filter/index.tsx`
- `src/features/listings/components/species-filter/species-filter.module.scss`
- `src/features/listings/components/listing-type-filter/index.tsx`
- `src/features/listings/components/listing-type-filter/listing-type-filter.module.scss`
  **AC:**
- SpeciesFilter: Props `selected: string[]`, `onChange: (selected: string[]) => void`, `counts?: Partial<Record<string, number>>`. Checkbox list from `SPECIES_LIST` config. Shows count badge per species, defaulting to `(0)` when no count data. Follows ConditionFilter pattern.
- ListingTypeFilter: Props `selected: string[]`, `onChange: (selected: string[]) => void`. Three options: "Used", "Custom", "New". Uses checkbox list pattern (not PillSelector, to match other filter groups).
- Both standalone controlled components
  **Expert Domains:** scss

### Task 4.5: Create filter panel with desktop rail and mobile bottom sheet

Build the FilterPanel container that renders all filter groups. On desktop (>= lg), renders as a 240px left rail. On mobile, renders as a bottom sheet (85% viewport height) triggered by a "Filters" button.
**Files:**

- `src/features/listings/components/filter-panel/index.tsx`
- `src/features/listings/components/filter-panel/filter-panel.module.scss`
  **AC:**
- Props: `filters: SearchFilters` (from useSearchFilters), `onFilterChange: (key, value) => void`, `onClearAll: () => void`, `activeFilterCount: number`, `resultCount: number`
- Desktop (>= lg breakpoint): renders as aside element, 240px wide, sticky position, visible alongside results
- Mobile (< lg breakpoint): hidden by default, "Filters" button with badge showing `activeFilterCount` opens bottom sheet
- Bottom sheet: portaled to `#modal-root`, 85vh height, backdrop overlay, scroll lock, focus trap, sticky footer with "Show [resultCount] results" button that closes the sheet
- Filter groups rendered in order: Category, Condition, Price Range, Location, Ships Free, Species, Listing Type
- Each group wrapped in a collapsible section with heading (using details/summary or custom accordion)
- All filter changes call `onFilterChange` immediately (no "Apply" button)
- "Clear all" link at top of panel when filters are active
- ARIA: `role="region"`, `aria-label="Filters"` for the panel; bottom sheet has `role="dialog"`
  **Reuses:** Modal scroll lock and focus trap patterns from `src/components/layout/modal/`
  **Expert Domains:** scss, nextjs

### Task 4.6: Integrate filter panel into search results page

Wire the FilterPanel into the search results layout, connecting it to `useSearchFilters` for all filter state and URL synchronization.
**Files:**

- `src/app/(frontend)/search/search-results.tsx`
- `src/app/(frontend)/search/search-results.module.scss`
  **AC:**
- Desktop layout: 240px filter rail (left) + flex-1 results area (right) at >= lg breakpoint
- Mobile layout: "Filters" button above results grid, opens bottom sheet
- FilterPanel receives all filter state from `useSearchFilters` hook
- Filter changes immediately update URL params and refetch results
- Result count passed to FilterPanel for "Show [X] results" button
- Mobile "Filters" button shows active filter count badge
- Sort select and result count remain in the results header area
  **Expert Domains:** scss, nextjs, state-management

## Phase 5: Filter chips, empty state, search suggestions tracking, and polish

**Goal:** Add filter chips above results, empty state for zero results, search suggestion tracking on submit, noindex meta for filtered pages, and final polish.
**Verify:** `pnpm build`

### Task 5.1: Create filter chip component

Build a removable filter chip component for displaying active filters. This is a new component distinct from the existing Pill (which lacks onRemove). Placed in the listings feature since it is search-specific.
**Files:**

- `src/features/listings/components/filter-chip/index.tsx`
- `src/features/listings/components/filter-chip/filter-chip.module.scss`
  **AC:**
- Props: `label: string`, `onRemove: () => void`
- Renders pill-shaped element with label text and X (close) button
- Close button: `aria-label="Remove [label] filter"`, minimum 44x44px tap target
- Styling: outlined pill with subtle background, `--color-primary` text, hover state on X
- Mobile-first, uses CSS custom property tokens
  **Expert Domains:** scss

### Task 5.2: Create filter chips bar component

Build the FilterChips container that renders one chip per active filter plus a "Clear all filters" link. Sits above the results grid.
**Files:**

- `src/features/listings/components/filter-chips/index.tsx`
- `src/features/listings/components/filter-chips/filter-chips.module.scss`
  **AC:**
- Props: `filters: SearchFilters`, `onRemoveFilter: (key: string, value?: string) => void`, `onClearAll: () => void`
- Generates human-readable labels from filter values: category values mapped via `getCategoryLabel()`, condition values mapped via `CONDITION_TIERS` label, price range as "$X - $Y", state code mapped to full name, "Free shipping" for boolean
- Multi-value filters (category, condition, species) render one chip per selected value
- Each chip calls `onRemoveFilter(key, specificValue)` to remove just that value from the array
- "Clear all filters" link shown when any filters are active (not counting `q`)
- Horizontal scrollable flex row on mobile, wrapping on desktop
- Not rendered when no active filters
  **Reuses:** `src/features/listings/components/filter-chip/` (Task 5.1)
  **Expert Domains:** scss

### Task 5.3: Integrate filter chips and enhanced empty state into search results

Wire FilterChips into the search results page above the grid. Enhance the empty state to show "Nothing here yet" messaging with a "Clear all filters" action button.
**Files:**

- `src/app/(frontend)/search/search-results.tsx`
- `src/app/(frontend)/search/search-results.module.scss`
  **AC:**
- FilterChips bar rendered between header (sort/count) and results grid, only when `hasActiveFilters` is true
- Chip removal calls `removeFilter` from `useSearchFilters`, which updates URL and triggers refetch
- "Clear all" in chips calls `clearAllFilters` from `useSearchFilters`
- Zero results empty state: uses EmptyState component with message "Nothing here yet", description "Try adjusting your filters or search terms", and a "Clear all filters" button that calls `clearAllFilters`
- Zero results when no query: different message "Search for fishing gear" with description
  **Reuses:** `src/features/listings/components/empty-state/`, `src/features/listings/components/filter-chips/` (Task 5.2)
  **Expert Domains:** nextjs

### Task 5.4: Wire search suggestion tracking on form submit

Ensure that submitting a search (from navbar or overlay) fires the `trackSearchSuggestion` mutation to increment the `search_suggestions` counter. Also ensure noindex meta is correctly applied.
**Files:**

- `src/app/(frontend)/search/search-results.tsx`
- `src/app/(frontend)/search/page.tsx`
  **AC:**
- On search results page mount, if `q` param exists and has length >= 2, calls `useTrackSearchSuggestion().mutate(q)` once (via `useEffect` with `q` dependency)
- Does not re-track on filter changes (only on initial `q` or `q` change)
- `generateMetadata` in `page.tsx` confirms `robots: { index: false }` when any param besides `q` exists
- `pnpm build` passes
  **Expert Domains:** nextjs, supabase

### Task 5.5: Add relevance sort option and final SortSelect integration

Extend the SortSelect component to support an optional "Relevance" sort option that only appears on the search results page (when a text query is active).
**Files:**

- `src/features/listings/components/sort-select/index.tsx`
  **AC:**
- SortSelect accepts optional `showRelevance?: boolean` prop (default false)
- When `showRelevance` is true, prepends a "Relevance" option (`value: 'relevance'`) to the sort dropdown
- Search results page passes `showRelevance={!!filters.q}` to SortSelect
- Default sort on search page is `relevance` when query present, `newest` when no query
- Category browse pages are unaffected (no `showRelevance` prop)
- `pnpm build` passes
  **Expert Domains:** nextjs

### Task 5.6: Update listings feature CLAUDE.md and barrel exports

Document the new search infrastructure in the feature's CLAUDE.md and ensure all new components, hooks, and services are exported from the barrel file.
**Files:**

- `src/features/listings/CLAUDE.md`
- `src/features/listings/index.ts`
  **AC:**
- CLAUDE.md updated with: new API routes (search, autocomplete, search-suggestions), new hooks (useSearchListingsInfinite, useAutocomplete, useTrackSearchSuggestion, useDebouncedValue, useSearchFilters), new components (autocomplete, search-overlay, filter-panel, filter-chip, filter-chips, category-filter, price-range-filter, boolean-filter, state-filter, species-filter, listing-type-filter), new config files (species, us-states), new types (SearchFilters, AutocompleteSuggestion, SearchSuggestion)
- CLAUDE.md documents the URL-as-truth pattern for filter state
- CLAUDE.md documents the search page route `/search`
- All new component default exports added to barrel file
- `pnpm build`, `pnpm lint`, `pnpm typecheck` pass
  **Expert Domains:** nextjs
