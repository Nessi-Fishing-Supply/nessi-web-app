# Recently Viewed Feature

## Overview

Recently viewed tracks listings that the current user has viewed, stored entirely in localStorage. There is no database table — this feature is intentionally client-only and works for both authenticated and unauthenticated users without any API calls. Items are capped at 30, deduplicated (re-added items move to the front with an updated timestamp), and kept in sync across browser tabs and same-tab navigations.

## Architecture

- **types/recently-viewed.ts** — Lightweight types: `RecentlyViewedItem` (listingId, viewedAt)
- **utils/recently-viewed.ts** — Pure localStorage utility functions: `getRecentlyViewed`, `addRecentlyViewed` (deduplicate-and-reorder, enforces 30-item cap), `clearRecentlyViewed`, plus `subscribe` for `useSyncExternalStore` integration (listens to `StorageEvent` filtered by key + custom `nessi_recently_viewed_change` event). Also exports constants `STORAGE_KEY` and `MAX_ITEMS`.
- **hooks/use-recently-viewed.ts** — `useRecentlyViewed()` React hook using `useSyncExternalStore` for hydration-safe localStorage access. Returns `{ items, add, clear }`. SSR-safe (empty array on server). Cross-tab sync via `storage` event, same-tab reactivity via custom event.

## Storage

- **localStorage key:** `nessi_recently_viewed` — stores `RecentlyViewedItem[]` as JSON, newest item first
- **30-item cap** — enforced in `addRecentlyViewed`: when the list reaches 30 items the oldest entry (last in array) is dropped before inserting the new one
- **Deduplicate-and-reorder** — if `listingId` already exists in the list, the existing entry is removed and a new entry with an updated `viewedAt` timestamp is inserted at index 0 (front), preserving "most recently viewed" ordering
- **No expiry** — items persist indefinitely in localStorage; there is no TTL or database cleanup trigger

## Sync Strategy

- **Cross-tab sync** — `subscribe` in `utils/recently-viewed.ts` attaches a `storage` event listener on `window`. Events are filtered to `nessi_recently_viewed` key only, so other localStorage writes do not cause spurious re-renders.
- **Same-tab reactivity** — Every mutating function (`addRecentlyViewed`, `clearRecentlyViewed`) dispatches a `nessi_recently_viewed_change` `CustomEvent` on `window` after writing to localStorage. The `subscribe` function also listens for this event, so the hook re-renders within the same tab without needing a round-trip through the `storage` event (which browsers only fire for other tabs).
- **`useSyncExternalStore` pattern** — `useRecentlyViewed()` calls `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` where `getServerSnapshot` returns an empty array for SSR safety and `getSnapshot` reads from localStorage. The snapshot reference is stabilized via JSON.stringify comparison to prevent infinite re-renders when the serialized value has not changed.

## Key Patterns

- **Hydration safety** — `useRecentlyViewed()` uses `useSyncExternalStore` with a server snapshot returning `[]`. This avoids hydration mismatches since localStorage is unavailable during SSR.
- **Snapshot stability** — The hook caches the parsed snapshot reference. A new array reference is only returned when the JSON-serialized value changes, preventing downstream `useEffect` or `useMemo` from firing on every render.
- **No API calls** — This feature never calls any server. All reads and writes are synchronous localStorage operations wrapped in try/catch to handle storage quota errors or private-browsing restrictions gracefully.
- **Pure utilities** — `utils/recently-viewed.ts` has no React imports. All functions are plain TypeScript so they can be tested without a DOM or React tree.

## Types

### RecentlyViewedItem

```ts
export type RecentlyViewedItem = {
  listingId: string;
  viewedAt: string; // ISO 8601 date string, set at view time
};
```

## Hooks

| Hook                  | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `useRecentlyViewed()` | Returns `{ items, add, clear }` with live localStorage sync |

## Components

No components exist yet for this feature.

**Future / out of scope for this ticket:** A `RecentlyViewedShelf` component (`components/recently-viewed-shelf/`) is planned for a future ticket. It will render a horizontal scrollable shelf of listing cards for recently viewed items, hidden when the list is empty.

## Related Features

- `src/features/listings/` — Listing entity; `listingId` stored in recently-viewed items
- `src/features/cart/` — Pattern reference for localStorage + `useSyncExternalStore` approach (guest cart)
