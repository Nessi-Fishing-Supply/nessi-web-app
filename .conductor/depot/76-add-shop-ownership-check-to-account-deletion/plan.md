# Implementation Plan: #76 — feat(account): add shop ownership check to account deletion flow

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: API Route — Shop Ownership Check

**Goal:** Add shop ownership guard to the delete-account API route so it returns 409 with shop details when the member owns shops, and add slug cleanup to the existing storage cleanup flow.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Add shop ownership check to DELETE /api/auth/delete-account

Before the existing storage cleanup and `deleteUser()` call, query the `shops` table for active shops (where `deleted_at IS NULL`) owned by the authenticated user. If any are found, return a 409 response with `{ error: 'OWNS_SHOPS', shops: [{ id, shop_name }] }`. If none are found, proceed with the existing deletion logic unchanged.
**Files:** `src/app/api/auth/delete-account/route.ts`
**AC:** `DELETE /api/auth/delete-account` returns 409 with `{ error: 'OWNS_SHOPS', shops: [...] }` when the user owns active shops; returns 200 with `{ success: true }` when the user owns no shops (existing behavior preserved).
**Expert Domains:** supabase, nextjs

### Task 1.2: Add slug cleanup to the delete-account API route storage cleanup

Add a call to `release_slug('member', userId)` via the admin client's `.rpc()` method inside the `cleanupUserStorage` function (or as a separate cleanup step before `deleteUser()`). This ensures the member's slug is released from the `slugs` table even though the `handle_member_deletion` trigger already does this — belt-and-suspenders approach since the trigger runs inside the CASCADE and may not execute if the trigger was dropped/recreated. Note: the existing `handle_member_deletion()` trigger (migration `20260320000005`) already handles slug cleanup in the DB layer, so this is a safety net at the application layer.
**Files:** `src/app/api/auth/delete-account/route.ts`
**AC:** After successful account deletion, the member's slug row no longer exists in the `slugs` table. The `release_slug` RPC call is made before `deleteUser()` and failures are logged but do not block deletion.
**Expert Domains:** supabase, nextjs

## Phase 2: Account Page — Handle 409 and Show Shop Ownership Warning

**Goal:** Update the account deletion modal to detect the 409 response and display an inline warning listing owned shops with links to shop settings.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles`

### Task 2.1: Parse 409 response in handleDeleteAccount and store shop ownership state

In `src/app/(frontend)/dashboard/account/page.tsx`, update `handleDeleteAccount` to check for `response.status === 409`. When detected, parse the JSON body to extract the `shops` array and store it in a new `ownedShops` state variable (type: `Array<{ id: string; shop_name: string }> | null`). When `ownedShops` is non-null, the modal should render the warning view instead of the confirmation view. Clear `ownedShops` when the modal is closed.
**Files:** `src/app/(frontend)/dashboard/account/page.tsx`
**AC:** When the API returns 409 with `OWNS_SHOPS`, the `ownedShops` state is populated with the shop list. The modal remains open (no toast error). When the modal is closed, `ownedShops` resets to null.
**Expert Domains:** nextjs

### Task 2.2: Render shop ownership warning UI in the deletion modal

Add a conditional branch inside the `<Modal>` content: when `ownedShops` is non-null, render a warning view with: (1) a heading like "You own shops", (2) explanatory text: "Transfer or delete your shops before deleting your account.", (3) an unordered list of shop names where each is a `<Link>` to `/dashboard/shop/settings` (the shop settings page), and (4) a single "Got it" button that closes the modal. Use Next.js `Link` component for the shop links. Each link should include `aria-label` for accessibility (e.g., "Go to {shop_name} settings").
**Files:** `src/app/(frontend)/dashboard/account/page.tsx`
**AC:** When 409 is received, the modal shows the shop ownership warning with clickable shop name links. Each shop name links to `/dashboard/shop/settings`. The "Got it" button closes the modal. Screen readers can identify each link via aria-label.
**Reuses:** `src/components/layout/modal/`, `src/components/controls/button/`
**Expert Domains:** nextjs

### Task 2.3: Add styles for the shop ownership warning in the deletion modal

Add new CSS classes to `account.module.scss` for the shop ownership warning: `.shopWarning` container, `.shopWarningHeading` (use `var(--color-warning-700)` or `var(--color-error-700)` for the heading color), `.shopList` (styled `<ul>` with spacing), and `.shopLink` (styled link with underline and hover state). Follow the existing mobile-first pattern and use CSS custom property tokens from `src/styles/variables/`.
**Files:** `src/app/(frontend)/dashboard/account/account.module.scss`
**AC:** The shop ownership warning is visually distinct from the standard deletion confirmation. Shop names are clearly clickable links. Styles use only CSS custom property tokens (no hardcoded values). Layout works on mobile viewports.
**Expert Domains:** scss

## Phase 3: Documentation and Final Verification

**Goal:** Update project documentation to reflect the new account deletion flow with shop ownership checks.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm format:check`

### Task 3.1: Update CLAUDE.md Account Deletion & Cascade Cleanup section

Update the "Account Deletion & Cascade Cleanup" section in the root `CLAUDE.md` to document the new flow: (1) shop ownership check returns 409 if member owns active shops, (2) storage cleanup includes shop-owned assets, (3) slug cleanup via both trigger and application-layer RPC call. Update the cascade chain diagram to include slugs cleanup and the shop ownership gate.
**Files:** `CLAUDE.md`
**AC:** The Account Deletion & Cascade Cleanup section accurately describes the current flow including the shop ownership check, 409 response, slug cleanup, and storage cleanup for shop assets.

### Task 3.2: Update auth feature CLAUDE.md with shop ownership guard details

Update `src/features/auth/CLAUDE.md` to document the 409 `OWNS_SHOPS` response from the delete-account route, including the response shape and the client-side handling in the account page.
**Files:** `src/features/auth/CLAUDE.md`
**AC:** The auth feature CLAUDE.md documents the `OWNS_SHOPS` error code, the 409 response shape, and references the account page handling.
