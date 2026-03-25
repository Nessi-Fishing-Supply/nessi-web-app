# Implementation Plan: #89 — slug change settings for shops

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: API Route and Mutation Hook

**Goal:** Create the server-side slug change endpoint that calls `reserve_slug()` RPC and the client-side mutation hook to consume it.
**Verify:** `pnpm build`

### Task 1.1: Create POST /api/shops/slug API route

Create a new API route that accepts `{ shopId, slug }` in the request body, authenticates the user, verifies shop ownership, and calls the `reserve_slug()` RPC function for an atomic slug swap. The route should use the server Supabase client for auth and the admin client for the RPC call (since `reserve_slug` is `SECURITY DEFINER`). Follow the same auth/ownership pattern used in `src/app/api/shops/[id]/route.ts`.

**Files:** `src/app/api/shops/slug/route.ts`
**AC:**

- POST with valid session, owned shop, and available slug returns 200 with `{ success: true, slug: newSlug }`
- POST without session returns 401
- POST with shop not owned by user returns 403
- POST with already-taken slug returns 409 (catches unique_violation from `reserve_slug`)
- POST with invalid slug format returns 400 (catches format error from `reserve_slug`)
- POST with missing/empty shopId or slug returns 400
  **Expert Domains:** supabase, nextjs

### Task 1.2: Create useUpdateShopSlug mutation hook and updateShopSlug service function

Add a `updateShopSlug(shopId, slug)` service function in `src/features/shops/services/shop.ts` that calls `POST /api/shops/slug` (similar to how `deleteShop` calls `DELETE /api/shops/{id}`). Add a `useUpdateShopSlug()` mutation hook in `src/features/shops/hooks/use-shops.ts` that wraps this service function and invalidates the `['shops']` query key on success.

**Files:** `src/features/shops/services/shop.ts`, `src/features/shops/hooks/use-shops.ts`, `src/features/shops/CLAUDE.md`
**AC:**

- `updateShopSlug(shopId, slug)` calls `POST /api/shops/slug` and throws on non-OK responses
- `useUpdateShopSlug()` returns a Tanstack Query mutation that invalidates `['shops']` on success
- CLAUDE.md updated with new service function and hook entries
  **Expert Domains:** state-management

## Phase 2: Warning Modal and Slug Save Integration

**Goal:** Add a confirmation modal to the slug edit flow in ShopDetailsSection so that saving a slug shows a warning about broken links before calling the new `useUpdateShopSlug()` mutation.
**Verify:** `pnpm build`

### Task 2.1: Add slug change warning modal to ShopDetailsSection

Modify `ShopDetailsSection` to intercept the slug save flow. When the user clicks save on the slug InlineEdit, instead of immediately saving, show a confirmation modal warning that changing the handle will break existing links. The modal should have "Cancel" and "Yes, change handle" buttons. On confirm, call `useUpdateShopSlug()` instead of the current `useUpdateShop()` for slug changes. Use the existing `Modal` component from `@/components/layout/modal` following the same pattern as `OwnershipTransferSection`.

**Files:** `src/features/shops/components/shop-settings/shop-details-section/index.tsx`
**AC:**

- Clicking save on slug InlineEdit opens a warning modal instead of saving immediately
- Modal displays: "Changing your handle will break any existing links to your shop. Are you sure?"
- Modal has Cancel button that closes modal without saving
- Modal has confirm button that calls `useUpdateShopSlug()` mutation
- On successful slug change, modal closes, toast shows success, slug field updates
- On error, toast shows error message, modal remains open for retry
- If the new slug equals the current slug, no modal is shown (InlineEdit already handles this via no-op)
  **Reuses:** `src/components/layout/modal/`, `src/components/controls/button/`
  **Expert Domains:** nextjs, state-management

### Task 2.2: Add loading and error states to slug change modal

Ensure the confirm button in the warning modal shows a loading spinner while the mutation is in progress (using the Button `loading` prop), disables both buttons during the mutation to prevent double-submission, and displays appropriate error feedback if the API returns a 409 (slug taken, which could happen between the availability check and the save).

**Files:** `src/features/shops/components/shop-settings/shop-details-section/index.tsx`
**AC:**

- Confirm button shows loading state via `loading` prop while mutation is pending
- Both modal buttons are disabled while mutation is pending
- If mutation fails with 409 (slug taken), toast shows "That handle was just taken by someone else"
- If mutation fails with other error, toast shows generic "Failed to update handle"
- Cancel button remains functional when mutation is not in progress
  **Reuses:** `src/components/controls/button/`, `src/components/indicators/toast/context`
  **Expert Domains:** state-management

### Task 2.3: Update slug validation styling and remove static warning text

Remove the static "Changing your handle will break existing links" warning text from the slug field (since this is now communicated via the modal). Ensure the slug preview (`@handle`) still displays below the input while editing. Verify the availability icon feedback (check/X) continues to work correctly with the new save flow.

**Files:** `src/features/shops/components/shop-settings/shop-details-section/index.tsx`, `src/features/shops/components/shop-settings/shop-details-section/shop-details-section.module.scss`
**AC:**

- Static warning text below slug field is removed
- Slug availability icons (check/X) still display correctly during editing
- "That handle is already taken" error text still displays when slug is taken
- `@slug` preview still shows below the input while editing
- `pnpm build && pnpm lint && pnpm typecheck` pass
- `.warningText` style removed from SCSS if no longer used
  **Expert Domains:** scss
