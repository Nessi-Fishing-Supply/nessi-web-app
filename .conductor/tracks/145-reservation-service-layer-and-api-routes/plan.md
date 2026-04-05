# Implementation Plan: #145 — Reservation Service Layer and API Routes

## Overview
3 phases, 11 total tasks
Estimated scope: medium

## Phase 1: Feature Domain Foundation (Types, CLAUDE.md, Server Services)
**Goal:** Create the `src/features/reservations/` domain with types derived from the database schema, the feature CLAUDE.md, and all server-side service functions that wrap Supabase operations.
**Verify:** `pnpm build`

### Task 1.1: Create feature directory, types, and CLAUDE.md
Create the `src/features/reservations/` directory structure with the reservation types derived from `Database['public']['Tables']['reservations']['Row']` and the feature CLAUDE.md documenting the domain architecture.

Types to define:
- `Reservation` — alias for the DB row type
- `ReservationInsert` — omitting auto-generated fields (`id`, `created_at`)
- `ReservationWithListing` — reservation joined with listing title, price, cover photo (for the cart/checkout UI)
- `ReservationResult` — `{ reserved: { listingId: string; reservedUntil: string }[]; failed: { listingId: string; reason: 'already_reserved' | 'sold' | 'not_active' }[] }`
- `ReservationCheck` — `{ reserved: boolean; reservedBy?: string; reservedUntil?: string }`

