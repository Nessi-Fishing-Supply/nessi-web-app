# Implementation Plan: #205 — recently viewed tracking store and hook

## Overview

3 phases, 8 total tasks
Estimated scope: small

## Phase 1: Foundation — types, localStorage utility, and feature scaffold

**Goal:** Create the `src/features/recently-viewed/` feature domain with types and a pure localStorage utility following the guest-cart pattern from `src/features/cart/utils/guest-cart.ts`.
**Verify:** `pnpm build`

### Task 1.1: Scaffold the recently-viewed feature directory with CLAUDE.md

Create the feature domain directory structure and a CLAUDE.md documenting the feature's architecture, localStorage key, cap, and cross-tab sync strategy. Follow the pattern established by `src/features/cart/CLAUDE.md`.
**Files:** `src/features/recently-viewed/CLAUDE.md`
**AC:**

- `src/features/recently-viewed/` directory exists with a CLAUDE.md
- CLAUDE.md documents: localStorage key (`nessi_recently_viewed`), 30-item cap, deduplicate-and-reorder behavior, cross-tab sync via StorageEvent, same-tab sync via custom event, `useSyncExternalStore` pattern
  **Expert Domains:** none

### Task 1.2: Define the RecentlyViewedItem type

Create a types file with the `RecentlyViewedItem` interface. Each entry needs at minimum: `listingId` (string) and `viewedAt` (ISO string timestamp). Keep it minimal — this is a tracking store, not a display cache.
**Files:** `src/features/recently-viewed/types/recently-viewed.ts`
**AC:**

- `RecentlyViewedItem` type exported with `listingId: string` and `viewedAt: string` fields
- Type uses kebab-case file naming
  **Expert Domains:** none

### Task 1.3: Create the recently-viewed localStorage utility

Build `recently-viewed.ts` utility following the exact pattern from `src/features/cart/utils/guest-cart.ts`. Key: `nessi_recently_viewed`. Custom event: `nessi_recently_viewed_change`. Functions: `getRecentlyViewed()`, `addRecentlyViewed(listingId)` (deduplicates by removing existing entry and prepending to front, enforces 30-item cap by dropping oldest), `clearRecentlyViewed()`, `subscribe(callback)` (listens to both `StorageEvent` filtered by key and the custom event). The `addRecentlyViewed` function should create the `RecentlyViewedItem` internally (setting `viewedAt` to `new Date().toISOString()`), not accept a full item object — callers only pass a `listingId`.
**Files:** `src/features/recently-viewed/utils/recently-viewed.ts`
**AC:**

- `STORAGE_KEY` exported as `'nessi_recently_viewed'`
- `MAX_ITEMS` exported as `30`
- `getRecentlyViewed()` returns `RecentlyViewedItem[]`, empty array on SSR or corrupted JSON
- `addRecentlyViewed(listingId: string)` removes any existing entry with same `listingId`, prepends new entry to front, trims to 30 items, dispatches custom event
- `clearRecentlyViewed()` writes empty array and dispatches custom event
- `subscribe(callback)` listens to `StorageEvent` (filtered by key, also handles `null` key) and custom event; returns unsubscribe function
- All write functions are no-ops when `typeof window === 'undefined'`
  **Expert Domains:** state-management

### Task 1.4: Create barrel export for the feature

Add an `index.ts` barrel file exporting types, utility functions, and (in Phase 2) the hook. Follow the pattern from `src/features/cart/index.ts`.
**Files:** `src/features/recently-viewed/index.ts`
**AC:**

- Barrel exports `RecentlyViewedItem` type, all utility functions (`getRecentlyViewed`, `addRecentlyViewed`, `clearRecentlyViewed`, `subscribe`), and constants (`STORAGE_KEY`, `MAX_ITEMS`)
- `pnpm build` passes
  **Expert Domains:** none

## Phase 2: React hook and listing-detail integration

**Goal:** Create the `useRecentlyViewed` hook using `useSyncExternalStore` and wire it into the existing `listing-detail.tsx` view-tracking `useEffect`.
**Verify:** `pnpm build`

