# Implementation Plan: #127 — Tanstack Query hooks with optimistic updates

## Overview

2 phases, 4 total tasks
Estimated scope: medium

## Phase 1: Client service gap + query/mutation hooks

**Goal:** Add the missing `mergeGuestCart` client service function and create all Tanstack Query hooks with optimistic updates in a single hooks file
**Verify:** `pnpm build`

### Task 1.1: Add mergeGuestCart to client cart service

The cart client service (`src/features/cart/services/cart.ts`) is missing a `mergeGuestCart` function — the server-side `mergeGuestCartServer` exists and the `/api/cart/merge` route is live, but `useMergeGuestCart` needs a client-side caller. Add `mergeGuestCart` to the client service following the existing pattern of thin `@/libs/fetch` wrappers. The function should accept a `GuestCartItem[]` array and POST it to `/api/cart/merge`, returning the merged result. Import `GuestCartItem` from `@/features/cart/types/cart`.
**Files:** `src/features/cart/services/cart.ts`
**AC:** `mergeGuestCart(items: GuestCartItem[])` exported from `src/features/cart/services/cart.ts`; calls `POST /api/cart/merge` with `{ items }` body; return type matches the merge API response shape `{ merged: number }`; `pnpm typecheck` passes
**Expert Domains:** nextjs

### Task 1.2: Create all Tanstack Query cart hooks with optimistic updates

Create `src/features/cart/hooks/use-cart.ts` containing all 9 hooks listed in the ticket. Follow the established pattern in `src/features/listings/hooks/use-listings.ts` — import from `@tanstack/react-query`, use `useQueryClient` for cache operations, and import service functions from `@/features/cart/services/cart`. Key implementation details:

**Query hooks:**

- `useCart()` — `queryKey: ['cart', userId]`, calls `getCart()`, `enabled: !!userId` (only when authenticated). Returns `{ data: CartItemWithListing[], isLoading, error }`.
- `useCartCount()` — `queryKey: ['cart-count', userId]`, calls `getCartCount()`, `enabled: !!userId`. Returns `{ data: { count: number }, isLoading }`.

**Mutation hooks with optimistic updates:**

- `useAddToCart()` — `mutationFn: addToCart(listingId, addedFrom)`. `onMutate`: cancel both query keys, snapshot previous count, set count to `prev + 1`. `onError`: rollback to snapshot. `onSettled`: invalidate both `['cart', userId]` and `['cart-count', userId]`.
- `useRemoveFromCart()` — `mutationFn: removeFromCart(cartItemId)`. `onMutate`: cancel both, snapshot cart and count, filter item from cart cache, decrement count. `onError`: rollback both. `onSettled`: invalidate both keys.
- `useClearCart()` — `mutationFn: clearCart()`. `onMutate`: snapshot, set cart to `[]` and count to `{ count: 0 }`. `onError`: rollback. `onSettled`: invalidate both.

**Mutation hooks without optimistic updates:**

- `useValidateCart()` — `mutationFn: validateCart()`. No optimistic updates (server is source of truth for validation).
- `useMergeGuestCart()` — `mutationFn: mergeGuestCart(items)`. `onSuccess`: call `clearGuestCart()` from `@/features/cart/utils/guest-cart`. `onSettled`: invalidate both query keys.
- `useRefreshExpiry()` — `mutationFn: refreshExpiry(cartItemId)`. `onSettled`: invalidate `['cart', userId]`.

**Unified badge hook:**

- `useCartBadgeCount()` — Calls `useAuth()` to get `{ user, isLoading }`. Calls `useCartCount()` unconditionally with `enabled` flag gated on `!!user`. Calls `useGuestCart()` unconditionally. Returns: when auth loading, `0`; when authenticated, the DB count (defaulting to `0`); when guest, `guestCart.count`. This avoids conditional hook calls (rules of hooks).

All mutation hooks must get `userId` from `useAuth().user?.id` to construct the correct query keys for cache operations and invalidation.

**Files:** `src/features/cart/hooks/use-cart.ts`
**AC:**

- All 9 hooks exported: `useCart`, `useCartCount`, `useAddToCart`, `useRemoveFromCart`, `useClearCart`, `useValidateCart`, `useMergeGuestCart`, `useRefreshExpiry`, `useCartBadgeCount`
- `useAddToCart` optimistically increments count and rolls back on error
- `useRemoveFromCart` optimistically removes item from cart cache and decrements count, rolls back on error
- `useClearCart` optimistically sets empty cart and zero count, rolls back on error
- `useValidateCart` has no optimistic updates
- `useMergeGuestCart` calls `clearGuestCart()` on success
- `useCartBadgeCount` returns guest count when unauthenticated, DB count when authenticated, `0` when loading
- No conditional hook calls in `useCartBadgeCount` (both `useCartCount` and `useGuestCart` called unconditionally)
- All mutations invalidate both `['cart', userId]` and `['cart-count', userId]` in `onSettled`
- `pnpm typecheck` and `pnpm lint` pass
  **Expert Domains:** state-management

## Phase 2: Barrel exports + build verification

**Goal:** Wire up all new hooks through the barrel export and verify the full build passes
**Verify:** `pnpm build`

### Task 2.1: Update barrel exports in cart feature index

Add all 9 hooks to `src/features/cart/index.ts` following the existing export grouping pattern. The file already exports types, client services, server services, guest cart utils, and the `useGuestCart` hook. Add a new `// Cart Query Hooks` section exporting all hooks from `./hooks/use-cart`.
**Files:** `src/features/cart/index.ts`
**AC:** All 9 hooks (`useCart`, `useCartCount`, `useAddToCart`, `useRemoveFromCart`, `useClearCart`, `useValidateCart`, `useMergeGuestCart`, `useRefreshExpiry`, `useCartBadgeCount`) are re-exported from `src/features/cart/index.ts`; existing exports unchanged; `pnpm typecheck` passes
**Expert Domains:** nextjs

### Task 2.2: Update cart feature CLAUDE.md with hooks documentation

Add a hooks section to `src/features/cart/CLAUDE.md` documenting all 9 hooks with their query keys, purposes, and optimistic update behavior. Follow the table format used in `src/features/listings/CLAUDE.md` under its "Hooks" section. Also add `use-cart.ts` to the Architecture section.
**Files:** `src/features/cart/CLAUDE.md`
**AC:** CLAUDE.md has an Architecture entry for `hooks/use-cart.ts`, a Hooks table listing all 9 hooks with query keys and purposes, and a note about optimistic update patterns; `pnpm build` passes
**Expert Domains:** state-management
