# Implementation Plan: #311 — Messaging — Tanstack Query hooks for offers

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Query hook and create-offer mutation

**Goal:** Implement the read-side hook for fetching offer details and the create-offer mutation with cache invalidation
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create useOffer query hook

Implement `useOffer(offerId)` as a standard `useQuery` hook following the same pattern as `use-thread.ts`. The hook calls `getOffer(offerId)` from `@/features/messaging/services/offers` and returns typed `OfferWithDetails` data. Disable the query when `offerId` is falsy using the `enabled` option.
**Files:** `src/features/messaging/hooks/use-offer.ts`
**AC:** `useOffer(offerId)` returns `{ data: OfferWithDetails, isLoading }` when offerId is truthy; query is disabled when offerId is undefined/empty; query key is `['messages', 'offers', offerId]`
**Expert Domains:** state-management

### Task 1.2: Create useCreateOffer mutation hook

Implement `useCreateOffer({ onSuccess?, onError? })` following the `useCreateThread` pattern. The mutation calls `createOffer(params)` from the client service. On settle, invalidate `['messages', 'offers']` and `['messages', 'threads']` so the new offer thread appears in the thread list. Call `onSuccess` with the new `Offer` on success, and `onError` on failure with proper Error wrapping.
**Files:** `src/features/messaging/hooks/use-create-offer.ts`
**AC:** Mutation calls `POST /api/offers` via `createOffer`; on settle invalidates both `['messages', 'offers']` and `['messages', 'threads']` query keys; `onSuccess` callback receives the new `Offer`; `onError` callback receives an `Error` instance
**Expert Domains:** state-management

## Phase 2: Offer actions mutation and barrel export

**Goal:** Implement the three seller action mutations with optimistic updates and wire all hooks into the barrel export
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 2.1: Create useOfferActions mutation hook

Implement `useOfferActions({ offerId, onSuccess?, onError? })` returning `{ accept, decline, counter }` — three separate `useMutation` instances. Follow the optimistic update pattern from `use-send-message.ts` and `use-watch-toggle.ts`: cancel in-flight queries, snapshot the current `OfferWithDetails` cache at key `['messages', 'offers', offerId]`, optimistically set `status` to `'accepted'`/`'declined'`/`'countered'` respectively, and revert on error. The `accept` mutation calls `acceptOffer(offerId)`, `decline` calls `declineOffer(offerId)`, and `counter` calls `counterOffer(offerId, { amountCents })`. All three invalidate `['messages', 'offers', offerId]` and `['messages', 'threads']` on settle. The counter mutation does NOT modify the original offer cache entry — it creates a new query entry for the returned offer at `['messages', 'offers', newOffer.id]` via `queryClient.setQueryData` in `onSuccess`, and invalidates the original offer key so it refetches with `status: 'countered'`.
**Files:** `src/features/messaging/hooks/use-offer-actions.ts`
**AC:** `accept` optimistically sets offer status to `'accepted'` and reverts on error; `decline` optimistically sets offer status to `'declined'` and reverts on error; `counter` accepts `{ amountCents }` argument, sets the new counter offer into cache at its own query key, and invalidates the original offer key; all three call `onSuccess`/`onError` callbacks; all three invalidate threads on settle
**Expert Domains:** state-management

### Task 2.2: Update barrel export with offer hooks

Add the three new hook exports to `src/features/messaging/index.ts` following the existing pattern of named re-exports. Place them after the existing messaging hook exports in a logical group.
**Files:** `src/features/messaging/index.ts`
**AC:** `useOffer`, `useCreateOffer`, and `useOfferActions` are all exported from `@/features/messaging`; existing exports are unchanged
**Expert Domains:** nextjs

### Task 2.3: Update messaging feature CLAUDE.md with offer hooks documentation

Add the three new hooks to the Hooks section of `src/features/messaging/CLAUDE.md`, documenting their query keys, descriptions, optimistic update behavior, and invalidation targets. Follow the existing table format used for the messaging query and mutation hooks.
**Files:** `src/features/messaging/CLAUDE.md`
**AC:** CLAUDE.md documents `useOffer`, `useCreateOffer`, and `useOfferActions` with query keys, descriptions, and invalidation targets matching the implementation
