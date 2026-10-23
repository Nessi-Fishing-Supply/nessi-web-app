# Implementation Plan: #234 — Upgrade useRecentlyViewed to Dual-Source (DB + localStorage)

## Overview

4 phases, 11 total tasks
Estimated scope: medium

## Phase 1: Foundation — Types and Server Service

**Goal:** Define the rich listing item type and create the server-side Supabase service for reading, clearing, and merging recently viewed data.
**Verify:** `pnpm build`

### Task 1.1: Define RecentlyViewedListingItem type

Create a rich type for rendering recently viewed items with full listing display data, avoiding N+1 fetches. This type will be the return shape for both the server service and the client API. Add it alongside the existing `RecentlyViewedItem` type.
**Files:** `src/features/recently-viewed/types/recently-viewed.ts`
**AC:**

- `RecentlyViewedListingItem` type exported with fields: `listingId`, `viewedAt`, `title`, `priceCents`, `slug`, `status`, `coverPhotoUrl`, `condition`, `seller` (using `SellerIdentity` from listings types)
- Existing `RecentlyViewedItem` type unchanged
- `pnpm typecheck` passes
  **Expert Domains:** supabase

### Task 1.2: Create recently-viewed-server.ts server service

Create the server-side service with three functions following the `cart-server.ts` pattern: use Supabase server client, JOIN on listings + batch-fetch seller identity. `getRecentlyViewedServer` fetches the user's recently viewed with listing data (filtering out deleted/inactive listings), ordered by `viewed_at DESC`. `clearRecentlyViewedServer` deletes all rows for a user. `mergeGuestViewsServer` bulk-upserts guest localStorage entries into the DB (validates UUID format, skips deleted listings) then returns the merge count.
**Files:** `src/features/recently-viewed/services/recently-viewed-server.ts`
**AC:**

- `getRecentlyViewedServer(userId)` returns `RecentlyViewedListingItem[]` ordered by `viewed_at DESC`, JOINing on listings for title/price/cover_photo/status/condition/seller_id/shop_id, batch-fetching seller identity (shops + members) following the cart-server pattern, filtering `deleted_at IS NULL` and `status IN ('active', 'sold')` (not drafts/archived)
- `clearRecentlyViewedServer(userId)` deletes all `recently_viewed` rows for the user
- `mergeGuestViewsServer(userId, items: RecentlyViewedItem[])` validates UUID format, upserts each item with `onConflict: 'user_id,listing_id'` updating `viewed_at` to the guest timestamp, skips items with invalid listing_id (not found or deleted), returns merged count
- Uses `createClient` from `@/libs/supabase/server` (not admin client)
- `pnpm build` passes
  **Expert Domains:** supabase

### Task 1.3: Update barrel export index.ts

Add the new type export and re-export structure for the services that will be created. Keep existing exports intact.
**Files:** `src/features/recently-viewed/index.ts`
**AC:**

- `RecentlyViewedListingItem` exported from barrel
- All existing exports preserved
- `pnpm build` passes

## Phase 2: API Routes and Client Service

**Goal:** Create the API routes that the client will call, and the thin client-side service functions wrapping fetch calls.
**Verify:** `pnpm build`

### Task 2.1: Create GET /api/recently-viewed route

Create the API route for fetching recently viewed listings for the authenticated user. Follow the `GET /api/cart` route pattern: auth check via server client, delegate to server service, return JSON.
**Files:** `src/app/api/recently-viewed/route.ts`
**AC:**

- `GET` handler returns `RecentlyViewedListingItem[]` for authenticated user
- Returns 401 for unauthenticated requests
- Returns 500 with error log on failure
- Uses `AUTH_CACHE_HEADERS` (`Cache-Control: private, no-store`)
- `pnpm build` passes
  **Expert Domains:** nextjs, supabase

### Task 2.2: Create DELETE /api/recently-viewed route

Add the DELETE handler to the same route file for clearing all recently viewed entries. Follow the `DELETE /api/cart` pattern.
**Files:** `src/app/api/recently-viewed/route.ts`
**AC:**

- `DELETE` handler clears all recently_viewed rows for the authenticated user
- Returns `{ success: true }` on success
- Returns 401 for unauthenticated requests
- Uses `AUTH_CACHE_HEADERS`
- `pnpm build` passes
  **Expert Domains:** nextjs, supabase

### Task 2.3: Create POST /api/recently-viewed/merge route

Create the merge API route for upserting guest localStorage entries into the DB on login. Follow the `POST /api/cart/merge` route pattern.
**Files:** `src/app/api/recently-viewed/merge/route.ts`
**AC:**

- `POST` handler accepts `{ items: RecentlyViewedItem[] }` body
- Returns `{ merged: number }` with the count of successfully upserted entries
- Validates items is a non-empty array, returns 400 otherwise
- Returns 401 for unauthenticated requests
- Uses `AUTH_CACHE_HEADERS`
- `pnpm build` passes
  **Expert Domains:** nextjs, supabase

### Task 2.4: Create client-side recently-viewed service

Create thin client-side service functions using `@/libs/fetch` helpers, following the `cart.ts` service pattern. These will be consumed by Tanstack Query hooks.
**Files:** `src/features/recently-viewed/services/recently-viewed.ts`
**AC:**

