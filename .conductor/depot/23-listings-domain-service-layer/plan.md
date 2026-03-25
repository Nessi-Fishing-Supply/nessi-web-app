# Implementation Plan: #23 — Listings feature domain scaffold + service layer + card update

## Overview

4 phases, 17 total tasks
Estimated scope: large

## Phase 1: Types, constants, and utility functions

**Goal:** Extend the existing listing types with all required aliases, add category constants, and create price formatting utilities with unit tests.
**Verify:** `pnpm build && pnpm test:run`

### Task 1.1: Extend listing types with full type aliases

The existing `src/features/listings/types/listing.ts` only exports `ListingCondition` and `ListingCategory` enum aliases. Extend it with `Listing` (Row), `ListingInsert`, `ListingUpdate`, `ListingWithPhotos`, `ListingStatus`, and `ListingDraft` types derived from the database schema. Follow the same Omit pattern used in `src/features/listings/types/listing-photo.ts` for Insert/Update (omitting system-managed fields like id, created_at, updated_at, deleted_at, view_count, favorite_count, inquiry_count, search_vector). `ListingWithPhotos` should be `Listing & { listing_photos: ListingPhoto[] }`. `ListingDraft` should be a Partial variant for draft creation flows.
**Files:** `src/features/listings/types/listing.ts`
**AC:** File exports `Listing`, `ListingInsert`, `ListingUpdate`, `ListingWithPhotos`, `ListingDraft`, `ListingStatus`, `ListingCondition`, `ListingCategory`. All types derive from `Database['public']`. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.2: Create category constants

Create a constants file with category labels and icons for display in UI. Each category entry should have `value` (matching the `listing_category` enum), `label` (display name), and `icon` (react-icons icon component reference). Categories from the enum: rods, reels, lures, flies, tackle, line, apparel, electronics, watercraft, other. Use fishing-relevant icons from `react-icons/gi` (game icons) or `react-icons/tb` (tabler) where appropriate, falling back to `react-icons/hi` for generic items.
**Files:** `src/features/listings/constants/category.ts`
**AC:** Exports `LISTING_CATEGORIES` array with all 10 enum values. Each entry has `value`, `label`, and `icon`. Export a `getCategoryLabel(value)` helper function. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.3: Create price formatting utilities

Create utility functions: `formatPrice(cents: number): string` (e.g., 1999 -> "$19.99"), `calculateFee(cents: number, feePercent: number): number` (returns fee in cents), `calculateNet(cents: number, feePercent: number): number` (returns price minus fee in cents). Handle edge cases: zero, negative, non-integer inputs (round to nearest cent).
**Files:** `src/features/listings/utils/format.ts`
**AC:** `formatPrice(1999)` returns `"$19.99"`. `formatPrice(0)` returns `"$0.00"`. `calculateFee(1000, 10)` returns `100`. `calculateNet(1000, 10)` returns `900`. All functions handle edge cases gracefully.
**Expert Domains:** nextjs

### Task 1.4: Write unit tests for format utilities

Write Vitest unit tests covering `formatPrice`, `calculateFee`, and `calculateNet`. Test normal values, zero, large numbers, and rounding behavior. Follow the existing test patterns in the project (Vitest with `@testing-library/react` environment).
**Files:** `src/features/listings/utils/format.test.ts`
**AC:** All tests pass via `pnpm test:run`. Tests cover at least: normal cents values, zero, large numbers, rounding for non-integer inputs.
**Expert Domains:** nextjs

### Task 1.5: Add patch helper to fetch utility

The existing `src/libs/fetch.ts` has `get`, `post`, `put`, and `del` helpers but no `patch`. The status change API route uses PATCH, so add a `patch` export following the same pattern as `put` (accepts url + body, calls `request` with method PATCH).
**Files:** `src/libs/fetch.ts`
**AC:** `patch` function is exported, follows the same signature and pattern as `put`. `pnpm typecheck` passes.
**Expert Domains:** nextjs

## Phase 2: API routes for listings CRUD

**Goal:** Create all server-side API routes for listing operations: list with filters/search/pagination, single listing CRUD, view count increment, status changes, seller listings, and drafts.
**Verify:** `pnpm build`

### Task 2.1: Create main listings API route (GET with filters + POST create)

