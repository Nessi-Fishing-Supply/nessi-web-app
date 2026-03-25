# Implementation Plan: #259 — Ownership Transfer UI with Pending Status, Cancel, and Acceptance Page

## Overview

3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Refactor OwnershipTransferSection for Initiate and Pending States

**Goal:** Replace the legacy `useTransferOwnership()` with `useInitiateOwnershipTransfer()` and add a pending transfer status card with cancel functionality.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`

### Task 1.1: Refactor OwnershipTransferSection to use useInitiateOwnershipTransfer and show pending state

Refactor the existing `OwnershipTransferSection` component to use `useOwnershipTransfer(shopId)` to check for a pending transfer on mount. When no pending transfer exists, keep the existing member select + two-step confirmation modal UI but replace `useTransferOwnership()` with `useInitiateOwnershipTransfer()`. Update the success toast to "Transfer request sent. {name} will receive an email." and remove the `switchToMember()` call (ownership no longer transfers instantly). When a pending transfer exists, render a status card showing: a "Transfer Pending" badge using the existing `Pill` component with `color="warning"`, the transferee's name prominently, the expiry date in muted text ("Expires on {date}"), and a "Cancel Transfer" button in `style="danger"`. The component should conditionally render one of the two views based on the `useOwnershipTransfer` query data.
**Files:** `src/features/shops/components/shop-settings/ownership-transfer-section/index.tsx`
**AC:**

- When no pending transfer exists, the initiation form renders with member select and two-step confirmation modal
- Confirming transfer calls `useInitiateOwnershipTransfer()` and shows success toast with transferee name
- When a pending transfer exists, the status card renders with Pill badge, transferee name, expiry date, and cancel button
- Cancel button is visible but does not yet function (wired in Task 1.2)
- `aria-busy` is set on the Transfer button during mutation
  **Reuses:** `src/components/indicators/pill/`, `src/components/controls/button/`, `src/components/layout/modal/`, `src/components/indicators/toast/context`
  **Expert Domains:** nextjs, state-management

### Task 1.2: Add cancel transfer confirmation modal and mutation

Add a cancel confirmation modal to the `OwnershipTransferSection` component. When the user clicks "Cancel Transfer" on the pending status card, open a confirmation modal asking "Cancel ownership transfer?" with a description explaining the transferee will no longer be able to accept. The modal has "Keep Transfer" (secondary) and "Yes, Cancel" (danger) buttons. On confirm, call `useCancelOwnershipTransfer()`. On success, show a toast "Transfer request cancelled." and the view automatically switches back to the initiation form because the `useOwnershipTransfer` query is invalidated and returns null.
**Files:** `src/features/shops/components/shop-settings/ownership-transfer-section/index.tsx`
**AC:**

- Clicking "Cancel Transfer" opens a confirmation modal
- "Yes, Cancel" calls `useCancelOwnershipTransfer()` with the shop ID
- On success, toast shows "Transfer request cancelled." and pending card disappears (initiation form returns)
- On error, toast shows error message
- `aria-busy` is set on the confirm button during mutation
- Modal has proper `ariaLabel` and focus trap (inherited from Modal component)
  **Reuses:** `src/components/layout/modal/`, `src/components/controls/button/`, `src/components/indicators/toast/context`
  **Expert Domains:** state-management

### Task 1.3: Update SCSS for pending transfer status card

Extend the existing `ownership-transfer-section.module.scss` with styles for the pending transfer status card. Add classes for: the status header row (badge + heading inline), transferee name display, expiry text in muted color, and cancel button alignment. Follow mobile-first patterns — stack vertically on mobile, allow row layout on `sm` breakpoint. All values must use design tokens (CSS custom properties). Ensure the cancel button meets 44x44px minimum tap target.
**Files:** `src/features/shops/components/shop-settings/ownership-transfer-section/ownership-transfer-section.module.scss`
**AC:**

- Pending card uses same `.card` base as existing section
- Status badge and heading align horizontally with gap
- Transferee name uses `--color-neutral-900` and prominent font size
- Expiry text uses `--color-neutral-500` and `--font-size-500`
- Cancel button has min-height 44px
- No hardcoded hex/px values — all design tokens
- Mobile-first with `@include breakpoint()` for enhancements
  **Expert Domains:** scss

## Phase 2: Transfer Acceptance Page

**Goal:** Create the public-facing acceptance page at `/shop/transfer/[token]` where the transferee can accept ownership.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`

### Task 2.1: Add /shop/transfer/\* auth guard in proxy.ts

Add a route check in `src/proxy.ts` so that unauthenticated users visiting `/shop/transfer/*` are redirected to the home page, similar to the existing `/dashboard` guard. The transferee must be logged in to view the acceptance page.
**Files:** `src/proxy.ts`
**AC:**

- Unauthenticated users visiting `/shop/transfer/anything` are redirected to `/`
- Authenticated users pass through normally
- Existing `/dashboard` guard is unchanged
- No changes to the onboarding redirect logic
  **Expert Domains:** nextjs

### Task 2.2: Create transfer acceptance page server component

Create the server component page at `src/app/(frontend)/shop/transfer/[token]/page.tsx`. This page fetches the transfer details server-side using the admin client (same pattern as the invite page at `src/app/(frontend)/invite/[token]/page.tsx`). Query `shop_ownership_transfers` by token with admin client, join `shops(shop_name)` and both `members` rows for names. Compute effective status: if status is `pending` and `expires_at < now()`, treat as `expired`. If token not found or status is not pending/expired, call `notFound()`. Check if the current user (via server Supabase client) matches `to_member_id` — if not, call `notFound()` (wrong user sees 404, not 403, to avoid leaking transfer existence). Pass the serialized transfer data to the client component `TransferAccept`. Also add `generateMetadata` returning title like "Transfer Ownership — {shopName}".
**Files:** `src/app/(frontend)/shop/transfer/[token]/page.tsx`
**AC:**

