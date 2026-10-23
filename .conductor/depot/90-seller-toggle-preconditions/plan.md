# Implementation Plan: #90 — is_seller toggle preconditions

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: API Routes and Service Layer

**Goal:** Create the backend endpoints for checking seller preconditions and handling the toggle-off side effect (hiding products).
**Verify:** `pnpm build`

### Task 1.1: Create GET /api/members/seller-preconditions API route

Create an API route that checks if the authenticated member has active listings (products where `is_visible = true` and `member_id` matches the user). Orders count is stubbed to 0 with a TODO comment. Returns `{ canDisable: boolean, activeListingsCount: number, activeOrdersCount: number }`. Follow the existing auth pattern from `src/app/api/members/avatar/route.ts`: create server Supabase client, call `getUser()`, return 401 if unauthenticated. Query the `products` table filtered by `member_id = user.id` and `is_visible = true`, counting rows.
**Files:** `src/app/api/members/seller-preconditions/route.ts`
**AC:** GET returns `{ canDisable: true, activeListingsCount: 0, activeOrdersCount: 0 }` when member has no visible listings; returns `{ canDisable: false, activeListingsCount: N, activeOrdersCount: 0 }` when member has N visible listings; returns 401 for unauthenticated requests. Orders count is hardcoded to 0 with a TODO comment referencing the future orders system.
**Expert Domains:** supabase, nextjs

### Task 1.2: Create POST /api/members/toggle-seller API route

Create an API route that handles the `is_seller` toggle. Accepts `{ is_seller: boolean }` in the request body. When `is_seller` is `false`, the route sets `is_visible = false` on all products owned by the member (via `member_id = user.id`) BEFORE updating the member record. When `is_seller` is `true`, it only updates the member record without touching product visibility. Uses the server Supabase client. Returns the updated member object. Follow the same auth guard pattern as Task 1.1.
**Files:** `src/app/api/members/toggle-seller/route.ts`
**AC:** POST with `{ is_seller: false }` sets `is_visible = false` on all member-owned products AND sets `is_seller = false` on the member. POST with `{ is_seller: true }` sets `is_seller = true` on the member without modifying any product `is_visible` values. Returns 401 for unauthenticated requests. Returns 400 if `is_seller` is not a boolean.
**Expert Domains:** supabase, nextjs

## Phase 2: Client Service Functions and Tanstack Query Hooks

**Goal:** Create the client-side data layer for fetching preconditions and calling the toggle-seller endpoint, following existing patterns in `src/features/members/`.
**Verify:** `pnpm build`

### Task 2.1: Add seller preconditions service function

Add a `getSellerPreconditions` function to the members service layer that calls `GET /api/members/seller-preconditions` via the existing fetch utility (`@/libs/fetch`). Also add a `toggleSeller` function that calls `POST /api/members/toggle-seller`. Define a `SellerPreconditions` type interface in the members types. Follow the pattern from `src/features/products/services/product.ts` which uses `get` and `post` from `@/libs/fetch`.
**Files:** `src/features/members/services/seller.ts`, `src/features/members/types/seller.ts`
**AC:** `getSellerPreconditions()` returns `Promise<SellerPreconditions>` where `SellerPreconditions` has `canDisable: boolean`, `activeListingsCount: number`, `activeOrdersCount: number`. `toggleSeller(isSeller: boolean)` returns `Promise<Member>`. Both functions use the fetch wrapper from `@/libs/fetch`.
**Expert Domains:** state-management

### Task 2.2: Create useSellerPreconditions and useToggleSeller hooks

Create a new hooks file with two hooks. `useSellerPreconditions(enabled?)` is a Tanstack Query hook with query key `['members', 'seller-preconditions']` that calls the service function from Task 2.1. It should only be enabled when `enabled` is true (default true). `useToggleSeller()` is a mutation hook that calls `toggleSeller`, invalidates both `['members']` and `['members', 'seller-preconditions']` on success. Follow the pattern from `src/features/members/hooks/use-member.ts`.
**Files:** `src/features/members/hooks/use-seller.ts`
**AC:** `useSellerPreconditions(enabled?)` returns query result with `data` typed as `SellerPreconditions`. `useToggleSeller()` returns a mutation that invalidates member and preconditions queries on settlement. Both hooks follow the established patterns (query key conventions, `keepPreviousData`, `onSettled` invalidation).
**Expert Domains:** state-management

