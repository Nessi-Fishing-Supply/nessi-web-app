# Recently Viewed Feature

## Overview

Recently viewed tracks listings that the current user has viewed. The feature is dual-source: authenticated users have their views persisted to the `recently_viewed` database table (via `/api/recently-viewed`), while guest users have their views stored in localStorage. On login, the guest localStorage history is silently merged into the database and localStorage is cleared.

Items are capped at 30, deduplicated (re-added items move to the front with an updated timestamp), and kept in sync across browser tabs and same-tab navigations.

## Architecture

- **types/recently-viewed.ts** — `RecentlyViewedItem` (lightweight localStorage shape: `listingId`, `viewedAt`) and `RecentlyViewedListingItem` (DB-backed shape with full listing data including title, price, images, and seller identity)
- **utils/recently-viewed.ts** — Pure localStorage utility functions: `getRecentlyViewed`, `addRecentlyViewed` (deduplicate-and-reorder, enforces 30-item cap), `clearRecentlyViewed`, plus `subscribe` for `useSyncExternalStore` integration (listens to `StorageEvent` filtered by key + custom `nessi_recently_viewed_change` event). Also exports constants `STORAGE_KEY` and `MAX_ITEMS`.
- **services/recently-viewed-server.ts** — Server-side Supabase service: `getRecentlyViewedServer`, `clearRecentlyViewedServer`, `mergeGuestViewsServer`. Used by the API route handlers. Queries the `recently_viewed` table and joins listing data.
- **services/recently-viewed.ts** — Client-side fetch wrappers calling API routes: `getRecentlyViewedFromServer`, `clearRecentlyViewedOnServer`, `mergeGuestViewsOnServer`. No direct Supabase usage on the client.
- **hooks/use-recently-viewed.ts** — Auth-aware dual-source hook. Returns `{ items, add, clear }`. For authenticated users, delegates to the Tanstack Query layer (`useRecentlyViewedQuery`). For guests, reads from localStorage via `useSyncExternalStore`. SSR-safe (empty array on server). Cross-tab sync via `storage` event, same-tab reactivity via custom event.
- **hooks/use-recently-viewed-query.ts** — Tanstack Query hooks for the server-backed data layer. `useRecentlyViewedQuery` fetches from the DB (enabled only when authenticated), `useClearRecentlyViewed` clears the DB history, `useMergeGuestViews` merges a guest `RecentlyViewedItem[]` array into the DB and clears localStorage on success.
- **hooks/use-recently-viewed-merge.ts** — Detects the transition from unauthenticated to authenticated (guest → logged in), reads the localStorage history, and fires `mergeGuestViews`. Fire-and-forget — no toast notification (recently viewed is passive tracking). Wired into the Navbar.

## API Routes

| Method | Route                         | Handler                     | Purpose                                             |
| ------ | ----------------------------- | --------------------------- | --------------------------------------------------- |
| GET    | `/api/recently-viewed`        | `getRecentlyViewedServer`   | Fetch authenticated user's recently viewed listings |
| DELETE | `/api/recently-viewed`        | `clearRecentlyViewedServer` | Clear authenticated user's recently viewed history  |
| POST   | `/api/recently-viewed/merge`  | `mergeGuestViewsServer`     | Merge guest localStorage items into DB on login     |
| GET    | `/api/listings/batch?ids=...` | `getListingsByIdsServer`    | Batch fetch active listings by IDs (max 30)         |

## Hooks

