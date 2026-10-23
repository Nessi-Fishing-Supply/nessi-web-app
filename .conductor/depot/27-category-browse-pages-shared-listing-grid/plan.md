# Implementation Plan: #27 — Category browse pages + shared listing grid infrastructure

## Overview

3 phases, 14 total tasks
Estimated scope: medium

## Key Findings from Codebase Scan

- **Database enum values** differ from the ticket: actual values are `rods`, `reels`, `lures`, `flies`, `tackle`, `line`, `apparel`, `electronics`, `watercraft`, `other` (not `combos`, `lures_hard`, `lures_soft`, etc.). The plan uses the real DB enum values.
- **Existing API** at `GET /api/listings` already supports `category`, `sort` (`newest`/`price_asc`/`price_desc`), `page`, `limit` with pagination. Needs `watched` sort added.
- **Existing `ListingFilters`** in `src/features/listings/services/listing.ts` needs `watched` sort option.
- **Navbar** has hardcoded category strings (`Rods`, `Reels`, `Combos`, `Baits`, etc.) that don't match the DB enum and use `<span>` with `aria-disabled="true"` instead of links.
- **Existing Select component** (`src/components/controls/select/`) is tightly coupled to `react-hook-form` via `Controller` — not suitable for standalone sort select. The sort select will be a new listing-feature component.
- **Existing `LISTING_CATEGORIES`** in `src/features/listings/constants/category.ts` has 10 entries with labels and icons — will be extended with SEO descriptions and URL slugs.
- **`ListingCard`** accepts `ListingWithPhotos` and `priority` props — fully reusable as-is.
- **Breakpoints**: `sm` (480px), `md` (768px), `lg` (1024px), `xl` (1200px) via `@include breakpoint()`.

---

## Phase 1: Foundation — Types, Config, API, and Hook

**Goal:** Establish the categories config, extend the API sort options, and create the `useInfiniteQuery` hook for paginated listing fetches.
**Verify:** `pnpm build`

### Task 1.1: Create categories config with SEO metadata and slug mapping

Create `src/features/listings/config/categories.ts` with a map from category slug to display name, SEO description, and the `ListingCategory` enum value. Each entry provides the data needed for `generateMetadata` and the category page header. Also export a `VALID_CATEGORY_SLUGS` set and a `getCategoryBySlug` lookup function. Slugs will match the DB enum values directly (e.g., `rods`, `reels`, `lures`).

**Files:** `src/features/listings/config/categories.ts`
**AC:** `getCategoryBySlug('reels')` returns `{ slug: 'reels', label: 'Reels', description: '...', enumValue: 'reels' }`; `getCategoryBySlug('invalid')` returns `undefined`; all 10 DB enum categories are mapped.
**Expert Domains:** nextjs

### Task 1.2: Add `watched` sort option to API route and service types

Extend `ListingFilters.sort` in `src/features/listings/services/listing.ts` to include `'watched'`. In the API route at `src/app/api/listings/route.ts`, add a `watched` sort case that orders by `watcher_count` descending (the column already exists on the listings table). Update `buildQueryString` in the service to pass the new sort value.

**Files:** `src/features/listings/services/listing.ts`, `src/app/api/listings/route.ts`
**AC:** `GET /api/listings?sort=watched` returns listings ordered by `watcher_count` DESC; existing sort options (`newest`, `price_asc`, `price_desc`) remain unchanged; `ListingFilters` type accepts `'watched'` as a sort value.
**Expert Domains:** supabase, nextjs

### Task 1.3: Create `useListingsInfinite` hook with `useInfiniteQuery`

Create `src/features/listings/hooks/use-listings-infinite.ts` that wraps `useInfiniteQuery`. It accepts `{ category?: string; sort?: string; limit?: number }` params. Each page fetches from `GET /api/listings` with the appropriate `page` param. Uses `getNextPageParam` by comparing returned `page * limit` against `total`. Query key: `['listings', 'infinite', { category, sort }]`. Export a `useListingsInfinite` function. Add the export to `src/features/listings/index.ts`.

**Files:** `src/features/listings/hooks/use-listings-infinite.ts`, `src/features/listings/index.ts`
**AC:** Hook returns `data.pages` array where each page has `{ listings, total, page, limit }`; `fetchNextPage()` fetches the next page; `hasNextPage` is `false` when all listings are loaded; default limit is 24.
**Expert Domains:** state-management

---

## Phase 2: Shared Components — Grid, Skeleton, Infinite Scroll, Sort, Empty State

**Goal:** Build the five reusable listing browse components that the category page (and future search page) will compose together.
**Verify:** `pnpm build`

### Task 2.1: Create `ListingGrid` component

Create `src/features/listings/components/listing-grid/index.tsx` and `listing-grid.module.scss`. A CSS Grid container that renders children in a responsive 2/3/4 column layout: 2 columns at mobile (base), 3 columns at `md` (768px), 4 columns at `lg` (1024px). Uses `@include breakpoint()` mixin. Props: `children: ReactNode`. Uses `gap: var(--space-sm)` scaling to `var(--space-md)` at `md`. Does NOT use the existing `Grid` component in `src/components/layout/grid/`.

