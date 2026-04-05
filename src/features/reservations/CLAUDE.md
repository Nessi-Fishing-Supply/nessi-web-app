# Reservations Feature

## Overview

Reservations provide checkout-time inventory locking for 1-of-1 listings. When a buyer initiates checkout, the listings in their cart are reserved for 10 minutes (TTL), preventing concurrent purchases by other buyers. If checkout is not completed within the TTL, the reservation expires automatically and the listing status reverts to `active`. Reservations are created atomically per listing — partial success is supported, meaning some listings may reserve while others fail (e.g., if another buyer reserved first).

## Architecture

- **types/reservation.ts** — Database-derived types: `Reservation`, `ReservationInsert`, `ReservationWithListing`, `ReservationResult`, `ReservationCheck`
- **services/reservation-server.ts** — Server-side Supabase queries using the admin client for listing status mutations. Called by API route handlers only.
- **services/reservation.ts** — Client-side fetch wrappers calling API routes via `@/libs/fetch` helpers.
- **hooks/use-reservation.ts** — Tanstack Query hooks for reservation state and mutations.

## Database Schema

### `reservations` table

| Column          | Type        | Constraints                                                       |
| --------------- | ----------- | ----------------------------------------------------------------- |
| `id`            | UUID        | PK, `gen_random_uuid()`                                           |
| `listing_id`    | UUID        | NOT NULL, FK `listings(id) ON DELETE CASCADE`, UNIQUE (1-to-1)   |
| `reserved_by`   | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`                      |
| `reserved_until`| TIMESTAMPTZ | NOT NULL — expiry timestamp (created_at + 10 minutes)             |
| `created_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                                         |

**Constraints:**

- `UNIQUE (listing_id)` — only one active reservation per listing at a time (enforced by `isOneToOne: true` FK relationship)

**RLS Policies:**

| Policy                               | Operation | Roles         | Rule                                            |
| ------------------------------------ | --------- | ------------- | ----------------------------------------------- |
| Users can view own reservations      | SELECT    | authenticated | `USING (reserved_by = auth.uid())`              |
| Service role manages reservations    | ALL       | service_role  | Unrestricted — used by admin client in API routes |

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
release_expired_reservations: { Args: never; Returns: undefined }
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

| Function                       | Signature                                                                 | Description                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `createReservationsServer`     | `(userId, listingIds) => Promise<ReservationResult>`                      | Reserves each listing atomically; updates listing status to `reserved`; returns reserved + failed arrays     |
| `releaseReservationsServer`    | `(userId, listingIds) => Promise<{ success: boolean }>`                   | Deletes reservations for the given listings owned by userId; reverts listing status to `active`             |
| `releaseAllReservationsServer` | `(userId) => Promise<{ success: boolean }>`                               | Releases all of a user's active reservations (e.g., on cart clear or checkout abandonment)                  |
| `getReservationStatusServer`   | `(listingId) => Promise<ReservationCheck>`                                | Calls `release_expired_reservations()` first; returns `{ reserved: boolean }` for the listing              |
| `extendReservationServer`      | `(userId, listingId) => Promise<{ reservedUntil: string }>`               | Extends `reserved_until` by 10 minutes (once per reservation); errors if already extended                   |

### Client (`src/features/reservations/services/reservation.ts`)

Thin fetch wrappers using `@/libs/fetch` (`get`, `post`, `del`, `patch`). Called by Tanstack Query hooks.

| Function                | HTTP                                              | Returns                |
| ----------------------- | ------------------------------------------------- | ---------------------- |
| `createReservations`    | `POST /api/reservations`                          | `ReservationResult`    |
| `releaseReservations`   | `DELETE /api/reservations`                        | `{ success: boolean }` |
| `getReservationStatus`  | `GET /api/reservations/[listingId]`               | `ReservationCheck`     |
| `extendReservation`     | `PATCH /api/reservations/[listingId]`             | `{ reservedUntil: string }` |

## Hooks

| Hook                         | Query Key                                   | Purpose                                                         | Optimistic |
| ---------------------------- | ------------------------------------------- | --------------------------------------------------------------- | ---------- |
| `useReservationStatus(id)`   | `['reservations', 'status', listingId]`     | Check if a listing is currently reserved                        | —          |
| `useCreateReservations()`    | mutation, invalidates `['reservations']`    | Reserve one or more listings at checkout initiation             | No         |
| `useReleaseReservations()`   | mutation, invalidates `['reservations']`    | Release specific reservations (e.g., removing item from checkout) | No       |
| `useExtendReservation()`     | mutation, invalidates reservation status key | Extend TTL by 10 minutes (max once per reservation)             | No         |

**Query key convention:** All reservation queries are namespaced under `['reservations']`. Status checks include the listing ID: `['reservations', 'status', listingId]`.

**Invalidation strategy:** After `createReservations` or `releaseReservations`, invalidate `['reservations']` broadly to refresh all status checks. Individual listing queries (`['listings', listingId]`) should also be invalidated so listing status badges update.

## API Routes

| Method | Route                             | Auth Required | Status Codes         | Description                                                              |
| ------ | --------------------------------- | ------------- | -------------------- | ------------------------------------------------------------------------ |
| POST   | `/api/reservations`               | Yes           | 200/400/401/500      | Reserve one or more listings; returns `ReservationResult` with partial success |
| DELETE | `/api/reservations`               | Yes           | 200/400/401/500      | Release reservations by listing IDs (JSON body: `{ listingIds: string[] }`) |
| GET    | `/api/reservations/[listingId]`   | No            | 200/500              | Check if a listing is currently reserved (`ReservationCheck`)            |
| PATCH  | `/api/reservations/[listingId]`   | Yes           | 200/400/401/403/500  | Extend the reservation TTL by 10 minutes (max once)                      |

**Route files:**

- `src/app/api/reservations/route.ts` — POST (create), DELETE (release)
- `src/app/api/reservations/[listingId]/route.ts` — GET (status check), PATCH (extend)

## Related Features

- `src/features/cart/` — Cart items are the source of `listingIds` passed to `createReservations` at checkout initiation. Cart validation runs before reservation to remove sold/deleted items.
- `src/features/listings/` — `listing_status` enum includes `'reserved'`; reservation service mutates listing status. Listing detail page shows "Reserved" badge when `status === 'reserved'`.
- `src/features/orders/` — A successful checkout (all listings reserved + payment confirmed) transitions listing status from `reserved` → `sold` and creates order rows. If payment fails, reservations are released.

## Directory Structure

```
src/features/reservations/
├── CLAUDE.md
├── types/
│   └── reservation.ts          # Reservation, ReservationInsert, ReservationWithListing, ReservationResult, ReservationCheck
├── services/
│   ├── reservation-server.ts   # Server-side Supabase queries (admin client for status mutations)
│   └── reservation.ts          # Client-side fetch wrappers
└── hooks/
    └── use-reservation.ts      # Tanstack Query hooks for status checks and mutations

src/app/api/reservations/
├── route.ts                    # POST (create), DELETE (release)
└── [listingId]/
    └── route.ts                # GET (status check), PATCH (extend)
```
