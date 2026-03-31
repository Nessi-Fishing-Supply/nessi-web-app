# Implementation Plan: #314 — Offer UI with Make Offer sheet and offer action buttons

## Overview

4 phases, 14 total tasks
Estimated scope: medium

## Phase 1: Offer Sheet Component

**Goal:** Build the Make Offer bottom sheet with price input, validation, fee display, and create/counter modes
**Verify:** `pnpm build`

### Task 1.1: Create offer sheet SCSS module with mobile-first bottom sheet and desktop modal styling

Create the stylesheet for the offer sheet content rendered inside the existing `BottomSheet` component. Style the listing context card (thumbnail, title, price), currency input field with error state, fee breakdown rows, and submit button. All styles mobile-first using the project's SCSS token system (`var(--spacing-*)`, `var(--color-*)`, etc.) and `@include breakpoint()` for desktop enhancements.

**Files:** `src/features/messaging/components/offer-sheet/offer-sheet.module.scss`
**AC:** SCSS module compiles without errors; uses only CSS custom property tokens (no hardcoded hex/px); mobile-first with breakpoint enhancements
**Expert Domains:** scss

### Task 1.2: Create the OfferSheet component with create and counter modes

Build `OfferSheet` as a `'use client'` component that wraps `BottomSheet` from `@/components/layout/bottom-sheet`. Props: `isOpen`, `onClose`, `listingId`, `listingTitle`, `listingPriceCents`, `sellerId`, `mode: 'create' | 'counter'`, `currentOfferAmountCents?` (for counter mode), `offerId?` (for counter mode). The price input pre-fills at `calculateDefaultOffer(listingPriceCents)` in create mode or `currentOfferAmountCents` in counter mode. Display the value formatted as currency ($XX.XX). On change, run `validateOfferAmount` and show inline error "Minimum offer is {formatPrice(calculateMinOffer(listingPriceCents))}" when invalid. Show fee breakdown: offer amount, buyer fee ($0.00 placeholder), total. Show a compact listing context at top (title + formatted listing price). Title changes between "Make an Offer" and "Counter Offer" based on mode. Submit button calls `useCreateOffer` in create mode or `useOfferActions({ offerId }).counter` in counter mode. On success: close sheet, show toast via `useToast()` ("Offer sent!" or "Counter sent!"). On error: show error toast. Loading state: button shows `aria-busy`, input disabled. Accessibility: BottomSheet already provides `aria-labelledby`, focus trap, and focus restoration.

**Files:** `src/features/messaging/components/offer-sheet/index.tsx`
**Reuses:** `src/components/layout/bottom-sheet/`, `src/components/indicators/toast/context.tsx`, `src/features/messaging/utils/offer-validation.ts`, `src/features/shared/utils/format.ts`, `src/features/messaging/hooks/use-create-offer.ts`, `src/features/messaging/hooks/use-offer-actions.ts`
**AC:** OfferSheet renders inside BottomSheet; price input pre-fills at 80% in create mode; validation error appears below 70% threshold; submit calls correct mutation based on mode; toast fires on success/error; `aria-describedby` links input to error message; `aria-invalid` set on error
**Expert Domains:** nextjs, state-management

## Phase 2: Compose Bar Action Menu

**Goal:** Wire the `+` button in ComposeBar to open an action menu with "Make an Offer" for inquiry threads
**Verify:** `pnpm build`

### Task 2.1: Update compose bar SCSS with action menu popover styles

Add styles for the action menu popover that appears above the `+` button. Mobile-first: full-width anchored to bottom of screen above the compose bar. Desktop: positioned popover above the button. Style menu items with 44px min tap targets, hover/focus states, and disabled state for placeholder items.

**Files:** `src/features/messaging/components/compose-bar/compose-bar.module.scss`
**AC:** New classes for action menu popover, menu items, and disabled state; mobile-first with breakpoint enhancements; all tokens from CSS custom properties
**Expert Domains:** scss

### Task 2.2: Add action menu state and popover to ComposeBar

