# Implementation Plan: #125 — feat(cart): API routes (CRUD, validation, merge)

## Overview
2 phases, 6 total tasks
Estimated scope: small

## Phase 1: Core CRUD Routes
**Goal:** Create the primary cart API routes for fetching, adding, removing, and clearing cart items, plus the count endpoint.
**Verify:** `pnpm build`

### Task 1.1: Create main cart route (GET, POST, DELETE)
Create `src/app/api/cart/route.ts` with three HTTP handlers. **GET** calls `getCartServer(userId)` and returns the full cart array. **POST** parses `{ listingId, addedFrom? }` from the request body, calls `addToCartServer(userId, listingId, 0, addedFrom)` (price is ignored by the service — it snapshots from DB), and maps thrown error messages to HTTP status codes: `'Listing not found or no longer active'` -> 404, `'Item already in cart'` -> 409, `'Cannot add your own listing to cart'` -> 403, `'Cart is full (maximum 25 items)'` -> 422. **DELETE** calls `clearCartServer(userId)` and returns `{ success: true }`. All handlers follow the reference pattern: `createClient()` from `@/libs/supabase/server`, auth check returning 401, `AUTH_CACHE_HEADERS` on every response, try/catch with 500 fallback.
**Files:** `src/app/api/cart/route.ts`
**AC:** GET returns cart array for authenticated user; POST returns created CartItem with correct error codes (401, 404, 409, 403, 422); DELETE returns `{ success: true }`; all return 401 for unauthenticated requests; all responses include AUTH_CACHE_HEADERS
**Expert Domains:** nextjs, supabase

### Task 1.2: Create cart count route (GET)
Create `src/app/api/cart/count/route.ts` with a GET handler. Authenticates the user, calls `getCartCountServer(userId)`, and returns `{ count: number }`. This matches the shape expected by the client service `getCartCount()`.
**Files:** `src/app/api/cart/count/route.ts`
**AC:** GET returns `{ count: number }` for authenticated users; returns 401 for unauthenticated requests; includes AUTH_CACHE_HEADERS
**Expert Domains:** nextjs, supabase

### Task 1.3: Create cart item removal route (DELETE)
Create `src/app/api/cart/[id]/route.ts` with a DELETE handler. Extracts `id` from `context.params` (awaited Promise pattern), authenticates the user, calls `removeFromCartServer(userId, id)`, and returns `{ success: true }`. Maps the `'Cart item not found'` error to 404. The service already enforces ownership via the `eq('user_id', userId)` filter, so no separate ownership check is needed.
**Files:** `src/app/api/cart/[id]/route.ts`
**AC:** DELETE returns `{ success: true }` when item exists and belongs to user; returns 404 when item not found or belongs to another user; returns 401 for unauthenticated requests; includes AUTH_CACHE_HEADERS
**Expert Domains:** nextjs, supabase

## Phase 2: Specialized Routes (validate, merge, expiry)
**Goal:** Create the remaining cart API routes for pre-checkout validation, guest cart merging, and expiry refresh.
**Verify:** `pnpm build`

### Task 2.1: Create cart validation route (POST)
Create `src/app/api/cart/validate/route.ts` with a POST handler. Authenticates the user, calls `validateCartServer(userId)`, and returns the `CartValidationResult` object with `{ valid, removed, priceChanged }` arrays. No request body needed.
**Files:** `src/app/api/cart/validate/route.ts`
**AC:** POST returns `{ valid, removed, priceChanged }` for authenticated users; returns 401 for unauthenticated requests; includes AUTH_CACHE_HEADERS
**Expert Domains:** nextjs, supabase

### Task 2.2: Create guest cart merge route (POST)
Create `src/app/api/cart/merge/route.ts` with a POST handler. Authenticates the user, parses `{ items: GuestCartItem[] }` from the request body, validates that `items` is a non-empty array (return 400 if not), calls `mergeGuestCartServer(userId, items)`, and returns `{ merged: number }`. The server service already handles all untrusted-data validation (UUID format, listing existence, own-listing check, duplicate check, cart cap).
**Files:** `src/app/api/cart/merge/route.ts`
**AC:** POST accepts `{ items: GuestCartItem[] }` and returns `{ merged: number }`; returns 400 for missing/invalid items array; returns 401 for unauthenticated requests; includes AUTH_CACHE_HEADERS
**Expert Domains:** nextjs, supabase

### Task 2.3: Create expiry refresh route (PATCH)
Create `src/app/api/cart/[id]/expiry/route.ts` with a PATCH handler. Extracts `id` from `context.params` (awaited Promise pattern), authenticates the user, calls `refreshExpiryServer(userId, id)`, and returns the updated `CartItem`. Maps the `'Cart item not found'` error to 404.
**Files:** `src/app/api/cart/[id]/expiry/route.ts`
**AC:** PATCH returns updated CartItem with refreshed expires_at; returns 404 when item not found; returns 401 for unauthenticated requests; includes AUTH_CACHE_HEADERS
**Expert Domains:** nextjs, supabase