## Phase 3: Update Seller Settings Component

**Goal:** Wire the preconditions check and toggle-seller mutation into the existing seller-settings component, replacing the static guard text with dynamic precondition messaging.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 3.1: Update seller-settings component with preconditions logic

Refactor `src/features/members/components/account/seller-settings/index.tsx` to: (1) call `useSellerPreconditions()` to fetch active listings/orders counts, (2) replace `useUpdateMember` with `useToggleSeller` for the toggle handler, (3) disable the toggle when `canDisable` is false AND `member.is_seller` is true (do NOT block toggle-on), (4) remove the static `.guardText` paragraph (lines 66-68), (5) keep the existing `.warning` block that shows when `is_seller` is true but update its text to reflect precondition state, (6) show a dynamic precondition message with counts when the toggle is disabled (e.g., "You have 3 active listings that must be closed first"). The toggle should remain disabled during mutation pending state as it currently does.
**Files:** `src/features/members/components/account/seller-settings/index.tsx`
**AC:** Toggle is disabled when member has active listings and `is_seller` is true. Toggle is enabled when `canDisable` is true or `is_seller` is false. Static guard text from lines 66-68 is removed. Dynamic message shows specific listing count. Toggling off calls the toggle-seller endpoint (which hides products). Toggling on calls the toggle-seller endpoint (which does NOT restore product visibility). Loading state is shown during mutation.
**Expert Domains:** nextjs, scss

### Task 3.2: Update seller-settings SCSS for precondition message styling

Update the SCSS module to: (1) replace the `.guardText` class with a `.preconditionMessage` class that has a warning appearance (similar to the existing `.warning` class but styled for a blocking/error state -- e.g., using `--color-error` tones instead of `--color-secondary`), (2) add a `.preconditionDisabled` modifier style for the toggle row that provides visual feedback that the section is locked. Use CSS custom property tokens from the design system, not hardcoded values.
**Files:** `src/features/members/components/account/seller-settings/seller-settings.module.scss`
**AC:** `.guardText` class is removed. `.preconditionMessage` class exists with error-toned background and left border. All values use CSS custom property tokens (no hardcoded hex or px values). Styles are mobile-first.
**Expert Domains:** scss

### Task 3.3: Update members feature CLAUDE.md

Update the members feature CLAUDE.md to document: (1) the new `seller.ts` service functions, (2) the new `seller.ts` types, (3) the new `use-seller.ts` hooks, (4) the updated seller-settings component behavior (precondition checks, toggle-off side effect). Add the new hooks to the Hooks table and document the new service functions.
**Files:** `src/features/members/CLAUDE.md`
**AC:** CLAUDE.md documents `getSellerPreconditions()`, `toggleSeller()`, `useSellerPreconditions()`, `useToggleSeller()`, the `SellerPreconditions` type, and the updated seller-settings behavior including the toggle-off side effect on products.

### Task 3.4: Add aria attributes for accessibility

Ensure the seller-settings component meets WCAG 2.1 AA: (1) the precondition message should have `role="status"` with `aria-live="polite"` so screen readers announce when the count changes, (2) the toggle should have an `ariaLabel` that includes the disabled reason when preconditions are not met (e.g., "Enable selling - disabled: 3 active listings must be closed first"), (3) the warning text when `is_seller` is true should use `aria-live="polite"`. This can be done as a refinement pass on the component from Task 3.1.
**Files:** `src/features/members/components/account/seller-settings/index.tsx`
**AC:** Precondition message has `role="status"` and `aria-live="polite"`. Toggle `ariaLabel` includes disabled reason text when preconditions block toggle-off. Screen reader announces precondition state. All interactive elements have visible focus indicators (inherited from Toggle component).
**Expert Domains:** nextjs
