# Cart Feature

## Overview

The cart provides authenticated users with a persistent shopping cart backed by the `cart_items` database table. Items are capped at 25 per user, expire after 30 days, and snapshot the listing price at the time of addition for price-change detection. Guest users will use a localStorage-based cart (future ticket) that merges into the authenticated cart on login.

## Architecture

- **types/cart.ts** — Database-derived types: `CartItem`, `CartItemInsert`, `CartItemWithListing`, `GuestCartItem`, `CartValidationResult`
- **services/cart.ts** — Client-side service functions calling API routes via `@/libs/fetch` helpers (`getCart`, `getCartCount`, `addToCart`, `removeFromCart`, `clearCart`, `validateCart`, `refreshExpiry`)
- **services/cart-server.ts** — Server-side Supabase queries with validation logic: `getCartServer`, `getCartCountServer`, `addToCartServer`, `removeFromCartServer`, `clearCartServer`, `validateCartServer`, `mergeGuestCartServer`, `refreshExpiryServer`
- **utils/** — Reserved for guest cart localStorage utilities (future ticket)

## Database Schema

### cart_items table

| Column       | Type         | Notes                                          |
| ------------ | ------------ | ---------------------------------------------- |
| id           | uuid         | Primary key                                    |
| user_id      | uuid         | FK → members.id (ON DELETE CASCADE)            |
| listing_id   | uuid         | FK → listings.id (ON DELETE CASCADE)           |
| price_at_add | integer      | Snapshot of listing price in cents at add time  |
| added_from   | text \| null | Source context (e.g., "listing_detail", "search") |
| added_at     | timestamptz  | Default NOW()                                  |
| expires_at   | timestamptz  | Default NOW() + 30 days                        |

**Constraints:** UNIQUE(user_id, listing_id) — one item per listing per user.

**RLS:** Users can only read/write their own cart items. `expires_at` cleanup is handled by a database trigger.

## Validation Rules

Server-side validation enforced in `addToCartServer` and `mergeGuestCartServer`:

1. Listing exists and `status === 'active'`
2. Listing `seller_id !== current user` (cannot add own listing)
3. Not already in cart (checked before insert for a better error message than the DB unique constraint)
4. Cart size < 25 items
5. `price_at_add` is always snapshotted from the database `listing.price_cents`, never from client input

## Key Patterns

- **Price snapshot** — `price_at_add` captures the listing price at add time. `validateCartServer` compares this against current `listing.price_cents` to detect price changes.
- **Cart validation** — `validateCartServer` categorizes items into `valid`, `removed` (with reason: sold/deleted/expired/deactivated), and `priceChanged` (with old/new prices). Called before checkout.
- **Guest merge** — `mergeGuestCartServer` treats all guest data as untrusted: validates UUID format, re-fetches listings from DB, ignores guest-provided prices, skips invalid/own/duplicate items, and respects the 25-item cap.
- **Server client** — Uses `@/libs/supabase/server` (not admin client), matching the listings service pattern.
- **Client services** — Thin `@/libs/fetch` wrappers calling future `/api/cart/*` routes. No direct Supabase usage on client.

## Related Features

- `src/features/listings/` — Listing entity; `listing_id` FK on cart items, listing types used for JOIN
- `src/features/context/` — Active member/shop context; determines seller identity for "not own listing" check
- `src/features/members/` — User identity; `user_id` FK on cart items