| Hook                          | Query Key                                    | Purpose                                                          | Notes                                                  |
| ----------------------------- | -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `useRecentlyViewed()`         | delegates (see below)                        | Auth-aware dual-source hook: DB for auth, localStorage for guest | Returns `{ items, add, clear }`                        |
| `useRecentlyViewedQuery()`    | `['recently-viewed', userId]`                | Fetch DB-backed recently viewed listings (authenticated only)    | `enabled: !!user?.id`                                  |
| `useClearRecentlyViewed()`    | mutation, invalidates query key              | Clear the DB history for the current user                        | Invalidates on settled                                 |
| `useMergeGuestViews()`        | mutation, invalidates query key              | Merge guest `RecentlyViewedItem[]` into DB, clears localStorage  | Calls `clearRecentlyViewed()` on success               |
| `useRecentlyViewedMerge()`    | side-effect (no own key)                     | Detects login transition, merges guest views silently            | No toast — passive tracking. Wired into Navbar         |
| `useRecentlyViewedListings()` | `['recently-viewed-listings', ...sortedIds]` | Fetch full listing data for recently viewed IDs                  | Returns `{ listings: ListingWithPhotos[], isLoading }` |

## Components

- **`RecentlyViewedStrip`** (`src/features/recently-viewed/components/recently-viewed-strip/`) — Drop-in component that composes `useRecentlyViewedListings` with `ListingScrollStrip`. Renders the "Recently Viewed" horizontal strip on any page. Returns `null` when the recently viewed list is empty, so it is safe to include unconditionally on any page.
- **`ListingScrollStrip`** (`src/components/layout/listing-scroll-strip/`) — Shared, reusable horizontal scroll strip. Features CSS scroll-snap, responsive card sizing (160px mobile / 220px desktop), skeleton loading states during data fetch, and full a11y markup. Not specific to recently viewed — also used wherever a horizontal list of listing cards is needed.

## Key Patterns

- **Dual-source architecture** — `useRecentlyViewed()` is the single public-facing hook. Internally it branches: authenticated users get DB-backed data via Tanstack Query; guests get localStorage data via `useSyncExternalStore`. Consumers do not need to know which source is active.
- **Add no-op for authenticated users** — When a user is authenticated, calling `add(listingId)` on `useRecentlyViewed()` does NOT write to localStorage. Instead it calls the `/api/recently-viewed` route (or the server tracking pattern). Writing to localStorage for authenticated users would pollute the guest merge on a subsequent logout/login.
- **Silent merge on login** — `useRecentlyViewedMerge()` in the Navbar watches for the `null → user` transition on `useAuth()`. It reads localStorage, calls `mergeGuestViews`, and returns. No toast is shown because recently viewed tracking is passive — the user did not explicitly place items in a queue.
- **localStorage cleared by mutation** — `useMergeGuestViews()` calls `clearRecentlyViewed()` in its `onSuccess` callback. The merge hook itself does not clear localStorage; this is handled by the mutation layer so partial failures leave the guest data intact for retry.
- **Seller identity batch fetch** — `RecentlyViewedListingItem` includes seller identity data needed for listing cards (seller name, avatar). The server-side service fetches this in a single joined query rather than N+1 lookups.

## Storage

- **localStorage key:** `nessi_recently_viewed` — stores `RecentlyViewedItem[]` as JSON, newest item first (guest users only)
- **30-item cap** — enforced in `addRecentlyViewed`: when the list reaches 30 items the oldest entry (last in array) is dropped before inserting the new one
- **Deduplicate-and-reorder** — if `listingId` already exists in the list, the existing entry is removed and a new entry with an updated `viewedAt` timestamp is inserted at index 0 (front), preserving "most recently viewed" ordering
- **No expiry on localStorage** — items persist indefinitely; there is no TTL. DB records may be subject to retention policies set at the database level.

## Database

The `recently_viewed` table is created by issue #233. It stores one row per (user, listing) pair with a `viewed_at` timestamp that is updated on re-view (upsert pattern). RLS policies ensure users can only read and write their own rows. See `src/types/database.ts` for the generated TypeScript types.

## Related Features

- `src/features/listings/` — Listing entity; `listing_id` stored in recently-viewed items
- `src/features/cart/` — Pattern reference for localStorage + `useSyncExternalStore` approach (guest cart) and the merge-on-login pattern (`use-cart-merge.ts`)
- `src/features/auth/context` — `useAuth()` used by merge hook to detect login transition
- `src/components/layout/listing-scroll-strip/` — Shared horizontal scroll strip component used by `RecentlyViewedStrip`