**Files:** `src/features/listings/components/listing-grid/index.tsx`, `src/features/listings/components/listing-grid/listing-grid.module.scss`
**AC:** At 375px viewport: 2 columns; at 768px: 3 columns; at 1024px: 4 columns; CSS Grid with `grid-template-columns: repeat(N, 1fr)`; mobile-first SCSS with no `max-width` queries; all spacing uses design tokens.
**Reuses:** `src/features/listings/components/listing-card/` (will be passed as children)
**Expert Domains:** scss

### Task 2.2: Create `ListingSkeleton` component

Create `src/features/listings/components/listing-skeleton/index.tsx` and `listing-skeleton.module.scss`. Renders a configurable number of shimmer placeholder cards (default 8) that match the `ListingCard` dimensions: a rectangular image placeholder (224px height matching `.carousel` in listing-card.module.scss) and 3 text line placeholders. Uses a CSS `@keyframes` shimmer animation with `background: linear-gradient` sweep. Props: `count?: number`. No external skeleton library.

**Files:** `src/features/listings/components/listing-skeleton/index.tsx`, `src/features/listings/components/listing-skeleton/listing-skeleton.module.scss`
**AC:** Renders `count` skeleton cards (default 8); each card has an image placeholder and text placeholders; shimmer animation runs via CSS `@keyframes`; uses design tokens for border-radius and spacing; no JS animation or third-party packages.
**Expert Domains:** scss

### Task 2.3: Create `InfiniteScroll` wrapper component

Create `src/features/listings/components/infinite-scroll/index.tsx` and `infinite-scroll.module.scss`. A wrapper component that uses `IntersectionObserver` to detect when a sentinel element is 200px from the bottom of the viewport. Props: `children: ReactNode`, `onLoadMore: () => void`, `hasMore: boolean`, `isLoading: boolean`, `endMessage?: string`. When `hasMore` is true and the sentinel is visible, calls `onLoadMore`. Shows a loading indicator (skeleton row via `ListingSkeleton` with `count={4}`) when `isLoading`. Shows the end message (default: "You've seen everything") when `!hasMore && !isLoading`. No scroll event listeners. Uses `useRef` + `useEffect` with `IntersectionObserver` and `rootMargin: '0px 0px 200px 0px'`.

**Files:** `src/features/listings/components/infinite-scroll/index.tsx`, `src/features/listings/components/infinite-scroll/infinite-scroll.module.scss`
**AC:** Sentinel triggers `onLoadMore` when within 200px of viewport bottom; does NOT use scroll event listeners; shows loading skeleton when `isLoading`; shows end message when all items loaded; end message has `role="status"` for screen readers; observer disconnects on unmount.
**Reuses:** `src/features/listings/components/listing-skeleton/` for the loading state
**Expert Domains:** nextjs

### Task 2.4: Create `SortSelect` component

Create `src/features/listings/components/sort-select/index.tsx` and `sort-select.module.scss`. A standalone `<select>` element (not coupled to react-hook-form) for sorting listings. Props: `value: string`, `onChange: (value: string) => void`. Options: "Most recent" (`recent`), "Price: Low to High" (`price_asc`), "Price: High to Low" (`price_desc`), "Most watched" (`watched`). Uses native `<select>` for optimal mobile UX. Styled with design tokens, minimum 44px tap target height. Has a visible label "Sort by" either as a `<label>` or embedded in the UI.

**Files:** `src/features/listings/components/sort-select/index.tsx`, `src/features/listings/components/sort-select/sort-select.module.scss`
**AC:** Renders a native `<select>` with 4 sort options; `onChange` fires with the selected value string; minimum 44px tap target; has an accessible `<label>` associated via `htmlFor`/`id`; mobile-first SCSS; uses design tokens for all values.
**Expert Domains:** scss

### Task 2.5: Create `EmptyState` component

Create `src/features/listings/components/empty-state/index.tsx` and `empty-state.module.scss`. A centered message display for when no listings match. Props: `message: string`, `description?: string`, `ctaLabel?: string`, `ctaHref?: string`. Renders the message as a heading, optional description paragraph, and an optional CTA as an `<a>` styled as a button (using existing `Button` component or `AppLink`). Centered layout with appropriate spacing.

**Files:** `src/features/listings/components/empty-state/index.tsx`, `src/features/listings/components/empty-state/empty-state.module.scss`
**AC:** Shows `message` as a heading; optional `description` renders as a paragraph; optional CTA renders as a link/button; centered layout; mobile-first SCSS; uses design tokens.
**Reuses:** `src/components/controls/button/` or `src/components/controls/app-link/` for the CTA
**Expert Domains:** scss

### Task 2.6: Export new components from listings barrel file

Add exports for `ListingGrid`, `ListingSkeleton`, `InfiniteScroll`, `SortSelect`, and `EmptyState` to `src/features/listings/index.ts`.

**Files:** `src/features/listings/index.ts`
**AC:** All five new components are importable from `@/features/listings`; existing exports unchanged.

---