Extend `ComposeBar` props to accept `threadType: ThreadType`, `currentUserRole: ParticipantRole`, and `onMakeOffer?: () => void`. Add local state for menu open/close. The `+` button (currently disabled) becomes enabled and toggles the action menu. The menu is a `<div role="menu">` with `<button role="menuitem">` items. Show "Make an Offer" (enabled, calls `onMakeOffer` then closes menu) when `threadType === 'inquiry'` and `currentUserRole === 'buyer'`. Show "Share a Listing" as a disabled placeholder in all threads. Close menu on Escape, on click outside, or after selecting an action. The `+` button gets `aria-expanded` and `aria-haspopup="menu"`.

**Files:** `src/features/messaging/components/compose-bar/index.tsx`
**AC:** `+` button opens action menu popover; "Make an Offer" appears for buyer in inquiry threads; "Share a Listing" appears disabled; menu has `role="menu"` with `role="menuitem"` items; Escape and outside click close menu; `aria-expanded` toggles on button
**Expert Domains:** nextjs

## Phase 3: Collapsible Header Offer Actions and Decline Confirmation

**Goal:** Add offer status pill, countdown timer, and decline confirmation dialog to the collapsible header; wire counter offer to open the offer sheet
**Verify:** `pnpm build`

### Task 3.1: Create a reusable confirmation dialog component

Build a confirmation dialog using the existing `Modal` component. Props: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel`, `cancelLabel?`, `variant?: 'default' | 'destructive'`. The dialog uses `role="alertdialog"` (overriding Modal's default `role="dialog"`). Destructive variant styles the confirm button red. Focus auto-moves to the cancel button on open (safe default). Accessibility: `aria-describedby` on the message, focus trap inherited from Modal.

**Files:** `src/components/layout/confirmation-dialog/index.tsx`, `src/components/layout/confirmation-dialog/confirmation-dialog.module.scss`
**Reuses:** `src/components/layout/modal/`
**AC:** Dialog renders with title, message, cancel and confirm buttons; `role="alertdialog"` is set; destructive variant shows red confirm button; Escape closes; focus trapped within dialog
**Expert Domains:** nextjs, scss

### Task 3.2: Add offer status pill to the collapsible header toggle bar

When the thread is an offer thread and an offer exists, render a `Pill` component in the collapsed toggle bar showing the current offer status. Color mapping: pending=warning (amber), accepted=success (green), declined=error (red), countered=warning (amber), expired=default (gray). The pill sits next to the TypeBadge in the `toggleInner` div.

**Files:** `src/features/messaging/components/collapsible-header/index.tsx`, `src/features/messaging/components/collapsible-header/collapsible-header.module.scss`
**Reuses:** `src/components/indicators/pill/`
**AC:** Offer status pill renders in toggle bar for offer threads; correct color per status; pill hidden when no offer data; does not render for non-offer threads
**Expert Domains:** nextjs, scss

### Task 3.3: Add countdown timer display to the collapsible header for pending offers

When the offer status is `pending`, display the countdown timer text (reuse the `getCountdown` pattern from `OfferBubble`) in the expanded section of the collapsible header, below the OfferBubble. Update every 60 seconds via `setInterval`. Show nothing for non-pending statuses.

**Files:** `src/features/messaging/components/collapsible-header/index.tsx`, `src/features/messaging/components/collapsible-header/collapsible-header.module.scss`
**AC:** Countdown text shows "Expires in Xh Xm" for pending offers; updates every 60s; hidden for non-pending statuses
**Expert Domains:** nextjs

### Task 3.4: Wire decline confirmation dialog and counter offer sheet into ThreadDetailPage

Update `ThreadDetailPage` to manage state for: (1) the decline confirmation dialog, and (2) the offer sheet in counter mode. The `onDeclineOffer` callback now opens the confirmation dialog instead of calling `decline.mutate()` directly. On confirm, call `offerActions.decline.mutate()`. The `onCounterOffer` callback (currently `undefined`) now opens the OfferSheet in counter mode with the current offer's amount. Also add state for the "Make an Offer" sheet (create mode) triggered from the compose bar. Pass `threadType`, `currentUserRole`, and `onMakeOffer` to ComposeBar. For inquiry threads, "Make an Offer" opens the OfferSheet in create mode with the thread's listing context. On successful offer creation, navigate to the new offer thread (use the `onSuccess` callback from `useCreateOffer` which returns the created offer with `thread_id`).

**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
**Reuses:** `src/features/messaging/components/offer-sheet/`, `src/components/layout/confirmation-dialog/`
**AC:** Decline button opens confirmation dialog with "Are you sure?" message; confirming calls decline mutation; Counter button opens OfferSheet in counter mode pre-filled with current offer amount; "Make an Offer" from compose bar opens OfferSheet in create mode; successful offer creation navigates to offer thread
**Expert Domains:** nextjs, state-management

## Phase 4: Polish, Edge Cases, and Accessibility

**Goal:** Handle edge cases, refine accessibility, and ensure all quality gates pass
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`

