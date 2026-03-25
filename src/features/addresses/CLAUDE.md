# Addresses Feature

## Overview

Saved shipping addresses for authenticated buyers — store and reuse up to 5 addresses for faster checkout. Full CRUD operations with a single default address per user. The 5-address cap is enforced at both the server service layer (for user-friendly error messages) and via a database trigger (as a hard constraint).

## Architecture

- **types/address.ts** — Database-derived types: `Address` (Row), `AddressInsert`, `AddressUpdate`, `AddressFormData`, `MAX_ADDRESSES = 5`
- **validations/address.ts** — Yup schema validating: `label` (max 50 chars), `line1` / `line2` (max 100 chars), `city` (max 50 chars), `state` (2-char US code from `US_STATES`), `zip` (5-digit or 5+4 format), `is_default` (boolean)
- **services/address-server.ts** — Server-side Supabase queries: `getAddressesServer`, `getAddressServer`, `createAddressServer` (enforces 5-cap before insert), `updateAddressServer`, `deleteAddressServer` (auto-promotes next address to default when deleted was default), `getDefaultAddressServer`
- **services/address.ts** — Client-side fetch wrappers calling API routes: `getAddresses`, `createAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`
- **hooks/use-addresses.ts** — Tanstack Query hooks for address data fetching and mutations with optimistic updates. See Hooks table below.

## Database Schema

### addresses table

| Column     | Type         | Notes                               |
| ---------- | ------------ | ----------------------------------- |
| id         | uuid         | Primary key                         |
| user_id    | uuid         | FK → members.id (ON DELETE CASCADE) |
| label      | text         | Display name (e.g. "Home", "Work")  |
| line1      | text         | Street address line 1               |
| line2      | text \| null | Street address line 2 (optional)    |
| city       | text         | City name                           |
| state      | text         | 2-char US state code                |
| zip        | text         | 5-digit or 5+4 ZIP code             |
| is_default | boolean      | Default NOW() false                 |
| created_at | timestamptz  | Default NOW()                       |
| updated_at | timestamptz  | Auto-updated by trigger             |

**Constraints:** UNIQUE(user_id, label) — one label per user.

**Triggers:**

- `enforce_max_addresses` — hard 5-address cap per user
- `ensure_single_default` — atomically clears other defaults when a new default is set
- `handle_addresses_updated_at` — updates `updated_at` on every row change

**RLS:** 4 policies (SELECT, INSERT, UPDATE, DELETE) all scoped to `user_id = auth.uid()`.

## API Routes

| Method | Route                         | Handler               | Description                                                |
| ------ | ----------------------------- | --------------------- | ---------------------------------------------------------- |
| GET    | `/api/addresses`              | `getAddressesServer`  | List all addresses for the authenticated user              |
| POST   | `/api/addresses`              | `createAddressServer` | Create a new address (validates body, enforces 5-cap)      |
| PUT    | `/api/addresses/[id]`         | `updateAddressServer` | Update an existing address                                 |
| DELETE | `/api/addresses/[id]`         | `deleteAddressServer` | Delete address; promotes next address to default if needed |
| PATCH  | `/api/addresses/[id]/default` | `updateAddressServer` | Set address as the user's default                          |

## Hooks

| Hook                     | Query Key               | Purpose                    | Optimistic                                                 |
| ------------------------ | ----------------------- | -------------------------- | ---------------------------------------------------------- |
| `useAddresses()`         | `['addresses', userId]` | List all saved addresses   | —                                                          |
| `useCreateAddress()`     | mutation                | Create a new address       | —                                                          |
| `useUpdateAddress()`     | mutation                | Update an existing address | —                                                          |
| `useDeleteAddress()`     | mutation                | Delete an address          | Yes — removes from cache, rollback on error                |
| `useSetDefaultAddress()` | mutation                | Set address as default     | Yes — updates is_default flags in cache, rollback on error |

**Query key convention:** `['addresses', userId]` is user-scoped. All mutations invalidate this key in `onSettled`.

## Key Patterns

- **5-cap enforcement** — `createAddressServer` counts existing addresses before inserting and returns a user-friendly error when at capacity. The DB trigger `enforce_max_addresses` acts as a hard backstop.
- **Default promotion on delete** — When the deleted address was the default, `deleteAddressServer` promotes the next address (ordered by `created_at`) to default so users always have a default when addresses remain.
- **Atomic default switching** — The DB trigger `ensure_single_default` handles the BEFORE INSERT/UPDATE case, clearing all other `is_default = true` rows for the user atomically so the application never needs two separate queries.
- **US_STATES shared config** — The state validation enum imports from `@/features/listings/config/us-states.ts` — do not duplicate the list.
- **Server client** — Uses `@/libs/supabase/server` (not admin client), matching the listings and cart service patterns.
- **Client services** — Thin `@/libs/fetch` wrappers calling `/api/addresses/*` routes. No direct Supabase usage on the client.

## Related Features

- `src/features/members/` — `user_id` FK ties addresses to the authenticated member
- `src/features/cart/` — Future checkout integration will consume the default address for shipping
