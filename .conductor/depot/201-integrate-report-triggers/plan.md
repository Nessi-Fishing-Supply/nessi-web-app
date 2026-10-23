# Implementation Plan: #201 — Integrate Report Triggers

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Create ReportTrigger Client Component

**Goal:** Build a reusable `ReportTrigger` client component that wraps the existing `useReportTarget` hook and `ReportBottomSheet`, handling auth gating, self-entity hiding, and the flag button UI.
**Verify:** `pnpm build`

### Task 1.1: Create ReportTrigger client component

Create a `'use client'` component in the reports feature that encapsulates the full report trigger flow: renders a flag button (HiOutlineFlag icon + "Report this {type}" text), uses `useReportTarget` for duplicate pre-check and sheet open/close state, renders `ReportBottomSheet` inline, and conditionally hides itself based on two props: `currentUserId` (null = unauthenticated, hide entirely) and `isOwnEntity` (true = viewing own profile/listing/shop, hide entirely). This component will be reused on the listing detail, member profile, and shop profile pages. The button styling should match the existing `.reportLink` pattern in `listing-detail.module.scss` (inline-flex, neutral-500 color, no background/border, font-size-200). Create a dedicated SCSS module for the component.
**Files:** `src/features/reports/components/report-trigger/index.tsx`, `src/features/reports/components/report-trigger/report-trigger.module.scss`
**AC:** Component renders a flag button when `currentUserId` is non-null and `isOwnEntity` is false; renders nothing when either condition fails; clicking the button calls `openReportSheet()` from `useReportTarget`; `ReportBottomSheet` is rendered with correct `isOpen`/`onClose`/`targetType`/`targetId` props.
**Reuses:** `src/features/reports/components/report-bottom-sheet/`, `src/features/reports/hooks/use-report-target.ts`
**Expert Domains:** nextjs, scss

### Task 1.2: Export ReportTrigger from reports barrel

Add `ReportTrigger` to the reports feature barrel export so consuming pages can import it with a single import path.
**Files:** `src/features/reports/index.ts`
**AC:** `import { ReportTrigger } from '@/features/reports'` resolves correctly; existing exports (`ReportBottomSheet`, `useReportTarget`) remain unchanged.
**Expert Domains:** nextjs

## Phase 2: Wire Report Triggers into Pages

**Goal:** Integrate the `ReportTrigger` component into the listing detail page (replacing the stub button), member profile page, and shop profile page, passing the correct entity IDs, types, and ownership flags from server-side auth checks.
**Verify:** `pnpm build`

### Task 2.1: Wire ReportTrigger into listing detail page

Replace the existing stub report button (lines 322-328 of `listing-detail.tsx`) with the `ReportTrigger` component. The component already receives `currentUserId` as a prop. For `isOwnEntity`, use the existing `isOwnListing` variable. Pass `targetType="listing"` and `targetId={listing.id}`. Remove the old `<div className={styles.reportRow}>` wrapper and `<button>` stub — the `ReportTrigger` component provides its own markup. Keep the `HiOutlineFlag` import only if still used elsewhere in the file (it is used, so it stays).
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:** The "Report this listing" button opens the `ReportBottomSheet` when clicked by a non-owner authenticated user; the button is hidden for unauthenticated users; the button is hidden when viewing own listing (both member-owned and shop-owned contexts); build passes without unused import warnings.
**Reuses:** `src/features/reports/components/report-trigger/`
**Expert Domains:** nextjs

### Task 2.2: Add server-side auth check to member profile page

The member profile page (`src/app/(frontend)/member/[slug]/page.tsx`) is currently a pure server component with no auth check. Add a server-side `createClient()` + `getUser()` call (same pattern as `src/app/(frontend)/listing/[id]/page.tsx` lines 51-55) to obtain `currentUserId`. Compute `isOwnProfile` by comparing `currentUserId` to `member.id`. These values will be passed to a new client wrapper in the next task.
**Files:** `src/app/(frontend)/member/[slug]/page.tsx`
**AC:** `currentUserId` is correctly resolved from the Supabase server client; `isOwnProfile` is `true` when the authenticated user's ID matches the member's ID, `false` otherwise; page still renders correctly for unauthenticated visitors (currentUserId is null).
**Expert Domains:** nextjs, supabase

### Task 2.3: Add ReportTrigger to member profile page

Add the `ReportTrigger` component to the member profile page, placed after the listings section (or after the preferences section for non-sellers) at the bottom of the page content. Pass `currentUserId`, `isOwnEntity={isOwnProfile}`, `targetType="member"`, and `targetId={member.id}`. Since `ReportTrigger` is a client component and the page is a server component, it can be composed directly (React Server Components can render client components as leaves).
**Files:** `src/app/(frontend)/member/[slug]/page.tsx`
**AC:** Authenticated users see "Report this member" at the bottom of any other member's profile; the button is hidden on the user's own profile; unauthenticated visitors see no report button; clicking opens the report sheet with `target_type='member'`.
**Reuses:** `src/features/reports/components/report-trigger/`
**Expert Domains:** nextjs

### Task 2.4: Add server-side auth check to shop profile page

The shop profile page (`src/app/(frontend)/shop/[slug]/page.tsx`) is currently a pure server component with no auth check. Add a server-side `createClient()` + `getUser()` call to obtain `currentUserId`. Compute `isOwnShop` by comparing `currentUserId` to `shop.owner_id` (the `Shop` type has an `owner_id` field). Note: this uses a simple owner check rather than full shop membership — reporting your own shop as a non-owner member is an edge case that can be revisited later.
**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**AC:** `currentUserId` is correctly resolved from the Supabase server client; `isOwnShop` is `true` when the authenticated user is the shop owner, `false` otherwise; page still renders correctly for unauthenticated visitors.
**Expert Domains:** nextjs, supabase

### Task 2.5: Add ReportTrigger to shop profile page

Add the `ReportTrigger` component to the shop profile page, placed after the listings section at the bottom of the page content. Pass `currentUserId`, `isOwnEntity={isOwnShop}`, `targetType="shop"`, and `targetId={shop.id}`.
**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**AC:** Authenticated users see "Report this shop" at the bottom of any shop profile they do not own; the button is hidden for the shop owner; unauthenticated visitors see no report button; clicking opens the report sheet with `target_type='shop'`.
**Reuses:** `src/features/reports/components/report-trigger/`
**Expert Domains:** nextjs

## Phase 3: Clean Up and Polish

**Goal:** Remove unused styles from the listing detail page and ensure all report trigger placements have consistent visual treatment.
**Verify:** `pnpm build`

### Task 3.1: Remove unused report stub styles from listing detail SCSS

The `.reportRow` and `.reportLink` classes in `listing-detail.module.scss` are no longer referenced after Task 2.1 replaced the stub with `ReportTrigger` (which has its own SCSS module). Remove these unused class definitions to keep the stylesheet clean. Verify no other elements in the file reference these classes.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.module.scss`
**AC:** `.reportRow` and `.reportLink` classes are removed; no TypeScript compilation errors from missing CSS module references; `pnpm build` passes; `pnpm lint:styles` passes.
**Expert Domains:** scss
