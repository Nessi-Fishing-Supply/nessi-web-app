# Implementation Plan: #208 — Similar Items section on listing detail page

## Overview

1 phase, 2 total tasks
Estimated scope: small

## Phase 1: Integrate Similar Items strip on listing detail page

**Goal:** Wire `useRecommendations({ context: 'similar' })` into the listing detail page and render a `ListingScrollStrip` titled "Similar Items" between the Condition Details accordion and the report row.
**Verify:** `pnpm build`

### Task 1.1: Create SimilarItemsStrip wrapper component

Create a `SimilarItemsStrip` client component that encapsulates the `useRecommendations` call with `context: 'similar'` and renders a `ListingScrollStrip`. This follows the exact same pattern as `RecentlyViewedStrip` (`src/features/recently-viewed/components/recently-viewed-strip/index.tsx`), which wraps a data hook and delegates rendering to `ListingScrollStrip`. The component accepts `listingId`, `category`, and `condition` as props, passes `excludeListingId` equal to `listingId` to exclude the source listing, and returns `null` when loading is complete and 0 results are returned.
**Files:** `src/features/listings/components/similar-items-strip/index.tsx`
**AC:**

- Component calls `useRecommendations({ context: 'similar', listingId, category, condition, excludeListingId: listingId })`
- Component renders `ListingScrollStrip` with `title="Similar Items"` and `ariaLabel="Similar items"`
- Component returns `null` when `!isLoading && data.listings.length === 0`
- Component passes `isLoading` to `ListingScrollStrip` for skeleton states
- Source listing is excluded via `excludeListingId`
  **Expert Domains:** state-management

### Task 1.2: Add SimilarItemsStrip to listing detail page

Import and render `SimilarItemsStrip` in `listing-detail.tsx`. Place it inside the `.belowFold` div, after the Condition Details accordion section (line ~301) and before the report row div (line ~304). Pass `listing.id`, `listing.category`, and `listing.condition` as props. Add a `similarSection` class to the SCSS module for spacing that matches the existing `contentSection` pattern (padding + border-bottom separator). The strip is rendered unconditionally since the component itself handles the empty-state by returning `null`.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`, `src/app/(frontend)/listing/[id]/listing-detail.module.scss`
**AC:**

- `SimilarItemsStrip` appears between the Condition Details accordion and the report row
- When the API returns 0 similar items, no "Similar Items" section is rendered (strip returns null)
- When similar items exist, a horizontal scroll strip with title "Similar Items" is visible
- The section has consistent spacing with adjacent content sections (padding, border separators)
- `pnpm build` passes with no type errors
  **Reuses:** `src/components/layout/listing-scroll-strip/` (shared scroll strip), `src/features/listings/hooks/use-recommendations.ts` (existing hook)
  **Expert Domains:** nextjs, scss
