# Implementation Plan: #215 — Following list page in dashboard

## Overview

2 phases, 6 total tasks
Estimated scope: small

## Phase 1: FollowingCard component and page styles

**Goal:** Create the FollowingCard component and the page-level SCSS module so the page has all UI building blocks ready.
**Verify:** `pnpm build`

### Task 1.1: Create the FollowingCard component

Build a card component that displays a single followed entity (member or shop). The card shows an Avatar (reusing `@/components/controls/avatar`), the entity name as a link (using `@/components/controls/app-link`) to the member or shop profile page, a Pill (reusing `@/components/indicators/pill`) showing the target type ("Member" or "Shop"), a relative follow date (using `@/components/indicators/date-time-display`), and an Unfollow button (using `@/components/controls/button` with `style="danger"` and `outline`). The card accepts a `FollowingItem` plus an `onUnfollow` callback and an `isUnfollowing` boolean for the loading state. The component must be `'use client'` since it uses interactive elements and the Avatar component.

**Files:**

- `src/features/follows/types/following-card.ts` (FollowingCardProps type)
- `src/features/follows/components/following-card/index.tsx`
- `src/features/follows/components/following-card/following-card.module.scss`

**Reuses:**

- `src/components/controls/avatar/` (Avatar with `imageUrl`, `name`, `isShop`)
- `src/components/controls/app-link/` (name links to `/member/{target_id}` or `/shop/{target_id}`)
- `src/components/indicators/pill/` (type label — "Member" or "Shop")
- `src/components/indicators/date-time-display/` (follow date with `format="relative"`)
- `src/components/controls/button/` (Unfollow button with `style="danger"`, `outline`, `loading`)

**AC:**

- FollowingCard renders avatar, linked name, type pill, relative date, and Unfollow button
- Clicking Unfollow calls `onUnfollow` callback with the item's `target_type` and `target_id`
- Button shows loading spinner and is disabled when `isUnfollowing` is true
- `aria-label` on the Unfollow button reads "Unfollow {name}"
- Card links point to `/member/{target_id}` for members and `/shop/{target_id}` for shops
- Mobile-first layout: stacks vertically on small screens, row layout on md+
- Minimum 44x44px tap target on the Unfollow button

**Expert Domains:** scss, nextjs

### Task 1.2: Create the following page SCSS module

Create the page-level styles for the following list dashboard page, matching the established dashboard page pattern from `listings-dashboard.module.scss`. Includes `.page`, `.header`, `.heading`, `.list`, `.empty`, `.emptyText`, `.emptyIcon`, and `.skeletonList`/`.skeletonCard` classes for the loading skeleton. Mobile-first with md breakpoint enhancement.

**Files:**

- `src/app/(frontend)/dashboard/following/following.module.scss`

**AC:**

- `.page` uses flex column layout with `--spacing-400` padding, matching listings dashboard pattern
- `.header` has heading styled at `--font-size-1000` (mobile) / `--font-size-1100` (md+)
- `.list` is a flex column with `--spacing-200` gap
- `.empty` is centered with icon, message text, and CTA button vertically stacked
- `.skeletonCard` uses CSS `@keyframes` shimmer animation for loading placeholders
- All styles are mobile-first with `@include breakpoint(md)` for desktop enhancement

**Expert Domains:** scss

### Task 1.3: Export FollowingCard from the follows barrel

Add the new `FollowingCard` component and `FollowingCardProps` type to the follows feature barrel export so the page can import from `@/features/follows`.

**Files:**

- `src/features/follows/index.ts`

**AC:**

- `FollowingCard` is exported as a named export from `@/features/follows`
- `FollowingCardProps` type is exported from `@/features/follows`

**Expert Domains:** nextjs

## Phase 2: Dashboard following page with optimistic unfollow

**Goal:** Wire up the `/dashboard/following` page that fetches the user's following list, renders FollowingCards, handles optimistic unfollow removal, and shows empty/loading states. Add the page to the side nav.
**Verify:** `pnpm build`

### Task 2.1: Create the following list page component

Build the `'use client'` page at `/dashboard/following`. Use `useFollowing()` to fetch all followed entities. Render each item as a `FollowingCard`. Implement optimistic unfollow: when the user clicks Unfollow, use `useFollowToggle` to trigger the mutation, and optimistically filter the item from the displayed list. On error, revert by refetching. Show a toast on success ("Unfollowed {name}") and error ("Something went wrong"). The page is protected by `proxy.ts` because it lives under `/dashboard/`.

**Files:**

- `src/app/(frontend)/dashboard/following/page.tsx`

**Reuses:**

- `src/features/follows/hooks/use-following.ts` (useFollowing — fetches the list)
- `src/features/follows/hooks/use-follow-toggle.ts` (useFollowToggle — handles unfollow mutation with optimistic cache updates)
- `src/features/follows/components/following-card/` (FollowingCard)
- `src/components/indicators/toast/context.tsx` (useToast for success/error messages)

**AC:**

- Page renders at `/dashboard/following` and is protected by proxy.ts (unauthenticated users redirect to `/`)
- Fetches all following items via `useFollowing()` and renders a FollowingCard for each
- Items are sorted by follow date (newest first) — the API already returns them sorted by `created_at DESC`
- Optimistic removal: clicking Unfollow immediately removes the card from the list; on error the list refetches
- Toast appears on successful unfollow: "Unfollowed — You unfollowed {name}."
- Toast appears on error: "Something went wrong — Please try again."
- Loading state shows skeleton cards (3-4 shimmer placeholders)
- Empty state shows: an icon, "You are not following anyone yet" message, and a "Browse" CTA button linking to `/` (home/explore)
- Error state uses the `ErrorState` component with `variant="banner"` and a retry action
- Page heading is "Following"

**Expert Domains:** nextjs, state-management

### Task 2.2: Add "Following" link to the member side nav

Add a "Following" navigation item to the member-context side nav in the SideNav component. It should appear after "Account" and before "Listings" (for sellers). Use `HiOutlineHeart` from `react-icons/hi` as the icon.

**Files:**

- `src/components/navigation/side-nav/index.tsx`

**AC:**

- "Following" link appears in member-context nav at `/dashboard/following`
- Uses `HiOutlineHeart` icon from `react-icons/hi`
- Link is visible for all authenticated members (not gated behind `is_seller` or shop context)
- Positioned after "Account" and before "Listings" in the nav order

**Expert Domains:** nextjs

### Task 2.3: Add page metadata for the following page

Create a metadata export for the following page so it has a proper title in the browser tab following the project pattern (`%s | Nessi` template).

**Files:**

- `src/app/(frontend)/dashboard/following/metadata.ts`

**AC:**

- Exports `metadata` with `title: 'Following'` which renders as "Following | Nessi" via the root template
- File follows the same pattern as other dashboard metadata files

**Expert Domains:** nextjs