### Task 2.1: Create the useRecentlyViewed hook

Build a `'use client'` hook using `useSyncExternalStore` following the exact pattern from `src/features/cart/hooks/use-guest-cart.ts`. The hook should use a cached JSON snapshot comparison to maintain referential stability (preventing infinite re-renders). Returns `{ items, add, clear }`. The `add` function wraps `addRecentlyViewed`. SSR-safe with empty array server snapshot.
**Files:** `src/features/recently-viewed/hooks/use-recently-viewed.ts`
**AC:**

- Hook uses `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
- `getSnapshot` uses JSON.stringify comparison for referential stability (same pattern as `use-guest-cart.ts`)
- `getServerSnapshot` returns a stable empty array constant
- Returns `{ items: RecentlyViewedItem[], add: (listingId: string) => void, clear: () => void }`
- All returned functions are wrapped in `useCallback`
- Exported from barrel `index.ts`
  **Expert Domains:** state-management

### Task 2.2: Record view in listing-detail.tsx

Add a call to `addRecentlyViewed(listing.id)` inside the existing `useEffect` in `src/app/(frontend)/listing/[id]/listing-detail.tsx` that already calls `incrementView(listing.id)`. Import `addRecentlyViewed` directly from the utility (not the hook) since this is a fire-and-forget side effect that does not need reactive state. This avoids adding a hook dependency and keeps the change minimal.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:**

- `addRecentlyViewed` is imported from `@/features/recently-viewed`
- The existing `useEffect` on lines 39-41 now also calls `addRecentlyViewed(listing.id)` alongside the existing `incrementView(listing.id)` call
- No new `useEffect` is added — the call is added to the existing one
- `pnpm build` passes with no type errors
  **Expert Domains:** nextjs

## Phase 3: Unit tests

**Goal:** Add comprehensive unit tests for the localStorage utility and the hook, covering add, deduplicate, cap, clear, cross-tab sync, and SSR safety.
**Verify:** `pnpm build && pnpm test:run`

### Task 3.1: Write unit tests for the recently-viewed localStorage utility

Follow the test structure and conventions from `src/features/cart/utils/__tests__/guest-cart.test.ts`. Test: empty state, add single item, deduplicate-and-reorder on re-view (existing item moves to front with updated timestamp), 30-item cap (oldest dropped), clear, corrupted JSON recovery, subscribe/unsubscribe for both custom event and StorageEvent (including null key), ignoring other storage keys.
**Files:** `src/features/recently-viewed/utils/__tests__/recently-viewed.test.ts`
**AC:**

- Tests use `vitest` (`describe`, `it`, `expect`, `beforeEach`, `vi`)
- `localStorage.clear()` called in `beforeEach`
- Tests cover: empty state returns `[]`, add single item, add stores `viewedAt` as ISO string, deduplicate moves existing item to front, cap at 30 drops oldest, clear empties list, corrupted JSON returns `[]`, subscribe fires on custom event, subscribe fires on StorageEvent with matching key, subscribe fires on StorageEvent with null key, subscribe ignores other keys, unsubscribe stops all listeners
- All tests pass with `pnpm test:run`
  **Expert Domains:** state-management

### Task 3.2: Write unit tests for the useRecentlyViewed hook

Follow the hook test pattern from `src/features/listings/hooks/__tests__/use-recent-searches.test.ts`. Use `renderHook` and `act` from `@testing-library/react`. Test: returns empty array initially, returns items from localStorage, add records a view, re-viewing moves item to front, clear empties the list.
**Files:** `src/features/recently-viewed/hooks/__tests__/use-recently-viewed.test.ts`
**AC:**

- Tests use `renderHook` and `act` from `@testing-library/react`
- Tests cover: empty initial state, pre-populated localStorage is read, `add` records a listing and updates the returned `items`, adding same listing twice deduplicates (moves to front), `clear` empties the list
- All tests pass with `pnpm test:run`
  **Expert Domains:** state-management
