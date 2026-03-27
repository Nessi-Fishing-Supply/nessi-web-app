# Implementation Plan: #294 — From Sellers You Follow Homepage Listing Strip

## Overview

2 phases, 5 total tasks
Estimated scope: small

This feature adds a "From Sellers You Follow" horizontal listing strip to the homepage. It follows the exact same pattern as `RecentlyViewedStrip`, `SimilarItemsStrip`, and `AlsoLikedStrip`: a server service function, an API route, a client service function, a Tanstack Query hook, and a thin strip component composing the hook with `ListingScrollStrip`. No new database tables, no new dependencies, no infrastructure provisioning needed.

## Phase 1: Data Layer — Server Service, API Route, Client Service, and Hook

**Goal:** Build the full data pipeline from Supabase query through API route to client-side hook, so the strip has data to render.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 1.1: Add `getFollowedSellerListingsServer` to the listing server service

Add a new exported function `getFollowedSellerListingsServer(userId: string): Promise<ListingWithPhotos[]>` to the existing listing server service file. The function should:

1. Query the `follows` table for rows where `follower_id = userId`, selecting `target_type` and `target_id`.
2. Partition results into `memberIds` (where `target_type = 'member'`) and `shopIds` (where `target_type = 'shop'`).
3. Return `[]` early if both arrays are empty.
4. Query `listings` with `.select('*, listing_photos(*)')`, filter `status = 'active'` and `.is('deleted_at', null)`. Build the `.or()` filter dynamically: if both sets have IDs use `.or('member_id.in.(ids),shop_id.in.(ids)')`, if only one set has IDs use a single `.in()` filter (never pass an empty array to `.in()`).
5. Order by `published_at` descending, limit 20, order photos by `position` ascending.
6. Return `ListingWithPhotos[]`.

Follow the query patterns established by `getListingsByMemberServer` and `getListingsByShopServer` in the same file (same select, same `deleted_at` filter, same photo ordering, same error handling with `throw new Error`).

**Files:** `src/features/listings/services/listing-server.ts`
**AC:** Function compiles, returns `ListingWithPhotos[]`, handles the empty-follows early return, and never passes an empty array to `.in()` or `.or()`.
**Expert Domains:** supabase

### Task 1.2: Create `GET /api/listings/followed-sellers` API route

Create a new API route that authenticates the user and delegates to `getFollowedSellerListingsServer`. Follow the exact pattern from `src/app/api/listings/seller/route.ts`: create Supabase server client, call `supabase.auth.getUser()`, return 401 with `AUTH_CACHE_HEADERS` if no user, call the server service, return `NextResponse.json({ listings }, { headers: AUTH_CACHE_HEADERS })`. Wrap in try/catch with 500 fallback. Add a description comment above the handler: `// Returns recent active listings from members and shops the user follows`.

**Files:** `src/app/api/listings/followed-sellers/route.ts`
**AC:** `GET /api/listings/followed-sellers` returns 401 for unauthenticated requests, returns `{ listings: ListingWithPhotos[] }` with `AUTH_CACHE_HEADERS` for authenticated requests, and returns `{ listings: [] }` when the user follows nobody.
**Expert Domains:** nextjs, supabase

### Task 1.3: Add client service function and create the Tanstack Query hook

Two changes in this task:

1. Add `getFollowedSellerListings` to `src/features/listings/services/listing.ts`. It should call `get<{ listings: ListingWithPhotos[] }>('/api/listings/followed-sellers')` using the existing `get` helper from `@/libs/fetch`, following the same one-liner pattern as `getSellerListings` and `getDrafts`.

2. Create a new hook file `use-followed-seller-listings.ts` with a `useFollowedSellerListings` named export. Pattern: `useQuery` with query key `['listings', 'followed-sellers']`, `queryFn` calling `getFollowedSellerListings()`, and `enabled: isAuthenticated && !isLoading` using `useAuth()` from `@/features/auth/context`. Return `{ data, isLoading }`. Follow the same structure as `useRecommendations` (useQuery with enabled guard) but simpler since there is no context switching.

**Files:** `src/features/listings/services/listing.ts`, `src/features/listings/hooks/use-followed-seller-listings.ts`
**AC:** Hook only fires the query when the user is authenticated and auth is not loading. Hook returns `{ data: { listings: ListingWithPhotos[] } | undefined, isLoading: boolean }`. Client service calls the correct endpoint. Both files pass typecheck.
**Expert Domains:** nextjs, state-management

## Phase 2: UI — Strip Component and Homepage Integration

**Goal:** Create the strip component and wire it into the homepage between the listings grid and `RecentlyViewedStrip`.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 2.1: Create `FollowedSellersStrip` component

Create a `'use client'` component at the specified path. It should follow the exact same pattern as `RecentlyViewedStrip` (the simplest strip — no props, self-contained): call `useFollowedSellerListings()`, extract `listings` from `data?.listings ?? []`, return `null` when `!isLoading && listings.length === 0`, otherwise render `<ListingScrollStrip title="From Sellers You Follow" listings={listings} ariaLabel="Listings from sellers you follow" isLoading={isLoading} />`.

**Reuses:** `src/components/layout/listing-scroll-strip/`

**Files:** `src/features/listings/components/followed-sellers-strip/index.tsx`
**AC:** Component renders `ListingScrollStrip` with correct title and ariaLabel. Returns `null` when not loading and no listings. Shows skeleton loading state via `ListingScrollStrip` while data is fetching. No API call is made for unauthenticated users (inherited from hook's `enabled` guard).
**Expert Domains:** nextjs

### Task 2.2: Integrate strip into homepage and update feature CLAUDE.md

Two changes:

1. In `src/app/(frontend)/page.tsx`, import `FollowedSellersStrip` from `@/features/listings/components/followed-sellers-strip` and add `<FollowedSellersStrip />` between the closing `</Grid>` / no-listings paragraph and the `<RecentlyViewedStrip />`. The strip self-hides when empty or unauthenticated, so no conditional rendering is needed in the page.

2. Update `src/features/listings/CLAUDE.md` to document the new hook (`useFollowedSellerListings` with query key `['listings', 'followed-sellers']`) in the Hooks table, the new component (`FollowedSellersStrip`) in the Components table, and the new API route (`GET /api/listings/followed-sellers`) in the API Routes section. Follow the existing documentation format.

**Files:** `src/app/(frontend)/page.tsx`, `src/features/listings/CLAUDE.md`
**AC:** Homepage renders `FollowedSellersStrip` between the main grid and `RecentlyViewedStrip`. The strip is invisible to unauthenticated users and users with no follows. CLAUDE.md documents the new hook, component, and API route. `pnpm build` passes.
**Expert Domains:** nextjs
