# Implementation Plan: #206 — Recommendations API Route with 3 Context Modes

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Foundation — Types, Constants, and Server Service

**Goal:** Define recommendation types, add the `getRecentlyViewedIds` server helper, and build the core server-side recommendation service with all three context modes (similar, seller, also_liked).
**Verify:** `pnpm build`

### Task 1.1: Define recommendation types

Create the TypeScript types for the recommendations feature: the `RecommendationContext` union type (`'similar' | 'seller' | 'also_liked'`), the `RecommendationsParams` type for each context mode's parameters, and the `RecommendationsResponse` type (`{ listings: ListingWithPhotos[], context: RecommendationContext }`). Place these in the listings types directory following the existing pattern of database-derived types in `listing.ts`.

**Files:** `src/features/listings/types/recommendation.ts`
**AC:** Types compile with no errors. `RecommendationContext` is a string union of the 3 modes. `RecommendationsResponse` contains `listings: ListingWithPhotos[]` and `context: RecommendationContext`.
**Expert Domains:** nextjs

### Task 1.2: Add `getRecentlyViewedIds` to the recently-viewed server service

Add a lightweight server-side function `getRecentlyViewedIds` to the existing recently-viewed server service. This function accepts a Supabase server client and a `userId`, queries the `recently_viewed` table for that user's listing IDs (ordered by `viewed_at` desc), and returns `string[]` of listing IDs only (no joins needed). Also export it from the recently-viewed barrel file. This is the function referenced in the issue comment for resolving IDs server-side in the `also_liked` context.

**Files:** `src/features/recently-viewed/services/recently-viewed-server.ts`, `src/features/recently-viewed/index.ts`
**AC:** `getRecentlyViewedIds(userId)` returns `string[]` of listing IDs ordered by most recently viewed first. Function is exported from the recently-viewed barrel. No join to listings table — just selects `listing_id` from `recently_viewed`.
**Expert Domains:** supabase

### Task 1.3: Build the recommendation server service with 3 context modes

Create `src/features/listings/services/recommendation-server.ts` with `getRecommendationsServer` function. This is the core query logic used by the API route.

