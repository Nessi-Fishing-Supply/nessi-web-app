# Implementation Plan: #351 — fix(messaging): verify and fix offer creation redirect to message thread

## Overview

1 phase, 2 total tasks
Estimated scope: small

## Phase 1: Remove redundant type cast and add test coverage

**Goal:** Clean up the unnecessary type cast in OfferSheet's onSuccess handler and add Vitest coverage verifying the onOfferCreated callback receives the correct thread_id
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test:run`

### Task 1.1: Remove redundant type cast in OfferSheet onSuccess handler

The `useCreateOffer` hook types its `onSuccess` callback as `(offer: Offer) => void`, and the `Offer` type (from `database.ts` Row) already includes `thread_id: string`. Line 73 of OfferSheet casts `offer as { thread_id?: string }` and falls back to empty string with `?? ''` — both are unnecessary. Replace line 73 with a direct property access: `onOfferCreated?.({ thread_id: offer.thread_id })`. This removes the redundant cast while preserving the exact same behavior and callback shape.
**Files:** `src/features/messaging/components/offer-sheet/index.tsx`
**AC:**

- Line 73 no longer contains a type cast (`as { thread_id?: string }`)
- Line 73 no longer contains the `?? ''` fallback
- The `onOfferCreated` callback is invoked with `{ thread_id: offer.thread_id }` directly
- `pnpm typecheck` passes (proving `Offer` already has `thread_id: string`)
- `pnpm build` passes

### Task 1.2: Add Vitest test for OfferSheet onOfferCreated callback

Create a test file for the OfferSheet component that verifies the onOfferCreated callback receives the correct thread_id when an offer is successfully created. Mock `useCreateOffer` from `@/features/messaging/hooks/use-create-offer` to capture the `onSuccess` handler, then simulate calling it with a fake `Offer` object containing a known `thread_id`. Assert the `onOfferCreated` prop spy was called with `{ thread_id: '<expected>' }`. Also mock `useOfferActions`, `useToast`, and `useId` as needed. Follow the test patterns established in `src/features/messaging/components/offer-bubble/__tests__/index.test.tsx` (vitest + RTL, `/// <reference types="@testing-library/jest-dom" />`, `vi.fn()` for callbacks, `beforeEach`/`afterEach` cleanup).
**Files:** `src/features/messaging/components/offer-sheet/__tests__/index.test.tsx`
**AC:**

- Test file exists at the specified path
- At least one test verifies `onOfferCreated` is called with `{ thread_id }` matching the offer's `thread_id`
- At least one test verifies `onOfferCreated` is not called when the prop is omitted
- `pnpm test:run` passes with all new tests green
- Tests mock the mutation hook rather than making real API calls