Create `src/app/api/listings/route.ts`. GET should support query params: `category`, `condition` (comma-separated), `search` (full-text via `search_vector`), `minPrice`/`maxPrice` (in cents), `sort` (newest, price_asc, price_desc), `page`/`limit` (default page=1, limit=24). Always filter `deleted_at IS NULL` and `status = 'active'` for public queries. Return `{ listings, total, page, limit }`. POST should require auth, accept listing fields, set `seller_id` from user, default `status` to `'draft'`. Select with `listing_photos(*)` join. Follow the server client pattern from `src/libs/supabase/server.ts` and the existing API route pattern in `src/app/api/products/route.ts`.
**Files:** `src/app/api/listings/route.ts`
**AC:** GET returns paginated listings with filters applied, never includes soft-deleted or non-active listings. POST creates a draft listing for the authenticated user. Both return proper error responses (401, 400, 500).
**Expert Domains:** supabase, nextjs

### Task 2.2: Create single listing API route (GET, PUT, DELETE)

Create `src/app/api/listings/[id]/route.ts`. GET fetches a single listing with photos joined, returns 404 if not found or soft-deleted. For public access (no auth required) but should filter `deleted_at IS NULL`. PUT requires auth, verifies `seller_id` matches user, updates listing fields. DELETE requires auth, verifies ownership, performs soft-delete by setting `deleted_at = new Date().toISOString()`. Follow the params pattern from `src/app/api/products/[id]/route.ts` (async `context.params`).
**Files:** `src/app/api/listings/[id]/route.ts`
**AC:** GET returns listing with photos or 404. PUT updates only if owner. DELETE soft-deletes only if owner. All filter out already-deleted listings. Returns 401/403/404 as appropriate.
**Expert Domains:** supabase, nextjs

### Task 2.3: Create view count increment route

Create `src/app/api/listings/[id]/view/route.ts`. POST increments `view_count` by 1 using Supabase RPC or direct update. No auth required (public views). Return `{ success: true }`. Should not increment for soft-deleted listings.
**Files:** `src/app/api/listings/[id]/view/route.ts`
**AC:** POST increments view_count by 1. Returns 404 for non-existent or soft-deleted listings. Returns `{ success: true }` on success.
**Expert Domains:** supabase, nextjs

### Task 2.4: Create status change route

Create `src/app/api/listings/[id]/status/route.ts`. PATCH requires auth and ownership. Accepts `{ status }` body. Validates allowed transitions: draft -> active (sets `published_at`), active -> archived, active -> sold, archived -> active, draft -> deleted (hard delete for unpublished drafts). Return updated listing.
**Files:** `src/app/api/listings/[id]/status/route.ts`
**AC:** PATCH changes status with ownership verification. Sets `published_at` on first activation. Rejects invalid transitions with 400. Returns 401/403 for unauthorized requests.
**Expert Domains:** supabase, nextjs

### Task 2.5: Create seller listings route

Create `src/app/api/listings/seller/route.ts`. GET requires auth, returns all listings for the current user (all statuses except hard-deleted, i.e., `deleted_at IS NULL`). Support `status` query param filter. Join `listing_photos(*)`. Order by `updated_at DESC`.
**Files:** `src/app/api/listings/seller/route.ts`
**AC:** GET returns authenticated user's listings across all statuses (excluding soft-deleted). Supports status filter param. Returns 401 if not authenticated.
**Expert Domains:** supabase, nextjs

### Task 2.6: Create drafts API route

Create `src/app/api/listings/drafts/route.ts`. GET requires auth, returns user's draft listings (`status = 'draft'` AND `deleted_at IS NULL`). POST creates a new empty draft with minimal fields (just `seller_id` and `status: 'draft'`), returns the created listing with ID (used by create wizard to get a listing ID before uploading photos). DELETE requires auth and accepts `{ id }` body, hard-deletes a draft (only if `status = 'draft'` and owned by user).
**Files:** `src/app/api/listings/drafts/route.ts`
**AC:** GET returns only draft listings for the authenticated user. POST creates a minimal draft and returns it with an ID. DELETE hard-deletes only drafts owned by the user. All return 401 if unauthenticated.
**Expert Domains:** supabase, nextjs

## Phase 3: Client service layer and Tanstack Query hooks

**Goal:** Create the client-side service functions and Tanstack Query hooks that consume the new API routes, enabling components to fetch and mutate listing data.
**Verify:** `pnpm build`

### Task 3.1: Create listing service layer

Create `src/features/listings/services/listing.ts` with functions that call the API routes via the fetch helpers from `src/libs/fetch.ts`. Functions: `getListings(params)` (GET with query string), `getListingById(id)` (GET single), `getSellerListings(status?)`, `getDrafts()`, `createListing(data)` (POST), `createDraft()` (POST to drafts), `updateListing(id, data)` (PUT), `deleteListing(id)` (DELETE soft-delete), `deleteDraft(id)` (DELETE hard-delete), `updateListingStatus(id, status)` (PATCH), `incrementViewCount(id)` (POST). Follow the pattern in `src/features/products/services/product.ts` using `get`, `post`, `put`, `del`, and the new `patch` from `@/libs/fetch`. Define a `ListingFilters` interface for the params object.
**Files:** `src/features/listings/services/listing.ts`
**AC:** All functions are exported and correctly call their corresponding API routes. `ListingFilters` type is exported. Uses fetch helpers consistently. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 3.2: Create Tanstack Query hooks for listings

