# Implementation Plan: #322 — Blocked Members Settings Page

## Overview
3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Feature Domain Foundation
**Goal:** Create the `src/features/blocks/` domain with types, services, hooks, and CLAUDE.md — the full data layer for blocked members.
**Verify:** `pnpm build`

### Task 1.1: Create feature CLAUDE.md and types
Create the blocks feature domain directory with its CLAUDE.md documentation and TypeScript types derived from the `member_blocks` database table. The `member_blocks` table already exists with columns `id`, `blocker_id`, `blocked_id`, and `created_at` (see `src/types/database.ts` lines 364-399). Define a `BlockedMemberItem` type that includes resolved member display data (name, avatar_url) similar to `FollowingItem` in `src/features/follows/types/follow.ts`.
**Files:** `src/features/blocks/CLAUDE.md`, `src/features/blocks/types/block.ts`
**AC:** Types compile without errors. `MemberBlock` is derived from `Database['public']['Tables']['member_blocks']['Row']`. `BlockedMemberItem` includes `id`, `blocked_id`, `created_at`, `name: string`, `avatar_url: string | null`.
**Expert Domains:** supabase

### Task 1.2: Create server-side service for blocked members
Create `block-server.ts` with two functions: `getBlockedMembersServer(blockerId: string)` that queries `member_blocks` where `blocker_id` matches, joins/resolves member details (first_name, last_name, avatar_url) from `members` table using a batch `.in()` lookup (same pattern as `getFollowingServer` in `src/features/follows/services/follow-server.ts`), and returns `BlockedMemberItem[]` ordered by `created_at DESC`. Second function: `unblockMemberServer(blockerId: string, blockedId: string)` that deletes the row matching both IDs and returns `{ success: boolean }` (same pattern as `deleteFollowServer`). Use `createClient` from `@/libs/supabase/server` — not the admin client.
**Files:** `src/features/blocks/services/block-server.ts`
**AC:** Both functions use the server Supabase client with RLS. `getBlockedMembersServer` resolves member names and avatars. `unblockMemberServer` returns `{ success: true }` on deletion and `{ success: false }` when no matching row exists.
**Expert Domains:** supabase

### Task 1.3: Create client-side service for blocked members
Create `block.ts` with two client fetch wrappers using `get` and `del` from `@/libs/fetch` (same pattern as `src/features/follows/services/follow.ts` and `src/features/addresses/services/address.ts`). `getBlockedMembers()` calls `GET /api/blocks` and returns `BlockedMemberItem[]`. `unblockMember(blockedId: string)` calls `DELETE /api/blocks?blocked_id={blockedId}` and returns `{ success: boolean }`. DELETE uses query params, not body (same pattern as `unfollowTarget`).
**Files:** `src/features/blocks/services/block.ts`
**AC:** Both functions use the `@/libs/fetch` wrappers. DELETE passes `blocked_id` as a query parameter.
**Expert Domains:** nextjs

### Task 1.4: Create Tanstack Query hooks with optimistic unblock
Create `use-blocked-members.ts` with two hooks. `useBlockedMembers()` returns a `useQuery` with key `['blocks', 'members']` calling `getBlockedMembers()`. `useUnblockMember()` returns a `useMutation` with optimistic removal from the query cache (same pattern as `useDeleteAddress` in `src/features/addresses/hooks/use-addresses.ts`): `onMutate` cancels queries, snapshots previous data, filters the blocked member out of the cache; `onError` rolls back; `onSettled` invalidates `['blocks', 'members']`. Accepts `onSuccess` and `onError` callbacks for toast integration.
**Files:** `src/features/blocks/hooks/use-blocked-members.ts`
**AC:** `useBlockedMembers` fetches blocked members list. `useUnblockMember` optimistically removes the unblocked member from cache and rolls back on error. Both compile without type errors.
**Expert Domains:** state-management

### Task 1.5: Create API routes for blocks
Create `src/app/api/blocks/route.ts` with GET and DELETE handlers following the exact auth pattern from `src/app/api/follows/route.ts`. GET authenticates via `supabase.auth.getUser()`, returns 401 if no user, calls `getBlockedMembersServer(user.id)`, returns the array with 200. DELETE authenticates, reads `blocked_id` from `searchParams`, validates it is a non-empty string, calls `unblockMemberServer(user.id, blocked_id)`, returns 404 if `success` is false, otherwise 200. Both handlers use `AUTH_CACHE_HEADERS` from `@/libs/api-headers`. Each handler has a description comment above the export per API route conventions.
**Files:** `src/app/api/blocks/route.ts`
**AC:** `GET /api/blocks` returns blocked members array for authenticated user, 401 for unauthenticated. `DELETE /api/blocks?blocked_id={uuid}` unblocks and returns 200, or 404 if not blocked, or 400 if `blocked_id` missing. Description comments present above both handlers.
**Expert Domains:** nextjs, supabase

## Phase 2: UI Components and Page
**Goal:** Build the blocked member card component and the settings page with loading, error, and empty states.
**Verify:** `pnpm build`

