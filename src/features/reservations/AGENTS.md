# Reservations Feature

## Overview

Reservations provide checkout-time inventory locking for 1-of-1 listings. When a buyer initiates checkout, the listings in their cart are reserved for 10 minutes (TTL), preventing concurrent purchases by other buyers. If checkout is not completed within the TTL, the reservation expires automatically and the listing status reverts to `active`. Reservations are created atomically per listing — partial success is supported, meaning some listings may reserve while others fail (e.g., if another buyer reserved first).

## Architecture

- **types/reservation.ts** — Database-derived types: `Reservation`, `ReservationInsert`, `ReservationWithListing`, `ReservationResult`, `ReservationCheck`
- **services/reservation-server.ts** — Server-side Supabase queries using the admin client for listing status mutations. Called by API route handlers only.
- **services/reservation.ts** — Client-side fetch wrappers calling API routes via `@/libs/fetch` helpers.
- **hooks/use-reservations.ts** — Tanstack Query hooks for reservation state and mutations.

## Database Schema

### `reservations` table

| Column           | Type        | Constraints                                                    |
| ---------------- | ----------- | -------------------------------------------------------------- |
| `id`             | UUID        | PK, `gen_random_uuid()`                                        |
| `listing_id`     | UUID        | NOT NULL, FK `listings(id) ON DELETE CASCADE`, UNIQUE (1-to-1) |
| `reserved_by`    | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`                   |
| `reserved_until` | TIMESTAMPTZ | NOT NULL — expiry timestamp (created_at + 10 minutes)          |
| `created_at`     | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                                      |

**Constraints:**

- `UNIQUE (listing_id)` — only one active reservation per listing at a time (enforced by `isOneToOne: true` FK relationship)

**RLS Policies:**

| Policy                            | Operation | Roles         | Rule                                              |
| --------------------------------- | --------- | ------------- | ------------------------------------------------- |
| Users can view own reservations   | SELECT    | authenticated | `USING (reserved_by = auth.uid())`                |
| Service role manages reservations | ALL       | service_role  | Unrestricted — used by admin client in API routes |

**FK Relationships:**

- `reservations.listing_id` → `listings.id` ON DELETE CASCADE (one-to-one)
- `reservations.reserved_by` → `members.id` ON DELETE CASCADE

**Listing status transitions:**

When a reservation is created, the associated listing status is updated from `active` → `reserved` (requires admin client to bypass RLS). When a reservation expires or is released, status reverts to `active`.

### `release_expired_reservations()` RPC

```sql
-- Returns: void
-- Deletes all reservations where reserved_until < now()
-- and reverts associated listing statuses to 'active'
SELECT release_expired_reservations();
```

Registered in database types as:

```ts
release_expired_reservations: {
  Args: never;
  Returns: undefined;
}
```

**Invocation strategy (two-layer):**

1. **pg_cron** (primary) — Scheduled to run every minute via `pg_cron`. Cleans up expired reservations directly in the database without an HTTP round trip.
2. **Application-layer fallback** — `cleanup-before-read` pattern: reservation service calls `release_expired_reservations()` before any read operation (e.g., `getReservationStatus`). Ensures correctness even if pg_cron is delayed or disabled.

## Key Patterns

- **Admin client for status mutations** — Listing status changes (`active` → `reserved` and back) are performed using the Supabase admin client (`@/libs/supabase/admin`) because the server client cannot bypass RLS to update listings owned by other users. Reservation creation and status revert are always paired in the same server function.
- **Cleanup-before-read** — Before checking reservation status, `release_expired_reservations()` RPC is called to flush any expired rows. This prevents stale `reserved` states from blocking checkout.
- **Max-1-extension** — A reservation may be extended once (refreshing `reserved_until` to now + 10 minutes). Subsequent extension attempts return an error. Extension resets are tracked in application logic, not the database schema.
- **Partial reservation support** — `ReservationResult` separates successful reservations (`reserved[]`) from failures (`failed[]`). The checkout flow proceeds with the successfully reserved subset; the buyer is shown which items couldn't be reserved and why (`already_reserved`, `sold`, `not_active`).
- **Atomic per-listing** — Each listing is reserved independently. There is no transaction across multiple listings — partial success is expected and handled by the UI.

## Service Functions

### Server (`src/features/reservations/services/reservation-server.ts`)

Uses admin client (`@/libs/supabase/admin`) for listing status mutations. Uses server client (`@/libs/supabase/server`) for read operations. Called by API route handlers only.

| Function                           | Signature                                              | Description                                                                                              |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `cleanupExpiredReservationsServer` | `() => Promise<void>`                                  | Calls `release_expired_reservations()` RPC; best-effort, logs errors without throwing                    |
| `reserveListingsServer`            | `(userId, listingIds) => Promise<ReservationResult>`   | Reserves each listing atomically; updates listing status to `reserved`; returns reserved + failed arrays |
| `releaseReservationServer`         | `(userId, listingId) => Promise<void>`                 | Deletes a single reservation; reverts listing status to `active`                                         |
| `releaseAllReservationsServer`     | `(userId) => Promise<void>`                            | Releases all of a user's active reservations (e.g., on cart clear or checkout abandonment)               |
| `getActiveReservationsServer`      | `(userId) => Promise<ReservationWithListing[]>`        | Cleanup-before-read; returns user's reservations joined with listing data                                |
| `extendReservationServer`          | `(userId, listingId, minutes) => Promise<Reservation>` | Extends `reserved_until` by N minutes (max 10, once per reservation); errors if already extended         |
| `isListingReservedServer`          | `(listingId) => Promise<ReservationCheck>`             | Cleanup-before-read; returns reservation status with optional reservedBy/reservedUntil                   |

### Client (`src/features/reservations/services/reservation.ts`)

Thin fetch wrappers using `@/libs/fetch` (`get`, `post`, `del`, `patch`). Called by Tanstack Query hooks.

| Function                 | HTTP                                      | Returns                    |
| ------------------------ | ----------------------------------------- | -------------------------- |
| `reserveListings`        | `POST /api/reservations`                  | `ReservationResult`        |
| `getActiveReservations`  | `GET /api/reservations`                   | `ReservationWithListing[]` |
| `releaseAllReservations` | `DELETE /api/reservations`                | `{ success: boolean }`     |
| `releaseReservation`     | `DELETE /api/reservations/{listingId}`    | `{ success: boolean }`     |
| `extendReservation`      | `PATCH /api/reservations/{listingId}`     | `Reservation`              |
| `checkReservation`       | `GET /api/reservations/check/{listingId}` | `ReservationCheck`         |

## Hooks

| Hook                             | Query Key                               | Purpose                                                     | Optimistic                                       |
| -------------------------------- | --------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `useActiveReservations()`        | `['reservations', userId]`              | Fetch user's active reservations with listing data          | —                                                |
| `useReserveListings()`           | mutation, invalidates reservations+cart | Reserve one or more listings at checkout initiation         | No                                               |
| `useReleaseReservation()`        | mutation, invalidates reservations+cart | Release a specific reservation                              | Yes — filters item from cache, rollback on error |
| `useReleaseAllReservations()`    | mutation, invalidates reservations+cart | Release all user reservations                               | Yes — sets empty array, rollback on error        |
| `useExtendReservation()`         | mutation, invalidates reservations      | Extend TTL by N minutes (max once per reservation)          | No                                               |
| `useCheckReservation(listingId)` | `['reservation-check', listingId]`      | Check if a listing is currently reserved (no auth required) | —                                                |

**Query key convention:** User-scoped queries use `['reservations', userId]`. Public checks use `['reservation-check', listingId]`. `staleTime` is 10s for reservations and 15s for checks (shorter than the 60s global default due to time-sensitivity).

**Invalidation strategy:** Mutations that modify reservations invalidate both `['reservations', userId]` and `['cart', userId]` in `onSettled` — cart UI needs to reflect reservation state changes.

## API Routes

| Method | Route                                 | Auth Required | Status Codes            | Description                                                                    |
| ------ | ------------------------------------- | ------------- | ----------------------- | ------------------------------------------------------------------------------ |
| POST   | `/api/reservations`                   | Yes           | 200/400/401/500         | Reserve one or more listings; returns `ReservationResult` with partial success |
| GET    | `/api/reservations`                   | Yes           | 200/401/500             | Get user's active reservations with listing data                               |
| DELETE | `/api/reservations`                   | Yes           | 200/401/500             | Release all of user's active reservations                                      |
| DELETE | `/api/reservations/[listingId]`       | Yes           | 200/401/404/500         | Release a specific reservation and revert listing to active                    |
| PATCH  | `/api/reservations/[listingId]`       | Yes           | 200/400/401/404/409/500 | Extend reservation TTL by N minutes (max 10, max once)                         |
| GET    | `/api/reservations/check/[listingId]` | No            | 200/500                 | Check if a listing is currently reserved (`{ reserved: boolean }`)             |

**Route files:**

- `src/app/api/reservations/route.ts` — POST (create), GET (list), DELETE (release all)
- `src/app/api/reservations/[listingId]/route.ts` — DELETE (release one), PATCH (extend)
- `src/app/api/reservations/check/[listingId]/route.ts` — GET (public status check)

## Related Features

- `src/features/cart/` — Cart items are the source of `listingIds` passed to `reserveListings` at checkout initiation. Cart validation runs before reservation to remove sold/deleted items.
- `src/features/listings/` — `listing_status` enum includes `'reserved'`; reservation service mutates listing status. Listing detail page shows "Reserved" badge when `status === 'reserved'`.
- `src/features/orders/` — A successful checkout (all listings reserved + payment confirmed) transitions listing status from `reserved` → `sold` and creates order rows. If payment fails, reservations are released.

## Directory Structure

```
src/features/reservations/
├── AGENTS.md
├── types/
│   └── reservation.ts          # Reservation, ReservationInsert, ReservationWithListing, ReservationResult, ReservationCheck
├── services/
│   ├── reservation-server.ts   # Server-side Supabase queries (admin client for status mutations)
│   └── reservation.ts          # Client-side fetch wrappers
└── hooks/
    └── use-reservations.ts     # Tanstack Query hooks for status checks and mutations

src/app/api/reservations/
├── route.ts                    # POST (create), GET (list), DELETE (release all)
├── [listingId]/
│   └── route.ts                # DELETE (release one), PATCH (extend)
└── check/
    └── [listingId]/
        └── route.ts            # GET (public status check)
```