Create `src/features/listings/hooks/use-listings.ts` with hooks following the pattern in `src/features/products/hooks/use-products.ts`. Query hooks: `useListings(filters)` with query key `['listings', filters]`, `useListing(id)` with key `['listings', id]`, `useSellerListings(status?)` with key `['listings', 'seller', status]`, `useDrafts()` with key `['listings', 'drafts']`. Mutation hooks: `useCreateListing()`, `useCreateDraft()`, `useUpdateListing()`, `useDeleteListing()`, `useDeleteDraft()`, `useUpdateListingStatus()` — all invalidate relevant `['listings']` query keys on success. `useIncrementViewCount()` as a mutation (fire-and-forget, no invalidation needed).
**Files:** `src/features/listings/hooks/use-listings.ts`
**AC:** All hooks are exported. Query hooks use proper query keys and accept appropriate parameters. Mutation hooks invalidate `['listings']` prefixed keys on success. `pnpm typecheck` passes.
**Expert Domains:** state-management, nextjs

### Task 3.3: Update barrel export file

Update `src/features/listings/index.ts` to export all new types, services, hooks, constants, and utilities added in this ticket. Preserve all existing exports (photo-related services, hooks, types, components, condition constants).
**Files:** `src/features/listings/index.ts`
**AC:** All new exports are accessible via `@/features/listings`. No existing exports are removed. `pnpm typecheck` passes.
**Expert Domains:** nextjs

## Phase 4: Product card update

**Goal:** Update the product card component to accept and display listing data (condition badge, formatted cents price, seller location) while maintaining backward compatibility with the legacy ProductWithImages type.
**Verify:** `pnpm build`

### Task 4.1: Update product card to support ListingWithPhotos

Modify `src/features/products/components/product-card/index.tsx` to accept either `ProductWithImages` or `ListingWithPhotos` via a union prop type. When receiving a listing: format `price_cents` using `formatPrice`, display `ConditionBadge` in the carousel overlay (replacing the hardcoded "In Stock" `Pill`), show `location_city, location_state` if available, remove hardcoded "20% Off Sale" and "Free Shipping" badges. When receiving a product: maintain current behavior (format float price, no condition badge). Use a type guard or discriminator (e.g., check for `price_cents` property) to determine which type was passed. Keep the Swiper carousel, Favorite button, and `next/image` usage intact. Map `listing_photos` array to images in the Swiper (using `thumbnail_url` or `image_url`). Remove `@ts-nocheck` and `eslint-disable` comments from the top of the file.
**Reuses:** `src/features/listings/components/condition-badge/`
**Files:** `src/features/products/components/product-card/index.tsx`
**AC:** Card renders correctly with both `ProductWithImages` and `ListingWithPhotos` props. Listings show condition badge, formatted cents price, and optional location. Products show float-formatted price without condition badge. Hardcoded "In Stock", "20% Off Sale", "Free Shipping" badges are removed. Swiper carousel still works. No `@ts-nocheck` directive.
**Expert Domains:** nextjs, scss

### Task 4.2: Update product card SCSS for condition badge and location

Update `src/features/products/components/product-card/product-card.module.scss` to accommodate the condition badge positioning (replacing the `.pill` styles if needed, or coexisting with it), add a `.location` style for the city/state text below the price section (small muted text), and clean up the `.badgeWrapper` / `.badge` styles since the hardcoded sale/shipping badges are being removed. Keep `.tagIcon` and `.truckIcon` styles only if still needed, otherwise remove dead CSS.
**Files:** `src/features/products/components/product-card/product-card.module.scss`
**AC:** Condition badge is properly positioned in the carousel overlay. Location text is styled as small muted text. No dead CSS remains for removed badges. Mobile-first styles. `pnpm lint:styles` passes.
**Expert Domains:** scss

### Task 4.3: Update listings CLAUDE.md with new architecture

Update `src/features/listings/CLAUDE.md` to document all new files added in this ticket: the service layer, hooks, utils, constants, and API routes. Add entries to the Hooks table, document the API routes, and note the format utilities.
**Files:** `src/features/listings/CLAUDE.md`
**AC:** CLAUDE.md accurately reflects all files in the listings feature after this ticket. New API routes, services, hooks, utils, and constants are documented.
**Expert Domains:** nextjs