### Task 2.1: Create BlockedMemberCard component
Create a card component closely mirroring `src/features/follows/components/following-card/` (same layout: avatar, name, meta row with date, action button). The card receives a `BlockedMemberItem` prop. It displays the member's avatar (using `Avatar` component with `size="md"`), display name as an `AppLink` to `/member/{blocked_id}`, blocked date via `DateTimeDisplay` with `format="relative"`, and an "Unblock" button using `Button` with `style="danger"` and `outline`. The unblock action calls `useUnblockMember` internally with toast feedback via `useToast()` (success: "Unblocked — You unblocked {name}.", error: "Something went wrong — Please try again."). Add `aria-label="Unblock {name}"` on the button. Mobile-first SCSS following the exact token patterns from `following-card.module.scss`.
**Files:** `src/features/blocks/components/blocked-member-card/index.tsx`, `src/features/blocks/components/blocked-member-card/blocked-member-card.module.scss`
**Reuses:** `src/components/controls/avatar/`, `src/components/controls/app-link/`, `src/components/controls/button/`, `src/components/indicators/date-time-display/`, `src/components/indicators/toast/context`
**AC:** Component renders avatar, name link, relative date, and unblock button. Unblock triggers optimistic removal with toast. `aria-label` set on button. SCSS uses only design tokens (no hardcoded hex/px). Mobile-first with `breakpoint(md)` for row layout.
**Expert Domains:** scss, state-management

### Task 2.2: Create blocked members settings page layout
Create the layout file at `src/app/(frontend)/dashboard/account/blocked-members/layout.tsx` exporting metadata with `title: 'Blocked Members'` (renders as "Blocked Members | Nessi" via the root title template). The layout returns `children` directly, same as `src/app/(frontend)/dashboard/following/layout.tsx`.
**Files:** `src/app/(frontend)/dashboard/account/blocked-members/layout.tsx`
**AC:** Metadata title is "Blocked Members". Layout passes children through.
**Expert Domains:** nextjs

### Task 2.3: Create blocked members settings page
Create the page component at `src/app/(frontend)/dashboard/account/blocked-members/page.tsx` as a `'use client'` component following the exact pattern from `src/app/(frontend)/dashboard/following/page.tsx`. Uses `useBlockedMembers()` hook. Implements four states: (1) Loading — heading + 4 shimmer skeleton cards with `role="status"` and `aria-label="Loading blocked members list"`; (2) Error — heading + `ErrorState` with `variant="banner"`, message "Failed to load your blocked members.", and retry action; (3) Empty — heading + shield icon (`HiOutlineShieldCheck` from react-icons/hi) + "You have not blocked anyone" text; (4) List — heading + list of `BlockedMemberCard` components. SCSS module mirrors `following.module.scss` structure with `.page`, `.header`, `.heading`, `.list`, `.empty`, `.emptyIcon`, `.emptyText`, `.skeletonList`, `.skeletonCard` classes using the same design tokens.
**Files:** `src/app/(frontend)/dashboard/account/blocked-members/page.tsx`, `src/app/(frontend)/dashboard/account/blocked-members/blocked-members.module.scss`
**Reuses:** `src/components/indicators/error-state/`
**AC:** Page renders all four states correctly. Loading shows shimmer skeletons with ARIA. Error shows banner with retry. Empty shows icon and message. List renders one card per blocked member. SCSS is mobile-first with design tokens only.
**Expert Domains:** nextjs, scss

## Phase 3: Account Page Integration and Barrel Export
**Goal:** Link the blocked members page from the account settings and create the barrel export for the feature.
**Verify:** `pnpm build`

### Task 3.1: Add blocked members link to account page
Modify `src/app/(frontend)/dashboard/account/page.tsx` to add a navigation link to `/dashboard/account/blocked-members` in the sidebar section, below the completeness card and above the sidebar footer. Use a `Link` from `next/link` styled as a sidebar item (similar to the "View public profile" link pattern already on the page). Display text "Blocked Members" with a shield icon (`HiOutlineShieldExclamation` from react-icons/hi). Add any needed styles to `account.module.scss` for the link — a simple flex row with icon + text, matching existing sidebar typography tokens.
**Files:** `src/app/(frontend)/dashboard/account/page.tsx`, `src/app/(frontend)/dashboard/account/account.module.scss`
**AC:** Account page shows a "Blocked Members" link in the sidebar that navigates to `/dashboard/account/blocked-members`. Link has an icon and uses design tokens for styling.
**Expert Domains:** nextjs, scss

### Task 3.2: Create barrel export for blocks feature
Create `src/features/blocks/index.ts` as the public API for the feature, exporting types (`MemberBlock`, `BlockedMemberItem`), hooks (`useBlockedMembers`, `useUnblockMember`), and the `BlockedMemberCard` component with its props type. Follow the exact barrel pattern from `src/features/follows/index.ts`.
**Files:** `src/features/blocks/index.ts`
**AC:** All public types, hooks, and components are re-exported. Consuming code can import from `@/features/blocks` directly.
**Expert Domains:** nextjs
