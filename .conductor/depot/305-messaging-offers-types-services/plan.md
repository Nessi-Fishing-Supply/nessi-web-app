# Implementation Plan: #305 — Messaging — Feature scaffold for offers types and services

## Overview

3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Types and validation utilities

**Goal:** Define all offer types derived from the database schema and create the pure validation utility with constants, so downstream services can import them.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create offer types module

Define all offer-related types derived from `Database['public']['Tables']['offers']` and `Database['public']['Enums']['offer_status']`. The `Offer` Row type already exists in `database.ts` with columns: `id`, `amount_cents`, `buyer_id`, `seller_id`, `listing_id`, `thread_id`, `parent_offer_id`, `status`, `expires_at`, `created_at`, `updated_at`. The `offer_status` enum has values: `pending`, `accepted`, `declined`, `countered`, `expired`. Follow the same pattern as `src/features/messaging/types/thread.ts` and `src/features/messaging/types/message.ts` which derive types from `Database` and use `Omit` for insert types.
**Files:** `src/features/messaging/types/offer.ts`
**AC:** File exports `Offer`, `OfferInsert`, `OfferStatus`, `OfferWithDetails`, `CreateOfferParams`, and `CounterOfferParams`. All types compile without errors. `OfferWithDetails` includes `listing`, `buyer`, and `seller` enrichment fields matching the shapes specified in the issue.
**Expert Domains:** supabase

### Task 1.2: Create offer validation utility

Create a pure utility module with constants (`OFFER_MIN_PERCENTAGE = 0.70`, `OFFER_EXPIRY_HOURS = 24`, `OFFER_CHECKOUT_WINDOW_HOURS = 4`, `OFFER_DEFAULT_PREFILL_PERCENTAGE = 0.80`) and four functions: `validateOfferAmount` (checks amount >= 70% of listing price, returns `{ valid, error? }`), `calculateMinOffer` (returns minimum acceptable cents), `calculateDefaultOffer` (returns 80% prefill cents), and `isOfferExpired` (compares `expires_at` string against `Date.now()`). All amounts are integer cents -- never use floating point division for money. Use `Math.ceil` for minimum calculations to avoid rounding down below the threshold.
**Files:** `src/features/messaging/utils/offer-validation.ts`
**AC:** All four functions and four constants are exported. `validateOfferAmount(7000, 10000)` returns `{ valid: true }`. `validateOfferAmount(6999, 10000)` returns `{ valid: false, error: '...' }`. `calculateMinOffer(10000)` returns `7000`. `calculateDefaultOffer(10000)` returns `8000`. `isOfferExpired` returns `true` for a past date and `false` for a future date.
**Expert Domains:** nextjs

### Task 1.3: Create unit tests for offer validation

Follow the test pattern established in `src/features/messaging/utils/__tests__/safety-filter.test.ts` which uses `describe/it/expect` from Vitest. Test all four exported functions and edge cases: zero price, exact 70% boundary, rounding behavior on odd cents, expired vs not-expired timestamps.
**Files:** `src/features/messaging/utils/__tests__/offer-validation.test.ts`
**AC:** All tests pass via `pnpm test:run`. Tests cover: valid offer at exact 70%, invalid offer at 69.99%, zero amount, minimum calculation with odd cents (e.g., `calculateMinOffer(9999)` returns `7000` via `Math.ceil`), default calculation, expired and non-expired timestamps.
**Expert Domains:** nextjs

### Task 1.4: Add offer types to barrel export

Append offer type exports to `src/features/messaging/index.ts`. Follow the existing pattern: type-only re-exports grouped by source file, then client service re-exports. Offer types go in a new `export type { ... } from '@/features/messaging/types/offer'` block. Do NOT export server services or validation utils from the barrel (server services are imported directly by API routes; validation utils are internal to the feature).
**Files:** `src/features/messaging/index.ts`
**AC:** `Offer`, `OfferInsert`, `OfferStatus`, `OfferWithDetails`, `CreateOfferParams`, and `CounterOfferParams` are importable from `@/features/messaging`. Existing thread and message type exports remain unchanged.

## Phase 2: Server services

**Goal:** Implement all seven server-side offer functions that query and mutate the `offers` table via `@/libs/supabase/server`, enforcing business rules (70% minimum, one active offer per buyer-seller-listing, status transition guards).
**Verify:** `pnpm build && pnpm typecheck`

### Task 2.1: Implement createOfferServer and getOfferByIdServer

