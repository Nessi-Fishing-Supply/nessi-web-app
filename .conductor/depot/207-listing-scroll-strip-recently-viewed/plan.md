# Implementation Plan: #207 — ListingScrollStrip + Recently Viewed

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Data Layer — useRecentlyViewedListings Hook

**Goal:** Create the hook that reads recently viewed IDs from `useRecentlyViewed` and fetches full listing data, ready for any consumer component.
**Verify:** `pnpm build`

### Task 1.1: Add batch listing fetch service function

Add a `getListingsByIds` function to the client-side listing service. This calls `GET /api/listings?ids=uuid1,uuid2,...` which does not exist yet, so also create the server-side handler. The API route should accept a comma-separated `ids` query param, fetch those listings with photos joined, filter to `status = 'active'` and `deleted_at IS NULL`, and return a `ListingWithPhotos[]`. This gives us a single-request batch fetch instead of N individual calls. Limit to 30 IDs max (matching the recently-viewed cap).
**Files:**

- `src/features/listings/services/listing.ts` (add `getListingsByIds`)
- `src/app/api/listings/batch/route.ts` (new GET route)
- `src/features/listings/services/listing-server.ts` (add `getListingsByIdsServer`)
  **AC:**
- `GET /api/listings/batch?ids=id1,id2` returns `ListingWithPhotos[]` for only active, non-deleted listings
- Invalid/missing IDs are silently omitted from the response
- Returns 400 if `ids` param is missing or empty
- Max 30 IDs enforced (returns 400 if exceeded)
  **Expert Domains:** supabase, nextjs

### Task 1.2: Create useRecentlyViewedListings hook

Create the `useRecentlyViewedListings` hook in `src/features/recently-viewed/hooks/`. It reads listing IDs from `useRecentlyViewed().items`, then calls `getListingsByIds` via a single `useQuery` (not `useQueries` — a batch endpoint is more efficient than parallel individual fetches). For authenticated users, the DB-backed `useRecentlyViewed` returns IDs; for guests, localStorage IDs. The hook returns `{ listings: ListingWithPhotos[], isLoading: boolean }`. It is `enabled` only when `items.length > 0`. Stale/deleted listings are silently filtered by the API. Export the hook from the feature barrel `index.ts`.
**Files:**

- `src/features/recently-viewed/hooks/use-recently-viewed-listings.ts` (new)
- `src/features/recently-viewed/index.ts` (add export)
  **AC:**
- Hook returns `{ listings, isLoading }` where `listings` is `ListingWithPhotos[]`
- Returns empty array when no recently viewed items exist
- Query is disabled (not fired) when items array is empty
- Query key includes the sorted list of IDs so it refetches when the list changes
- Listings are returned in recently-viewed order (most recent first), not API return order
  **Expert Domains:** state-management

## Phase 2: ListingScrollStrip Component

**Goal:** Build the reusable horizontal scroll strip component with CSS scroll-snap, responsive card sizing, and full accessibility markup.
**Verify:** `pnpm build`

### Task 2.1: Create ListingScrollStrip component

Build the `ListingScrollStrip` component in `src/components/layout/listing-scroll-strip/`. Props: `title: string`, `listings: ListingWithPhotos[]`, `ariaLabel: string`, optional `isLoading: boolean`. Renders a section heading and a horizontal scrollable container of `ListingCard` components. Uses CSS scroll-snap (`scroll-snap-type: x mandatory` on container, `scroll-snap-align: start` on items). Returns `null` when `listings` is empty and `isLoading` is false. This is a shared layout component because it will be reused on homepage, category pages, and potentially listing detail pages for recommendations.
**Files:**

- `src/components/layout/listing-scroll-strip/index.tsx` (new)
- `src/components/layout/listing-scroll-strip/listing-scroll-strip.module.scss` (new)
  **Reuses:** `src/features/listings/components/listing-card/` (imported as child)
  **AC:**
- Renders `role="region"` with `aria-label` prop on the outer element
- Horizontal scroll with CSS scroll-snap, no JS carousel library
- Cards are 160px wide on mobile (base styles), 220px on desktop (`breakpoint(lg)`)
- Scroll container hides scrollbar visually (webkit + Firefox scrollbar-width: none) but remains scrollable
- Returns `null` when listings array is empty and not loading
- Shows skeleton placeholder cards when `isLoading` is true
- Title rendered as `<h2>` with appropriate styling
- Mobile-first SCSS: base styles for mobile, breakpoint overrides for larger screens
- Padding/gap uses design token CSS custom properties (no hardcoded px for spacing)
  **Expert Domains:** scss, nextjs

