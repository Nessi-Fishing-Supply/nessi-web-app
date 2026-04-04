# Implementation Plan: #350 — Wire offer actions to inline OfferBubble

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Thread MessageThread with offer action props

**Goal:** Extend the MessageThread component interface to accept and forward offer action callbacks to the inline OfferBubble
**Verify:** `pnpm build`

### Task 1.1: Add offer action props to MessageThread interface and forward to OfferBubble

Extend the `MessageThreadProps` interface with optional offer action callback props: `onAcceptOffer`, `onCounterOffer`, `onDeclineOffer`, `isOfferActionPending`, `latestPendingOfferId` (the message ID of the latest pending offer node, so only that bubble gets action buttons), and `currentUserRole`. Inside the `offer_node` rendering block (around line 141), conditionally pass `onAccept`, `onCounter`, `onDecline`, and `isPending` to the `OfferBubble` only when: (a) the message ID matches `latestPendingOfferId`, (b) the status from metadata is `'pending'`, and (c) `currentUserRole === 'seller'`. The role check ensures buyers never see action buttons. Pass `isPending={isOfferActionPending}` so the buttons reflect mutation state via `aria-busy`.
**Files:** `src/features/messaging/components/message-thread/index.tsx`
**AC:**

- `MessageThreadProps` includes `onAcceptOffer?: () => void`, `onCounterOffer?: () => void`, `onDeclineOffer?: () => void`, `isOfferActionPending?: boolean`, `latestPendingOfferId?: string`, and `currentUserRole?: string`
- OfferBubble receives `onAccept`, `onCounter`, `onDecline`, `isPending` only for the message matching `latestPendingOfferId` when `currentUserRole === 'seller'` and metadata status is `'pending'`
- All other OfferBubble instances render without action buttons (unchanged behavior)

**Expert Domains:** nextjs

### Task 1.2: Wire callbacks from thread-page.tsx into MessageThread

In `thread-page.tsx`, compute the `latestPendingOfferId` by finding the latest `offer_node` message whose metadata status is `'pending'` (reuse the existing `latestOfferMessage` logic around line 89, but also extract its message `id`). Rename `_handleCounterOffer` to `handleCounterOffer` (remove the unused prefix) and `_isOfferActionPending` to `isOfferActionPending`. Pass the following props to the `<MessageThread>` invocation: `onAcceptOffer={() => offerActions.accept.mutate()}`, `onDeclineOffer={() => setIsDeclineDialogOpen(true)}`, `onCounterOffer={handleCounterOffer}`, `isOfferActionPending={isOfferActionPending}`, `latestPendingOfferId={latestPendingOfferMsgId}`, and `currentUserRole={currentUserRole}`.
**Files:** `src/app/(frontend)/dashboard/messages/[thread_id]/thread-page.tsx`
**AC:**

- `latestPendingOfferMsgId` is computed from the messages data (the `id` of the first `offer_node` message with `status: 'pending'` in metadata)
- `_handleCounterOffer` is renamed to `handleCounterOffer` and `_isOfferActionPending` is renamed to `isOfferActionPending`
- All six new props are passed to `<MessageThread>`
- Accept callback calls `offerActions.accept.mutate()`
- Decline callback opens the existing `ConfirmationDialog` via `setIsDeclineDialogOpen(true)`
- Counter callback opens the existing `OfferSheet` in counter mode via `handleCounterOffer`

**Expert Domains:** nextjs, state-management

## Phase 2: Verification and edge cases

**Goal:** Ensure correct behavior for buyer vs seller, non-pending offers, and accessibility compliance
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 2.1: Add role and status guard tests

Create a Vitest test file for the MessageThread component that verifies: (1) when `currentUserRole` is `'seller'` and the latest offer is pending, action buttons render on that OfferBubble; (2) when `currentUserRole` is `'buyer'`, no action buttons render even if the offer is pending; (3) when status is not `'pending'` (e.g., `'accepted'`), no action buttons render regardless of role; (4) when `latestPendingOfferId` does not match the message ID, no action buttons render. Mock the OfferBubble import to inspect props or use `@testing-library/react` to query for button elements.
**Files:** `src/features/messaging/components/message-thread/__tests__/message-thread.test.tsx`
**AC:**

- Test passes for seller + pending = buttons visible
- Test passes for buyer + pending = no buttons
- Test passes for seller + non-pending status = no buttons
- Test passes for mismatched message ID = no buttons
- All tests pass via `pnpm test:run`

**Expert Domains:** nextjs

### Task 2.2: Verify aria-busy propagation on offer action buttons

Confirm that when `isOfferActionPending` is `true`, the OfferBubble's Accept, Counter, and Decline buttons all have `aria-busy="true"`. This is already handled by the OfferBubble component's `isPending` prop mapping to `aria-busy` on each button. Write a quick render test that passes `isPending={true}` to OfferBubble and asserts `aria-busy="true"` on all three action buttons.
**Files:** `src/features/messaging/components/offer-bubble/__tests__/offer-bubble.test.tsx`
**AC:**

- Test renders OfferBubble with `onAccept`, `onCounter`, `onDecline`, and `isPending={true}`
- All three buttons have `aria-busy="true"` attribute
- Test passes via `pnpm test:run`

**Expert Domains:** nextjs
