# Implementation Plan: #209 — You Might Also Like section on cart page

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: AlsoLikedStrip component

**Goal:** Create a reusable AlsoLikedStrip component following the SimilarItemsStrip pattern, with client-side cart exclusion filtering
**Verify:** `pnpm build`

### Task 1.1: Create AlsoLikedStrip component

Create `AlsoLikedStrip` following the exact pattern of `SimilarItemsStrip`. The component accepts `userId` and `excludeListingIds` props. It calls `useRecommendations({ context: 'also_liked', userId })` and filters out any listings whose `id` appears in `excludeListingIds` before passing results to `ListingScrollStrip`. Returns `null` when loading completes with 0 results (after filtering).

Client-side filtering is the right approach here because: (1) the API's `also_liked` context has no `excludeListingIds` param, (2) cart is capped at 25 items and recommendations return max 12, so the filter is trivial, (3) avoids touching shared API/service/type infrastructure.

**Files:** `src/features/listings/components/also-liked-strip/index.tsx`
**Reuses:** `src/components/layout/listing-scroll-strip/index.tsx`, `src/features/listings/hooks/use-recommendations.ts`
**AC:**

- Component renders `ListingScrollStrip` with title "You Might Also Like" and `ariaLabel="Recommendations based on your browsing history"`
- When `useRecommendations` returns listings, any whose `id` is in `excludeListingIds` are filtered out before rendering
- Returns `null` when not loading and filtered results are empty
- Passes `isLoading` through to `ListingScrollStrip` for skeleton state
- Component has `'use client'` directive
  **Expert Domains:** nextjs

### Task 1.2: Add SCSS styles for recommendations section spacing on cart page

Add a `.recommendations` class to the cart page SCSS module that provides vertical spacing between the layout div and the sticky bar. The strip needs top margin to separate from the cart layout, and bottom margin to clear the mobile sticky bar.

**Files:** `src/app/(frontend)/cart/cart-page.module.scss`
**AC:**

- `.recommendations` class adds `margin-top: var(--spacing-600)` for separation from cart layout
- Mobile-first: bottom padding accounts for sticky bar height (already handled by `.page` padding-bottom)
- No other style changes needed — `ListingScrollStrip` handles its own internal layout
  **Expert Domains:** scss

## Phase 2: Cart page integration

**Goal:** Wire AlsoLikedStrip into the authenticated cart view, hidden for guests and empty carts
**Verify:** `pnpm build`

### Task 2.1: Integrate AlsoLikedStrip into cart-page.tsx

Import `AlsoLikedStrip` and render it in the authenticated non-empty cart return block (the final `return` starting at line 231). Place it between the `.layout` div (line 269-302) and the `.stickyBar` div (line 304-315), wrapped in a div with the `.recommendations` class. Pass `userId={user.id}` and `excludeListingIds` derived from `cartItems.map(item => item.listing_id)`.

Do NOT render the strip in:

- The loading skeleton return (line 118-148)
- The guest cart return (line 151-208)
- The authenticated empty cart return (line 212-226)

**Files:** `src/app/(frontend)/cart/cart-page.tsx`
**Reuses:** `src/features/listings/components/also-liked-strip/index.tsx`
**AC:**

- `AlsoLikedStrip` renders only in the authenticated non-empty cart view
- `userId` is `user.id` from `useAuth()`
- `excludeListingIds` contains all `listing_id` values from current `cartItems`
- Strip is positioned between the layout and sticky bar in the DOM
- Guest users never see the strip (component is not rendered at all)
- Empty authenticated cart never shows the strip
- `pnpm build` passes with no type errors
  **Expert Domains:** nextjs

### Task 2.2: Verify build and lint

Run `pnpm build`, `pnpm lint`, and `pnpm typecheck` to confirm the integration compiles cleanly with no regressions.

**Files:** (none — verification only)
**AC:**

- `pnpm build` succeeds
- `pnpm lint` passes
- `pnpm typecheck` passes
  **Expert Domains:** nextjs
