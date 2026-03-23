# Implementation Plan: #124 — feat(cart): feature scaffold, types, and service layer

## Overview
3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Feature scaffold, regenerate types, and define cart types
**Goal:** Create the `src/features/cart/` directory structure with CLAUDE.md and all TypeScript types derived from the database schema.
**Verify:** `pnpm typecheck && pnpm build`

### Task 1.1: Regenerate database types to include cart_items
Run `pnpm db:types` to regenerate `src/types/database.ts` with the `cart_items` table that was added in ticket #123. Verify that `cart_items` Row, Insert, Update, and Relationships types are present in the output (they already are from a prior regeneration -- confirm and skip if already current).
**Files:** `src/types/database.ts`
**AC:** `Database['public']['Tables']['cart_items']` exists in `src/types/database.ts` with Row, Insert, Update, and Relationships types matching the schema (id, user_id, listing_id, price_at_add, added_from, added_at, expires_at).
**Expert Domains:** supabase

### Task 1.2: Create feature scaffold directories and CLAUDE.md
Create the `src/features/cart/` directory structure: `types/`, `services/`, `utils/` (empty, placeholder for guest cart in a future ticket). Write `CLAUDE.md` documenting the cart feature architecture, including: overview (authenticated cart backed by `cart_items` table, 25-item cap, 30-day expiry, price snapshot validation), file layout, types summary, service function tables (client and server), validation rules (5 rules: listing active, not own listing, not duplicate, cart < 25, snapshot price), and pointers to related features (listings, context). Follow the format and depth of `src/features/listings/CLAUDE.md` and `src/features/shops/CLAUDE.md`.
**Files:** `src/features/cart/CLAUDE.md`, `src/features/cart/types/` (directory), `src/features/cart/services/` (directory), `src/features/cart/utils/` (directory)
**AC:** Directory structure exists. CLAUDE.md documents architecture, types, services, validation rules, and related features. `src/features/cart/utils/` directory exists (empty, for future guest cart ticket).
**Expert Domains:** nextjs

### Task 1.3: Create cart types file
Create `src/features/cart/types/cart.ts` with all types specified in the ticket. Follow the pattern in `src/features/listings/types/listing.ts` and `src/features/shops/types/shop.ts` -- derive base types from `Database['public']['Tables']['cart_items']` and omit system-managed fields from insert types. Specific types to define:

- `CartItem` -- `Database['public']['Tables']['cart_items']['Row']`
- `CartItemInsert` -- `Omit` the Insert type, removing system-managed fields: `id`, `added_at`, `expires_at` (these have defaults in the DB)
- `CartItemWithListing` -- `CartItem` intersected with a `listing` object containing the fields needed for cart display: listing title, price_cents, cover_photo_url, status, and seller info (seller_id, member_id, shop_id). Also include `listing_photos` for thumbnail access. Model this as `CartItem & { listing: Pick<Listing, 'title' | 'price_cents' | 'cover_photo_url' | 'status' | 'seller_id' | 'member_id' | 'shop_id'> & { listing_photos: ListingPhoto[] } }` using imported `Listing` from `@/features/listings/types/listing` and `ListingPhoto` from `@/features/listings/types/listing-photo`.
- `GuestCartItem` -- `{ listingId: string; priceAtAdd: number; addedAt: string; addedFrom?: string }`
- `CartValidationResult` -- `{ valid: CartItemWithListing[]; removed: { item: CartItemWithListing; reason: 'sold' | 'deleted' | 'expired' | 'deactivated' }[]; priceChanged: { item: CartItemWithListing; oldPrice: number; newPrice: number }[] }`

**Files:** `src/features/cart/types/cart.ts`
**AC:** All 5 types are exported. `CartItem` derives from the database Row type. `CartItemInsert` omits `id`, `added_at`, `expires_at`. `CartItemWithListing` includes joined listing data with photos. `GuestCartItem` is a plain object type (not database-derived). `CartValidationResult` has `valid`, `removed` (with reason union), and `priceChanged` (with oldPrice/newPrice) arrays. File passes `pnpm typecheck`.
**Expert Domains:** supabase

## Phase 2: Server-side services with validation logic
**Goal:** Implement all server-side cart service functions in `cart-server.ts` with full business validation (listing active, not own listing, no duplicates, cart cap, price snapshot).
**Verify:** `pnpm typecheck && pnpm lint && pnpm build`

### Task 2.1: Create server-side cart service -- read operations
Create `src/features/cart/services/cart-server.ts` with the read operations. Use `createClient` from `@/libs/supabase/server` (same pattern as `src/features/listings/services/listing-server.ts`). Implement:

- `getCartServer(userId: string)` -- Query `cart_items` where `user_id = userId`, join listings with `listing_photos` using `.select('*, listing:listings(title, price_cents, cover_photo_url, status, seller_id, member_id, shop_id, listing_photos(*))')`. Order by `added_at` descending. Return `CartItemWithListing[]`.
- `getCartCountServer(userId: string)` -- Query `cart_items` with `.select('id', { count: 'exact', head: true })` where `user_id = userId`. Return the count as a `number`.

**Files:** `src/features/cart/services/cart-server.ts`
**AC:** Both functions use the Supabase server client. `getCartServer` returns cart items with joined listing + photo data typed as `CartItemWithListing[]`. `getCartCountServer` returns a number. Error cases throw descriptive errors matching the listing-server pattern (`throw new Error('Failed to fetch cart: ...')`).
**Expert Domains:** supabase, nextjs

### Task 2.2: Add server-side cart service -- write operations and validation
Add the write operations to `src/features/cart/services/cart-server.ts`. Each write operation enforces the validation rules specified in the ticket:

