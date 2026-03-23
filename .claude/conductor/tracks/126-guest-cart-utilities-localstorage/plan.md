# Implementation Plan: #126 — Guest Cart Utilities (localStorage)

## Overview
2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Guest Cart Utility Functions
**Goal:** Create pure utility functions for localStorage guest cart operations with 25-item cap, duplicate prevention, and cross-tab notification support.
**Verify:** `pnpm typecheck && pnpm lint && pnpm build`

### Task 1.1: Create guest cart localStorage utility functions
Create `src/features/cart/utils/guest-cart.ts` with all six pure functions that manage the `nessi_cart` localStorage key. Each function operates on a `GuestCartItem[]` array serialized as JSON. `addToGuestCart` must enforce the 25-item cap (silently return or throw when full) and prevent duplicate `listingId` entries. Include a module-level `STORAGE_KEY = 'nessi_cart'` constant and a `MAX_GUEST_CART_ITEMS = 25` constant. Also export a `subscribe` function that listens to the `storage` event (for cross-tab sync) and a custom event `nessi_cart_change` (for same-tab updates) — this will be consumed by the hook's `useSyncExternalStore`. The `subscribe` function should accept a callback and return an unsubscribe function matching the `useSyncExternalStore` subscribe signature. All mutating functions (`addToGuestCart`, `removeFromGuestCart`, `clearGuestCart`) must dispatch the `nessi_cart_change` custom event on `window` after writing to localStorage so same-tab subscribers are notified.
**Files:** `src/features/cart/utils/guest-cart.ts`
**AC:** All six utility functions exported; 25-item cap enforced in `addToGuestCart`; duplicate `listingId` prevented; `subscribe` function exported for `useSyncExternalStore` integration; custom event dispatched on mutations for same-tab reactivity; no `window` access at module level (guard all browser APIs).

### Task 1.2: Write unit tests for guest cart utilities
Create comprehensive Vitest tests covering: add/remove/clear/get operations, 25-item cap enforcement, duplicate prevention, `getGuestCartCount` accuracy, `isInGuestCart` correctness, JSON parse error resilience (corrupted localStorage), and `subscribe` callback invocation on mutations. Mock `localStorage` and `window.dispatchEvent` as needed.
**Files:** `src/features/cart/utils/__tests__/guest-cart.test.ts`
**AC:** All utility functions have test coverage; edge cases tested (empty cart, full cart, corrupted JSON, duplicate add); tests pass with `pnpm test:run`.
**Expert Domains:** nextjs

## Phase 2: useGuestCart Hook and Barrel Export
**Goal:** Create the `useGuestCart` React hook using `useSyncExternalStore` for hydration-safe localStorage access, and wire up barrel exports.
**Verify:** `pnpm typecheck && pnpm lint && pnpm build`

### Task 2.1: Create useGuestCart hook with useSyncExternalStore
Create `src/features/cart/hooks/use-guest-cart.ts` exporting `useGuestCart()`. Use `useSyncExternalStore` with three arguments: (1) the `subscribe` function from `guest-cart.ts` utils, (2) a `getSnapshot` function that calls `getGuestCart()` and returns a stable reference (JSON.stringify comparison or cached reference to avoid unnecessary re-renders), (3) a `getServerSnapshot` function that returns an empty array `[]` (SSR-safe). The hook returns `{ items, count, add, remove, clear, isInCart }` where `count` is derived from `items.length`, and `add`/`remove`/`clear`/`isInCart` are stable references wrapping the utility functions. Use `useCallback` for the action functions to maintain referential stability.
**Files:** `src/features/cart/hooks/use-guest-cart.ts`
**AC:** Hook uses `useSyncExternalStore` (not `useState` + `useEffect`); SSR returns empty cart; returns all six properties; no hydration mismatch possible; cross-tab sync works via `storage` event; same-tab reactivity works via custom event.
**Expert Domains:** nextjs

### Task 2.2: Add guest cart exports to feature barrel
Update `src/features/cart/index.ts` to export the `useGuestCart` hook and the guest cart utility functions. Group them under clear comment sections matching the existing barrel structure.
**Files:** `src/features/cart/index.ts`
**AC:** `useGuestCart` importable from `@/features/cart`; guest cart utils importable from `@/features/cart`; existing exports unchanged; `pnpm typecheck && pnpm build` pass.