## Phase 3: Category Page Route and Navbar Integration

**Goal:** Wire the shared components into the `/category/[slug]` route with SEO metadata, and update the navbar category links to navigate to the new routes.
**Verify:** `pnpm build`

### Task 3.1: Create category page server component with `generateMetadata`

Create `src/app/(frontend)/category/[slug]/page.tsx`. This is a server component that validates the slug against `getCategoryBySlug` from the categories config — if invalid, calls `notFound()`. Exports `generateMetadata` that returns `{ title: '{Category Label}', description: '{SEO description}' }` using the title template (`%s | Nessi`). Renders the `CategoryBrowse` client component (Task 3.2) with the validated category slug and label as props.

**Files:** `src/app/(frontend)/category/[slug]/page.tsx`
**AC:** `/category/reels` renders with title "Reels | Nessi"; `/category/invalid-slug` returns 404 via `notFound()`; `generateMetadata` returns correct title and description for each valid category; follows the `params: Promise<{ slug: string }>` pattern from the listing detail page.
**Expert Domains:** nextjs

### Task 3.2: Create `CategoryBrowse` client component

Create `src/app/(frontend)/category/[slug]/category-browse.tsx` and `category-browse.module.scss`. A `'use client'` component that composes `SortSelect`, `ListingGrid`, `ListingCard`, `InfiniteScroll`, `ListingSkeleton`, and `EmptyState`. Props: `slug: string`, `label: string`. Uses `useListingsInfinite({ category: slug, sort })` where `sort` is read from URL search params via `useSearchParams`. The `SortSelect` onChange updates the URL `?sort=` param via `router.replace` (shallow). Initial load shows `ListingSkeleton` (8 cards) inside `ListingGrid`. Loaded listings render as `ListingCard` inside `ListingGrid`. `InfiniteScroll` wraps the grid and handles pagination. Shows `EmptyState` when no listings found. Page header shows the category label as an `<h1>`.

**Files:** `src/app/(frontend)/category/[slug]/category-browse.tsx`, `src/app/(frontend)/category/[slug]/category-browse.module.scss`
**AC:** Renders category label as `<h1>`; sort dropdown reads and writes URL `?sort=` param; initial state shows skeleton grid; listings render in `ListingGrid` with `ListingCard`; infinite scroll triggers next page fetch; empty state shows when no listings match; clicking a listing card navigates to `/listing/[id]`; all SCSS is mobile-first.
**Reuses:** `src/features/listings/components/listing-grid/`, `src/features/listings/components/listing-card/`, `src/features/listings/components/infinite-scroll/`, `src/features/listings/components/sort-select/`, `src/features/listings/components/listing-skeleton/`, `src/features/listings/components/empty-state/`
**Expert Domains:** nextjs, state-management, scss

### Task 3.3: Update navbar category links to real routes

Update `src/components/navigation/navbar/index.tsx` to replace the hardcoded category string array with entries from `LISTING_CATEGORIES` (from `src/features/listings/constants/category.ts`). Change each `<span>` with `role="link" aria-disabled="true"` to a Next.js `<Link>` pointing to `/category/{slug}`. The category labels and slugs come from the existing `LISTING_CATEGORIES` constant. Update the `.categories` SCSS to style `<a>` tags with proper hover/focus-visible states and 44px minimum tap target.

**Files:** `src/components/navigation/navbar/index.tsx`, `src/components/navigation/navbar/navbar.module.scss`
**AC:** Each category in the navbar is a `<Link>` to `/category/{slug}`; clicking "Reels" navigates to `/category/reels`; links have visible `:hover` and `:focus-visible` styles; tap targets are at least 44px; category list matches the DB enum values; no more `aria-disabled` spans.
**Reuses:** `src/features/listings/constants/category.ts` for `LISTING_CATEGORIES`
**Expert Domains:** nextjs, scss

### Task 3.4: Add `not-found.tsx` for the category route segment

Create `src/app/(frontend)/category/[slug]/not-found.tsx` to provide a user-friendly 404 page when an invalid category slug is visited. Shows a message like "Category not found" with a link back to the homepage. Uses the existing layout and design tokens.

**Files:** `src/app/(frontend)/category/[slug]/not-found.tsx`
**AC:** `/category/invalid-slug` renders the not-found page instead of the default Next.js 404; page includes a message and a link to `/`; uses design tokens for styling.
**Expert Domains:** nextjs

### Task 3.5: Update listings feature CLAUDE.md with new components and hooks

Update `src/features/listings/CLAUDE.md` to document the new components (`ListingGrid`, `ListingSkeleton`, `InfiniteScroll`, `SortSelect`, `EmptyState`), the new hook (`useListingsInfinite`), the new config file (`config/categories.ts`), and the new category page route (`/category/[slug]`). Add entries to the Components table, Hooks table, and Pages table.

**Files:** `src/features/listings/CLAUDE.md`
**AC:** CLAUDE.md documents all 5 new components with location and purpose; documents `useListingsInfinite` hook with query key; documents `config/categories.ts`; documents `/category/[slug]` route; existing documentation unchanged.