Create `src/features/messaging/services/offers-server.ts` following the patterns in `messaging-server.ts`: import `createClient` from `@/libs/supabase/server`, use `await createClient()` at the top of each function, throw descriptive `Error` messages on failures. `createOfferServer(userId, params)`: (1) fetch the listing to verify it exists and is active (`status = 'active'`), (2) verify `userId !== seller_id`, (3) call `validateOfferAmount` from the validation util, (4) expire any existing pending offers for the same `buyer_id + seller_id + listing_id` combo by setting `status = 'expired'`, (5) find or create an offer thread via `createThreadServer` with `type = 'offer'` and participant roles `buyer`/`seller`, (6) insert the offer row with `expires_at = now + 24h`, (7) insert an `offer_node` message in the thread via `createMessageServer`. `getOfferByIdServer(userId, offerId)`: fetch offer, verify user is buyer or seller, join listing + buyer + seller data to return `OfferWithDetails`.
**Files:** `src/features/messaging/services/offers-server.ts`
**AC:** `createOfferServer` enforces: listing must be active (throws otherwise), user cannot be seller (throws), amount must pass `validateOfferAmount` (throws with validation error), existing pending offers for same buyer-seller-listing are expired before creating the new one, creates offer thread and inserts `offer_node` message. `getOfferByIdServer` returns `OfferWithDetails` or `null` if user is not a participant.
**Expert Domains:** supabase, nextjs

### Task 2.2: Implement acceptOfferServer and declineOfferServer

Add both functions to `offers-server.ts`. Both follow the same pattern: (1) fetch the offer, (2) verify `userId === offer.seller_id`, (3) verify `offer.status === 'pending'`, (4) update status to `'accepted'` or `'declined'`, (5) insert a `system` message in the thread via `createMessageServer` with descriptive content like "Offer accepted" or "Offer declined". For accept, the system message should include the amount for context.
**Files:** `src/features/messaging/services/offers-server.ts`
**AC:** `acceptOfferServer` throws if user is not the seller or offer is not pending. On success, offer status is `'accepted'` and a system message is inserted. `declineOfferServer` throws if user is not the seller or offer is not pending. On success, offer status is `'declined'` and a system message is inserted.
**Expert Domains:** supabase, nextjs

### Task 2.3: Implement counterOfferServer

Add to `offers-server.ts`. Validate: user is the seller, original offer is pending, counter amount passes `validateOfferAmount` against the listing price. Set original offer status to `'countered'`. Insert a new offer row with `parent_offer_id = original.id`, `buyer_id = original.seller_id` and `seller_id = original.buyer_id` (roles swap because the seller is now proposing), same `thread_id`, new `expires_at = now + 24h`. Insert an `offer_node` message in the thread for the counter offer.
**Files:** `src/features/messaging/services/offers-server.ts`
**AC:** `counterOfferServer` throws if user is not the seller, offer is not pending, or counter amount fails validation. On success: original offer status is `'countered'`, new offer row has `parent_offer_id` set, buyer/seller are swapped, and an `offer_node` message is inserted in the thread.
**Expert Domains:** supabase, nextjs

### Task 2.4: Implement getOffersForListingServer and expirePendingOffersServer

Add both to `offers-server.ts`. `getOffersForListingServer(userId, listingId)`: query offers where `listing_id` matches and user is either `buyer_id` or `seller_id`, ordered by `created_at DESC`. `expirePendingOffersServer()`: uses `createAdminClient` from `@/libs/supabase/admin` (not the cookie-based server client) since this runs from a cron job without user context. Updates all offers where `status = 'pending'` AND `expires_at < now()` to `status = 'expired'`. Also expires accepted offers past the 4-hour checkout window (`status = 'accepted'` AND `updated_at + 4h < now()`). Returns `{ expired: number }` with the count of affected rows.
**Files:** `src/features/messaging/services/offers-server.ts`
**AC:** `getOffersForListingServer` returns only offers where the user is buyer or seller, ordered newest-first. `expirePendingOffersServer` uses admin client, expires pending offers past 24h and accepted offers past 4h checkout window, returns the count of expired rows.
**Expert Domains:** supabase, nextjs

## Phase 3: Client services and barrel finalization

**Goal:** Create thin fetch wrappers for all five client-facing offer endpoints and add client service exports to the barrel.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 3.1: Create client offer service

Create `src/features/messaging/services/offers.ts` following the exact pattern in `src/features/messaging/services/messaging.ts` and `src/features/watchlist/services/watchlist.ts`: import `get` and `post` from `@/libs/fetch`, import types from the local types module, export arrow function expressions. Five functions: `createOffer` (POST `/api/offers`), `getOffer` (GET `/api/offers/{id}`), `acceptOffer` (POST `/api/offers/{id}/accept`), `declineOffer` (POST `/api/offers/{id}/decline`), `counterOffer` (POST `/api/offers/{id}/counter` with `{ amountCents }` body).
**Files:** `src/features/messaging/services/offers.ts`
**AC:** All five functions are exported. Each uses the correct HTTP method and URL pattern. `createOffer` sends `CreateOfferParams` as the body. `counterOffer` sends `CounterOfferParams` as the body. Return types match: `Offer` for mutations, `OfferWithDetails` for `getOffer`.
**Expert Domains:** nextjs

### Task 3.2: Add client offer services to barrel export

Append the five client service functions to the barrel export in `src/features/messaging/index.ts`. Follow the existing pattern where client services are exported as named re-exports (not `export *`).
**Files:** `src/features/messaging/index.ts`
**AC:** `createOffer`, `getOffer`, `acceptOffer`, `declineOffer`, and `counterOffer` are importable from `@/features/messaging`. All existing exports remain intact. `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check` all pass.
**Expert Domains:** nextjs