- `getRecentlyViewedFromServer()` calls `GET /api/recently-viewed`, returns `RecentlyViewedListingItem[]`
- `clearRecentlyViewedOnServer()` calls `DELETE /api/recently-viewed`, returns `{ success: boolean }`
- `mergeGuestViews(items: RecentlyViewedItem[])` calls `POST /api/recently-viewed/merge`, returns `{ merged: number }`
- All functions use `get`, `del`, `post` from `@/libs/fetch`
- `pnpm build` passes
  **Expert Domains:** nextjs

## Phase 3: Tanstack Query Hook and Updated useRecentlyViewed

**Goal:** Create the DB-backed query hook and upgrade `useRecentlyViewed` to be auth-aware, switching between DB and localStorage based on auth state while keeping the public API unchanged.
**Verify:** `pnpm build`

### Task 3.1: Create useRecentlyViewedQuery Tanstack Query hook

Create the Tanstack Query hook for fetching recently viewed from the DB. Also create mutation hooks for clear and merge operations. Follow the `use-cart.ts` pattern with user-scoped query keys.
**Files:** `src/features/recently-viewed/hooks/use-recently-viewed-query.ts`
**AC:**

- `useRecentlyViewedQuery()` returns Tanstack Query result with `queryKey: ['recently-viewed', userId]`, `enabled: !!user?.id`, calls `getRecentlyViewedFromServer`
- `useClearRecentlyViewed()` mutation that calls `clearRecentlyViewedOnServer`, invalidates `['recently-viewed', userId]` on settled
- `useMergeGuestViews()` mutation that calls `mergeGuestViews`, clears localStorage via `clearRecentlyViewed()` util on success, invalidates `['recently-viewed', userId]` on settled
- Uses `useAuth()` for user state
- `pnpm build` passes
  **Expert Domains:** state-management

### Task 3.2: Upgrade useRecentlyViewed to auth-aware dual-source

Modify the existing `useRecentlyViewed` hook to branch on auth state. Authenticated users get DB-backed data via `useRecentlyViewedQuery`; guests get the existing localStorage implementation (unchanged). The public API `{ items, add, clear }` must remain identical. For authenticated users, `add` is a no-op (the view route already persists to DB). For authenticated users, `clear` calls the mutation.
**Files:** `src/features/recently-viewed/hooks/use-recently-viewed.ts`
**AC:**

- Hook signature and return type unchanged: `{ items, add, clear }`
- When `user` is authenticated: `items` comes from `useRecentlyViewedQuery` data (mapped to `RecentlyViewedItem[]` shape for backward compat), `add` is a no-op, `clear` calls `useClearRecentlyViewed` mutation
- When `user` is null (guest): behavior identical to current implementation (localStorage via `useSyncExternalStore`)
- `items` returns `RecentlyViewedItem[]` in both paths (not `RecentlyViewedListingItem[]` — that's a separate concern for future UI components)
- During auth loading, returns empty items (no flash)
- No breaking changes to the consumer in `listing-detail.tsx`
- `pnpm build` passes
  **Expert Domains:** state-management

## Phase 4: Guest Merge on Login

**Goal:** Detect the unauthenticated-to-authenticated transition and merge guest localStorage entries into the DB, following the cart merge pattern.
**Verify:** `pnpm build`

### Task 4.1: Create useRecentlyViewedMerge hook

Create a side-effect hook that detects the login transition (user goes from null to non-null) and fires the merge mutation. Follow the `use-cart-merge.ts` pattern exactly: `useRef` for previous user, skip if localStorage is empty, fire-and-forget (no toast — recently viewed is silent unlike cart), leave localStorage intact on failure.
**Files:** `src/features/recently-viewed/hooks/use-recently-viewed-merge.ts`
**AC:**

- Detects `prevUser === null && user !== null` transition
- Reads guest items via `getRecentlyViewed()` util
- Skips merge if guest items array is empty
- Calls `useMergeGuestViews().mutate()` fire-and-forget
- On success: localStorage is cleared (handled by mutation's onSuccess)
- On error: localStorage is left intact (no cleanup, no toast)
- `pnpm build` passes
  **Expert Domains:** state-management

### Task 4.2: Wire useRecentlyViewedMerge into Navbar

Add the merge hook call to the Navbar component, alongside the existing `useCartMerge()` call. This ensures the merge fires on every login regardless of which page the user is on.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:**

- `useRecentlyViewedMerge()` called unconditionally in the Navbar component (same location as `useCartMerge()`)
- Import from `@/features/recently-viewed/hooks/use-recently-viewed-merge`
- No visual changes to the Navbar
- `pnpm build` passes
  **Expert Domains:** nextjs

### Task 4.3: Update barrel exports and CLAUDE.md

Update the feature barrel export to include all new hooks and services. Update the feature CLAUDE.md to document the dual-source architecture, new files, hooks table, and merge behavior.
**Files:** `src/features/recently-viewed/index.ts`, `src/features/recently-viewed/CLAUDE.md`
**AC:**

- Barrel exports: `useRecentlyViewedQuery`, `useClearRecentlyViewed`, `useMergeGuestViews`, `useRecentlyViewedMerge`, `RecentlyViewedListingItem`, all client service functions
- CLAUDE.md documents: dual-source architecture (DB for auth, localStorage for guest), server service, client service, API routes, hooks table, merge behavior, key patterns
- Existing exports preserved
- `pnpm build` passes