### Task 2.2: Create scroll strip skeleton loader

Add a loading state to `ListingScrollStrip` that renders placeholder skeleton cards matching the strip layout. Reuse the existing `ListingSkeleton` component from `src/features/listings/components/listing-skeleton/` if its dimensions are compatible, or create a compact variant. The skeleton should show 3-4 placeholder cards in the horizontal strip to indicate content is loading.
**Files:**

- `src/components/layout/listing-scroll-strip/index.tsx` (update loading branch)
- `src/components/layout/listing-scroll-strip/listing-scroll-strip.module.scss` (skeleton styles if needed)
  **Reuses:** `src/features/listings/components/listing-skeleton/`
  **AC:**
- When `isLoading` is true, renders skeleton cards in the same horizontal layout
- Skeleton cards match the 160px/220px responsive widths
- Animation uses pulse/shimmer consistent with existing `ListingSkeleton` patterns
- Screen readers see an accessible loading indicator (`aria-busy="true"` on the region)

### Task 2.3: Add RecentlyViewedStrip wrapper component

Create a `RecentlyViewedStrip` component in `src/features/recently-viewed/components/` that composes `useRecentlyViewedListings` + `ListingScrollStrip`. This is the ready-to-drop-in component for pages. It passes `title="Recently Viewed"` and `ariaLabel="Recently viewed listings"`. Returns `null` when the hook has no listings and is not loading (the strip handles this, but the wrapper also short-circuits to avoid rendering the region at all before data loads).
**Files:**

- `src/features/recently-viewed/components/recently-viewed-strip/index.tsx` (new)
- `src/features/recently-viewed/index.ts` (add export)
  **Reuses:** `src/components/layout/listing-scroll-strip/`
  **AC:**
- Renders `ListingScrollStrip` with title "Recently Viewed" and correct aria-label
- Passes `isLoading` from the hook to show skeleton while fetching
- Returns `null` when there are no recently viewed listings and loading is complete
- Uses `'use client'` directive (depends on hooks)
  **Expert Domains:** state-management

## Phase 3: Page Integration

**Goal:** Integrate the RecentlyViewedStrip on the homepage and category browse pages, verify build, and ensure the strip renders correctly in both contexts.
**Verify:** `pnpm build`

### Task 3.1: Add RecentlyViewedStrip to the homepage

Import and render `RecentlyViewedStrip` on the homepage below the main listings grid. The strip renders itself or returns null based on whether the user has recently viewed items, so no conditional logic is needed in the page.
**Files:**

- `src/app/(frontend)/page.tsx` (add import + render)
  **AC:**
- `RecentlyViewedStrip` renders below the main listing grid
- Strip does not appear when the user has no recently viewed items
- Strip appears with correct horizontal scroll when items exist
- Page still passes `pnpm build` with no type errors

### Task 3.2: Add RecentlyViewedStrip to category browse page

Import and render `RecentlyViewedStrip` on the category browse page. Place it below the category header and sort controls but above the main listing grid, so users see relevant previously-viewed items as they browse a category.
**Files:**

- `src/app/(frontend)/category/[slug]/category-browse.tsx` (add import + render)
- `src/app/(frontend)/category/[slug]/category-browse.module.scss` (spacing adjustment if needed)
  **AC:**
- `RecentlyViewedStrip` renders between the header/sort controls and the listing grid
- Strip does not appear when the user has no recently viewed items
- Strip does not interfere with infinite scroll or sort functionality
- Page still passes `pnpm build` with no type errors

### Task 3.3: Update feature CLAUDE.md documentation

Update the recently-viewed feature CLAUDE.md to document the new hook (`useRecentlyViewedListings`) and components (`RecentlyViewedStrip`, plus the shared `ListingScrollStrip`). Add entries to the hooks table and note the new API route.
**Files:**

- `src/features/recently-viewed/CLAUDE.md` (update)
  **AC:**
- Documents `useRecentlyViewedListings` hook with query key and purpose
- Documents `RecentlyViewedStrip` component
- References the shared `ListingScrollStrip` component in `src/components/layout/`
- Documents the `GET /api/listings/batch` route dependency
- Accuracy: all file paths and type names match the actual implementation