- Valid pending token for correct user renders `TransferAccept` component with transfer data
- Expired token for correct user renders `TransferAccept` with `status: 'expired'`
- Invalid token calls `notFound()`
- Wrong user calls `notFound()`
- Non-pending status (accepted, cancelled) calls `notFound()`
- `generateMetadata` returns dynamic title with shop name
- Uses `async params` pattern (Next.js 15+)
  **Expert Domains:** nextjs, supabase

### Task 2.3: Create not-found page for transfer route

Create `src/app/(frontend)/shop/transfer/[token]/not-found.tsx` following the same pattern as the existing shop `not-found.tsx`. Display a centered card with "Transfer Not Found" heading and a message like "This transfer link is invalid or has already been used." with a link back to the dashboard.
**Files:** `src/app/(frontend)/shop/transfer/[token]/not-found.tsx`
**AC:**

- Renders centered card with "Transfer Not Found" heading
- Includes descriptive message
- Has a link to `/dashboard`
- Uses design tokens for all styling
  **Expert Domains:** nextjs, scss

### Task 2.4: Create TransferAccept client component

Create `src/features/shops/components/transfer-accept/index.tsx` — a client component modeled after the existing `InviteAccept` component at `src/features/shops/components/invite-accept/index.tsx`. Accept a `TransferAcceptData` prop with `token`, `shopName`, `fromMemberName`, `expiresAt`, and `status` ('pending' | 'expired'). For pending status: render a centered card with shop name, "{fromMemberName} has invited you to become the owner of this shop" message, expiry date, "Accept Ownership" (primary, full-width) button, and "Decline" (secondary/outline, full-width) button. "Accept Ownership" calls `useAcceptOwnershipTransfer()` — on success, show toast "You are now the owner of {shopName}!" and `router.push('/dashboard')`. On error, display inline error message (same pattern as `InviteAccept`). "Decline" simply calls `router.push('/dashboard')` — it does NOT cancel the transfer. For expired status: render the card with "Transfer Expired" heading and message "This ownership transfer request has expired. Please ask the current owner to send a new request." — no action buttons.
**Files:** `src/features/shops/components/transfer-accept/index.tsx`
**AC:**

- Pending transfer shows shop name, initiator name, expiry, Accept and Decline buttons
- "Accept Ownership" calls `useAcceptOwnershipTransfer()` with token
- On accept success, toast shows and redirects to `/dashboard`
- On accept error, inline error message appears with `role="alert"`
- "Decline" navigates to `/dashboard` without cancelling transfer
- Expired state shows message without action buttons
- `aria-busy` on Accept button during mutation
- All interactive elements meet 44x44px minimum tap target
  **Reuses:** `src/components/controls/button/`, `src/components/indicators/toast/context`
  **Expert Domains:** nextjs, state-management

### Task 2.5: Create TransferAccept SCSS module

Create `src/features/shops/components/transfer-accept/transfer-accept.module.scss` following the same visual pattern as `src/features/shops/components/invite-accept/invite-accept.module.scss`. Centered page layout, card with shadow and border, shop name in serif font, meta text, expiry in muted color, full-width buttons with gap, error state styling. Mobile-first with `max-width: 480px` on `md` breakpoint. All design tokens, no hardcoded values.
**Files:** `src/features/shops/components/transfer-accept/transfer-accept.module.scss`
**AC:**

- Page centers content vertically and horizontally
- Card has white background, border-radius, shadow, and border matching invite-accept pattern
- Shop name uses `--font-family-serif` and prominent size
- Expiry text uses `--color-neutral-500`
- Buttons are full-width with proper spacing
- Error state has `--color-error-500` text on `--color-error-100` background
- Mobile-first: card is full-width on mobile, max-width 480px on md
- No hardcoded hex/px values
  **Expert Domains:** scss

### Task 2.6: Define TransferAcceptData type

Add a `TransferAcceptData` type to the shops types file for the data passed from the server component page to the `TransferAccept` client component. Fields: `token: string`, `shopName: string`, `fromMemberName: string`, `expiresAt: string`, `status: 'pending' | 'expired'`.
**Files:** `src/features/shops/types/shop.ts`
**AC:**

- `TransferAcceptData` type is exported from `src/features/shops/types/shop.ts`
- Type has all five fields with correct types
- Type is importable by both the page server component and the TransferAccept client component
  **Expert Domains:** nextjs

## Phase 3: Polish and Integration Verification

**Goal:** Update documentation and verify all acceptance criteria pass end-to-end.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm lint:styles`

### Task 3.1: Update shops CLAUDE.md with new components and routes

Update `src/features/shops/CLAUDE.md` to document the new `TransferAccept` component in the Components table, the new `/shop/transfer/[token]` route in the Pages table, and the proxy.ts auth guard change. Also note that `OwnershipTransferSection` now has two states (initiation form and pending status card) and uses the new ownership transfer hooks instead of the legacy `useTransferOwnership()`.
**Files:** `src/features/shops/CLAUDE.md`
**AC:**

- Components table includes `TransferAccept` with location and purpose
- Pages table includes `/shop/transfer/[token]` with description
- `OwnershipTransferSection` description updated to reflect two-state behavior
- proxy.ts auth guard for `/shop/transfer/*` is mentioned
- Legacy `useTransferOwnership()` noted as replaced in the OwnershipTransferSection