### Task 4.1: Add currency input formatting and keyboard behavior to offer sheet

Enhance the price input in OfferSheet to format as currency on blur (e.g., user types "45" and sees "$45.00" on blur). Allow only numeric input and a single decimal point. Handle cents correctly: internal state is always cents (integer), display converts to dollars. Prevent submission of non-numeric values. Add `inputMode="decimal"` for mobile numeric keyboard and `autocomplete="off"`.

**Files:** `src/features/messaging/components/offer-sheet/index.tsx`
**AC:** Input shows formatted currency on blur; only numeric + decimal accepted; internal state is cents; `inputMode="decimal"` present; non-numeric input rejected
**Expert Domains:** nextjs

### Task 4.2: Handle edge cases for offer sheet and action menu

Handle: (1) Offer sheet submit when listing is no longer active — show error toast from API response. (2) Action menu does not show "Make an Offer" for seller role in inquiry threads. (3) Offer sheet does not open if thread is archived/closed. (4) Counter mode unavailable when offer is not pending. (5) Disable offer actions in collapsible header when any action mutation is in-flight (prevent double-tap). (6) Close action menu when compose bar becomes disabled.

**Files:** `src/features/messaging/components/offer-sheet/index.tsx`, `src/features/messaging/components/compose-bar/index.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
**AC:** "Make an Offer" hidden for sellers; sheet blocked for inactive threads; counter blocked for non-pending offers; action buttons disabled during mutation; error toasts for API failures
**Expert Domains:** nextjs, state-management

### Task 4.3: Accessibility audit and ARIA refinements

Verify and fix: (1) OfferSheet price input has `aria-describedby` pointing to error message element and `aria-invalid="true"` on validation error. (2) Action menu items have `aria-disabled="true"` for disabled placeholders (not just `disabled` attribute). (3) Confirmation dialog has `aria-describedby` on the message paragraph. (4) All interactive elements in offer actions have `aria-busy` during pending mutations. (5) Status pill text is accessible (not color-only — the text label is already present). (6) Screen reader announcement when offer is successfully sent (`role="status"` on toast already handles this).

**Files:** `src/features/messaging/components/offer-sheet/index.tsx`, `src/features/messaging/components/compose-bar/index.tsx`, `src/components/layout/confirmation-dialog/index.tsx`
**AC:** `aria-describedby` + `aria-invalid` on price input; `aria-disabled` on placeholder menu items; `aria-describedby` on confirmation dialog; `aria-busy` on all action buttons during mutations
**Expert Domains:** nextjs

### Task 4.4: Run full quality gate and fix any issues

Run `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm lint:styles`. Fix any TypeScript errors, lint violations, formatting issues, or stylelint warnings. Ensure all new files follow kebab-case naming. Verify no unused imports or missing type annotations.

**Files:** All files created or modified in this ticket
**AC:** All five commands pass with zero errors; no new warnings introduced
**Expert Domains:** nextjs, scss