The CLAUDE.md should document the table schema (from the #144 migration), the RLS policies (select/insert/delete own), the `release_expired_reservations()` DB function, the 10-minute TTL with max 1 extension, and the admin-client requirement for status updates on listings the buyer does not own. Follow the structure of `src/features/cart/CLAUDE.md` and `src/features/watchlist/CLAUDE.md`.

**Files:** `src/features/reservations/types/reservation.ts`, `src/features/reservations/CLAUDE.md`
**AC:** Types compile without errors; `ReservationResult` has both `reserved` and `failed` arrays; CLAUDE.md documents the schema, RLS, and key patterns
**Expert Domains:** supabase

### Task 1.2: Create server-side reservation service
Create `reservation-server.ts` with all server-side functions. Each function that performs a read operation must call `cleanupExpiredReservationsServer()` first as an application-layer fallback for pg_cron.

Functions:
- `cleanupExpiredReservationsServer()` — calls `supabase.rpc('release_expired_reservations')` using the admin client (function is `SECURITY DEFINER` but calling via admin avoids RLS on the RPC call itself)
- `reserveListingsServer(userId, listingIds)` — for each listing: (1) verify `status = 'active'` and `deleted_at IS NULL`, (2) insert reservation row with `reserved_until = now() + 10 minutes`, (3) update listing `status = 'reserved'` via admin client (buyer does not own listing). Collect successes into `reserved[]` and failures into `failed[]` with reason codes. Use admin client for listing status updates. Handle `UNIQUE` constraint violations as `already_reserved`.
- `releaseReservationServer(userId, listingId)` — delete reservation row where `reserved_by = userId` and `listing_id = listingId`, then set listing status back to `active` via admin client. Throw if no matching reservation found.
- `releaseAllReservationsServer(userId)` — fetch all reservation rows for user, delete them, set each listing back to `active` via admin client.
- `getActiveReservationsServer(userId)` — cleanup first, then select all reservations for user joined with listing data (title, price_cents, cover_photo_url, condition).
- `extendReservationServer(userId, listingId, minutes)` — validate minutes <= 10. Check that reservation exists and has not already been extended (compare `reserved_until` against `created_at + 10 minutes` — if already beyond the initial 10 min window, it was extended). Update `reserved_until` to `reserved_until + minutes`.
- `isListingReservedServer(listingId)` — cleanup first, then check if a non-expired reservation exists for the listing. Returns `{ reserved: boolean; reservedBy?: string; reservedUntil?: string }`. Uses admin client since this is a public check (no auth required, RLS would block).

Follow the pattern established in `src/features/cart/services/cart-server.ts`: import `createClient` from `@/libs/supabase/server` for user-scoped reads, import `createAdminClient` from `@/libs/supabase/admin` for cross-user writes (listing status updates, public checks). Throw descriptive `Error` messages that API routes can match on for status code mapping.

**Files:** `src/features/reservations/services/reservation-server.ts`
**AC:** All 7 functions implemented; `reserveListingsServer` returns `ReservationResult` with partial success support; admin client used for listing status mutations; cleanup called before reads; `extendReservationServer` enforces max-1-extension rule
**Expert Domains:** supabase, nextjs

### Task 1.3: Create barrel export index
Create the barrel `index.ts` that re-exports types, server services, client services, and hooks. Follow the pattern from `src/features/cart/index.ts`. Client services and hooks will be added in later phases — stub the export sections with comments for now so the file structure is ready.

**Files:** `src/features/reservations/index.ts`
**AC:** Barrel exports types and server services; file compiles
**Expert Domains:** nextjs

## Phase 2: API Routes
**Goal:** Create all 6 API route handlers that wrap the server services, following the auth pattern from `src/app/api/cart/` and the description comment convention from `src/app/api/CLAUDE.md`.
**Verify:** `pnpm build`

### Task 2.1: Create POST and GET /api/reservations route
Create the root reservations route with POST (reserve listings) and GET (get active reservations) handlers.

POST: Parse `{ listingIds: string[] }` from body, validate array is non-empty, call `reserveListingsServer(user.id, listingIds)`, return `ReservationResult`. Map errors to appropriate status codes.

GET: Call `getActiveReservationsServer(user.id)`, return the array.

Both require auth — return 401 via the same pattern as `src/app/api/cart/route.ts` (server client `getUser()` check). Use `AUTH_CACHE_HEADERS` from `@/libs/api-headers`. Add description comments above each handler per the API CLAUDE.md convention.

**Files:** `src/app/api/reservations/route.ts`
**AC:** POST creates reservations and returns `ReservationResult`; GET returns user's active reservations; both return 401 for unauthenticated requests; description comments present on each handler
**Expert Domains:** supabase, nextjs

### Task 2.2: Create DELETE /api/reservations route
Add the DELETE handler to the root reservations route file created in Task 2.1. Calls `releaseAllReservationsServer(user.id)`. Returns `{ success: true }`. Requires auth.

**Files:** `src/app/api/reservations/route.ts`
**AC:** DELETE releases all user reservations; returns 401 for unauthenticated requests; description comment present
**Expert Domains:** supabase, nextjs

### Task 2.3: Create DELETE /api/reservations/[listingId] route
Create the dynamic route for releasing a single reservation. Parse `listingId` from params (async `context.params` pattern from Next.js 15+). Call `releaseReservationServer(user.id, listingId)`. Return `{ success: true }`. Map "not found" errors to 404. Requires auth.

**Files:** `src/app/api/reservations/[listingId]/route.ts`
**AC:** DELETE releases specific reservation and sets listing back to active; returns 404 if reservation not found; returns 401 for unauthenticated requests
**Expert Domains:** supabase, nextjs

### Task 2.4: Create PATCH /api/reservations/[listingId] route
Add the PATCH handler to the `[listingId]` route file created in Task 2.3. Parse `{ minutes: number }` from body, validate `minutes > 0 && minutes <= 10`. Call `extendReservationServer(user.id, listingId, minutes)`. Return the updated reservation. Map "already extended" to 409, "not found" to 404. Requires auth.

**Files:** `src/app/api/reservations/[listingId]/route.ts`
**AC:** PATCH extends reservation by specified minutes; rejects minutes > 10; returns 409 if already extended; returns 404 if reservation not found
**Expert Domains:** supabase, nextjs

### Task 2.5: Create GET /api/reservations/check/[listingId] route
Create the public check route. No auth required — do not call `getUser()`. Call `isListingReservedServer(listingId)`. Return `{ reserved: boolean }` (omit `reservedBy` and `reservedUntil` from the public response for privacy). Use standard cache headers (no `AUTH_CACHE_HEADERS` since this is public).

**Files:** `src/app/api/reservations/check/[listingId]/route.ts`
**AC:** GET returns `{ reserved: boolean }` without requiring authentication; does not expose who reserved the listing
**Expert Domains:** supabase, nextjs

## Phase 3: Client Services and Tanstack Query Hooks
**Goal:** Create client-side fetch wrappers and Tanstack Query hooks that downstream features (cart, listing detail, checkout) will consume.
**Verify:** `pnpm build`

### Task 3.1: Create client-side reservation service
Create thin client-side service wrappers using the `get`, `post`, `del`, `patch` helpers from `@/libs/fetch`, following the exact pattern of `src/features/cart/services/cart.ts`.

Functions:
- `reserveListings(listingIds: string[])` — POST `/api/reservations`
- `getActiveReservations()` — GET `/api/reservations`
- `releaseAllReservations()` — DELETE `/api/reservations`
- `releaseReservation(listingId: string)` — DELETE `/api/reservations/{listingId}`
- `extendReservation(listingId: string, minutes: number)` — PATCH `/api/reservations/{listingId}`
- `checkReservation(listingId: string)` — GET `/api/reservations/check/{listingId}`

**Files:** `src/features/reservations/services/reservation.ts`
**AC:** All 6 functions implemented as typed fetch wrappers; return types match the API response shapes; no direct Supabase usage
**Expert Domains:** nextjs

### Task 3.2: Create Tanstack Query hooks
Create hooks following the pattern in `src/features/cart/hooks/use-cart.ts`. Use `useAuth()` from `@/features/auth/context` for user-scoped query keys.

Hooks:
- `useActiveReservations()` — `useQuery` with key `['reservations', userId]`, enabled when authenticated. Short `staleTime` (10s) since reservations are time-sensitive.
- `useReserveListings()` — `useMutation` calling `reserveListings`. On settled, invalidate `['reservations', userId]` and `['cart', userId]` (cart UI needs to reflect reserved state).
- `useReleaseReservation()` — `useMutation` calling `releaseReservation`. Optimistic removal from cached reservations array. On settled, invalidate `['reservations', userId]` and `['cart', userId]`.
- `useReleaseAllReservations()` — `useMutation` calling `releaseAllReservations`. Optimistic: set cached reservations to empty array. On settled, invalidate both keys.
- `useExtendReservation()` — `useMutation` calling `extendReservation`. On settled, invalidate `['reservations', userId]`.
- `useCheckReservation(listingId)` — `useQuery` with key `['reservation-check', listingId]`, no auth required (enabled when `listingId` is truthy). Short `staleTime` (15s).

**Files:** `src/features/reservations/hooks/use-reservations.ts`
**AC:** All 6 hooks implemented; query keys are user-scoped where auth is required; mutations invalidate related query keys including cart; `useCheckReservation` works without authentication; optimistic updates on release mutations with rollback on error
**Expert Domains:** state-management, nextjs

### Task 3.3: Update barrel exports and finalize
Update `src/features/reservations/index.ts` to export all client services and hooks added in this phase. Verify the complete feature compiles.

**Files:** `src/features/reservations/index.ts`
**AC:** All types, server services, client services, and hooks are exported from the barrel; `pnpm build` passes; `pnpm typecheck` passes; `pnpm lint` passes
**Expert Domains:** nextjs