**`similar` mode:** Accepts `listingId` and `category`. Queries active, non-deleted listings in the same `category`, excluding the given listing. Uses `CONDITION_TIERS` from `@/features/listings/constants/condition` to determine adjacent condition tiers (the listing's own tier plus one tier above and below in the ordered array). Filters to those conditions. Orders by `created_at` desc. Limits to 12. Joins `listing_photos` ordered by position.

**`seller` mode:** Accepts `sellerId` (the `seller_id` from the listing) and optionally `shopId`. If `shopId` is provided, queries by `shop_id`; otherwise queries by `seller_id`. Excludes the given listing. Filters active + not deleted. Orders by `created_at` desc. Limits to 12. Joins `listing_photos`.

**`also_liked` mode:** Accepts optional `listingIds: string[]` and optional `userId: string`. When `userId` is provided, calls `getRecentlyViewedIds` to resolve IDs from the DB, preferring these over any provided `listingIds`. Fetches the categories of the resolved listing IDs, then queries active non-deleted listings in those same categories (excluding the source IDs). Orders by `created_at` desc. Limits to 12. Joins `listing_photos`.

All modes use `createClient` from `@/libs/supabase/server` and return `ListingWithPhotos[]`.

**Files:** `src/features/listings/services/recommendation-server.ts`
**AC:** `getRecommendationsServer` handles all 3 context modes. `similar` returns listings in the same category with adjacent conditions, excluding the source listing, max 12. `seller` returns listings from the same seller/shop, excluding the source listing, max 12. `also_liked` resolves IDs from DB when `userId` is provided (preferring over client `listingIds`), then returns listings in matching categories, max 12. All modes filter `status = 'active'` and `deleted_at IS NULL`, and join `listing_photos` ordered by position.
**Expert Domains:** supabase

## Phase 2: API Route, Client Service, and Hook

**Goal:** Wire the server service to a public API route, create the client-side fetch wrapper, and build the Tanstack Query hook for consuming recommendations in components.
**Verify:** `pnpm build`

### Task 2.1: Create the `GET /api/listings/recommendations` route handler

Create the API route at `src/app/api/listings/recommendations/route.ts`. Parse the `context` query param (required, must be one of `similar`, `seller`, `also_liked`). Parse context-specific params from the URL:

- `similar`: requires `listingId`, `category`, `condition` (the source listing's condition for adjacent tier calculation). Optional `excludeListingId`.
- `seller`: requires `sellerId`. Optional `shopId`, `excludeListingId`.
- `also_liked`: optional `listingIds` (comma-separated string), optional `userId`.

Validate required params per context mode — return 400 if missing. Call `getRecommendationsServer` with the parsed params. Return `{ listings, context }`. Follow the existing API route patterns: try/catch, `NextResponse.json`, console.error on failures. This is a public endpoint (no auth required) — but for `also_liked` with `userId`, the route should verify the userId matches the authenticated user (if present) to prevent fetching another user's recently-viewed data.

**Files:** `src/app/api/listings/recommendations/route.ts`
**AC:** `GET /api/listings/recommendations?context=similar&listingId=X&category=Y&condition=Z` returns `{ listings, context: 'similar' }`. `GET /api/listings/recommendations?context=seller&sellerId=X` returns `{ listings, context: 'seller' }`. `GET /api/listings/recommendations?context=also_liked&userId=X` returns `{ listings, context: 'also_liked' }`. Missing required params return 400. Invalid context value returns 400. `userId` param is validated against the authenticated user's ID when auth is present.
**Expert Domains:** nextjs, supabase

### Task 2.2: Create the client-side recommendations service

Add a `getRecommendations` function to a new client service file. It calls `GET /api/listings/recommendations` via the `get` helper from `@/libs/fetch`, building the query string from the provided params. The function signature should accept a params object matching each context mode's needs and return `RecommendationsResponse`. Follow the pattern in `src/features/listings/services/listing.ts` (using `get` from `@/libs/fetch`, building query strings with `URLSearchParams`).

**Files:** `src/features/listings/services/recommendation.ts`
**AC:** `getRecommendations(params)` calls the API route with correct query params for each context mode. Returns typed `RecommendationsResponse`. Uses `get` from `@/libs/fetch`. For `also_liked` with `listingIds` array, serializes as comma-separated string.
**Expert Domains:** nextjs

### Task 2.3: Create the `useRecommendations` Tanstack Query hook

Create a new hook file with `useRecommendations`. The hook accepts params matching the context modes and returns a standard `useQuery` result. Query key should be `['listings', 'recommendations', context, ...contextSpecificKeys]` so different recommendation requests are cached independently. The hook should be `enabled` only when the required params for the given context are present. Follow the existing hook patterns in `src/features/listings/hooks/use-listings.ts`.

**Files:** `src/features/listings/hooks/use-recommendations.ts`
**AC:** `useRecommendations({ context: 'similar', listingId, category, condition })` fetches similar recommendations. `useRecommendations({ context: 'seller', sellerId })` fetches seller recommendations. `useRecommendations({ context: 'also_liked', userId })` fetches also-liked recommendations. Query is disabled when required params are missing. Query key includes context and context-specific identifiers for proper caching.
**Expert Domains:** state-management

## Phase 3: Barrel Exports and Polish

**Goal:** Export all new types, services, and hooks from the feature barrel files, and ensure the full pipeline is type-safe and buildable.
**Verify:** `pnpm build`

### Task 3.1: Export recommendation types from the listings barrel

Add exports for `RecommendationContext`, `RecommendationsResponse`, and the params types from the new `types/recommendation.ts` to the listings barrel file. Follow the existing export grouping pattern (types section).

**Files:** `src/features/listings/index.ts`
**AC:** `RecommendationContext` and `RecommendationsResponse` types are importable from `@/features/listings`. All new type exports are in the types section of the barrel file.
**Expert Domains:** nextjs

### Task 3.2: Export recommendation service and hook from the listings barrel

Add exports for `getRecommendations` from the client service and `useRecommendations` from the hook to the listings barrel file. Also export `getRecommendationsServer` from the server service. Follow the existing barrel export grouping (services section, hooks section, server services section).

**Files:** `src/features/listings/index.ts`
**AC:** `getRecommendations`, `getRecommendationsServer`, and `useRecommendations` are importable from `@/features/listings`. Exports are placed in the correct sections of the barrel file.
**Expert Domains:** nextjs

### Task 3.3: Update listings CLAUDE.md with recommendation documentation

Add documentation for the new recommendations feature to the listings CLAUDE.md. Document the API route (`GET /api/listings/recommendations`), the three context modes with their parameters, the server service, client service, and hook. Add `useRecommendations` to the hooks table. Follow the existing documentation format.

**Files:** `src/features/listings/CLAUDE.md`
**AC:** CLAUDE.md documents the recommendations API route with all three context modes and their parameters. The hooks table includes `useRecommendations`. The services are listed in the architecture section.