- `addToCartServer(userId: string, listingId: string, priceCents: number, addedFrom?: string)` -- Validates in order: (1) fetch listing, confirm it exists and `status === 'active'`; (2) confirm `listing.seller_id !== userId` (cannot add own listing); (3) check for existing cart item with same `user_id + listing_id` (for a better error message than the DB unique constraint); (4) count user's cart items, confirm < 25. Then insert with `price_at_add` set to the current `listing.price_cents` (not the passed-in `priceCents` -- always snapshot from the DB to prevent price manipulation). Return the inserted `CartItem`.
- `removeFromCartServer(userId: string, cartItemId: string)` -- Delete from `cart_items` where `id = cartItemId AND user_id = userId`. Throw if no rows affected.
- `clearCartServer(userId: string)` -- Delete all from `cart_items` where `user_id = userId`.
- `refreshExpiryServer(userId: string, cartItemId: string)` -- Update `expires_at` to 30 days from now. Use `.update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })` where `id = cartItemId AND user_id = userId`. Throw if no rows affected.

For validation errors, throw descriptive `Error` instances with messages that the API route layer can surface (e.g., `'Listing not found or no longer active'`, `'Cannot add your own listing to cart'`, `'Item already in cart'`, `'Cart is full (maximum 25 items)'`).

**Files:** `src/features/cart/services/cart-server.ts`
**AC:** All 4 functions implemented. `addToCartServer` enforces all 5 validation rules in order (active listing, not own listing, not duplicate, cart < 25, snapshots DB price). `removeFromCartServer` and `refreshExpiryServer` scope deletes/updates to the user's own items. `clearCartServer` deletes all items for a user. Validation errors throw with descriptive messages.
**Expert Domains:** supabase, nextjs

### Task 2.3: Add server-side cart service -- validateCartServer and mergeGuestCartServer
Add the remaining two server-side functions to `src/features/cart/services/cart-server.ts`:

- `validateCartServer(userId: string)` -- Fetch all cart items with listing data via `getCartServer(userId)`. Categorize each item: if listing status is not `'active'`, add to `removed` array with appropriate reason (`'sold'` if status is `'sold'`, `'deleted'` if listing missing or `deleted_at` set, `'deactivated'` if status is `'archived'`/`'draft'`); if `item.price_at_add !== item.listing.price_cents`, add to `priceChanged` with old/new prices; otherwise add to `valid`. Return `CartValidationResult`.
- `mergeGuestCartServer(userId: string, guestItems: GuestCartItem[])` -- Treat all guest data as untrusted. For each guest item: validate `listingId` is a valid UUID format, fetch the listing from DB, skip if listing not active or is user's own listing, skip if already in user's cart. Enforce cart cap of 25 across the merge (stop adding when cap reached). Insert valid items with `price_at_add` snapshotted from the DB (ignore the guest item's `priceAtAdd`). Return the count of items successfully merged.

**Files:** `src/features/cart/services/cart-server.ts`
**AC:** `validateCartServer` returns a `CartValidationResult` with items correctly categorized into `valid`, `removed` (with reason), and `priceChanged` (with old/new prices). `mergeGuestCartServer` validates UUIDs, fetches listings from DB (ignores guest price data), skips invalid/own/duplicate listings, respects the 25-item cart cap, and returns merge count. Neither function trusts client-provided data for security-sensitive fields.
**Expert Domains:** supabase, nextjs

## Phase 3: Client-side services and barrel exports
**Goal:** Create the thin client-side service wrappers and barrel index file, completing the feature scaffold.
**Verify:** `pnpm typecheck && pnpm lint && pnpm build`

### Task 3.1: Create client-side cart service
Create `src/features/cart/services/cart.ts` following the pattern in `src/features/listings/services/listing.ts` -- thin wrappers around the `@/libs/fetch` helpers (`get`, `post`, `del`, `patch`) that call future API routes. Define `const BASE_URL = '/api/cart'` and implement:

- `getCart()` -- `get<CartItemWithListing[]>(BASE_URL)`
- `getCartCount()` -- `get<{ count: number }>(`${BASE_URL}/count`)`
- `addToCart(listingId: string, addedFrom?: string)` -- `post<CartItem>(BASE_URL, { listingId, addedFrom })`
- `removeFromCart(cartItemId: string)` -- `del<{ success: boolean }>(`${BASE_URL}/${cartItemId}`)`
- `clearCart()` -- `del<{ success: boolean }>(BASE_URL)`
- `validateCart()` -- `post<CartValidationResult>(`${BASE_URL}/validate`)`
- `refreshExpiry(cartItemId: string)` -- `patch<CartItem>(`${BASE_URL}/${cartItemId}/expiry`)`

Import types from `@/features/cart/types/cart`.

**Files:** `src/features/cart/services/cart.ts`
**AC:** All 7 functions exported. Each uses the appropriate HTTP method from `@/libs/fetch`. Return types match the cart types. No direct Supabase client usage -- these are pure fetch wrappers for future API routes.
**Expert Domains:** nextjs

### Task 3.2: Create barrel exports index file
Create `src/features/cart/index.ts` following the pattern in `src/features/listings/index.ts`. Export all types from `types/cart.ts` (as type exports), all client-side service functions from `services/cart.ts`, and all server-side service functions from `services/cart-server.ts`. Group exports with comments (Types, Client Services, Server Services) for readability.

**Files:** `src/features/cart/index.ts`
**AC:** All types exported as `export type`. All client service functions exported. All server service functions exported. File compiles without errors. `pnpm typecheck && pnpm lint && pnpm build` all pass.
**Expert Domains:** nextjs
