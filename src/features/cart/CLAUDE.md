# Cart Feature

## Overview

The cart provides authenticated users with a persistent shopping cart backed by the `cart_items` database table. Items are capped at 25 per user, expire after 30 days, and snapshot the listing price at the time of addition for price-change detection. Guest users use a localStorage-based cart that merges into the authenticated cart on login.

## Architecture

- **types/cart.ts** — Database-derived types: `CartItem`, `CartItemInsert`, `CartItemWithListing`, `GuestCartItem`, `CartValidationResult`
- **services/cart.ts** — Client-side service functions calling API routes via `@/libs/fetch` helpers (`getCart`, `getCartCount`, `addToCart`, `removeFromCart`, `clearCart`, `validateCart`, `refreshExpiry`, `mergeGuestCart`)
- **services/cart-server.ts** — Server-side Supabase queries with validation logic: `getCartServer`, `getCartCountServer`, `addToCartServer`, `removeFromCartServer`, `clearCartServer`, `validateCartServer`, `mergeGuestCartServer`, `refreshExpiryServer`
- **utils/guest-cart.ts** — Pure localStorage utility functions for guest cart: `getGuestCart`, `getGuestCartCount`, `addToGuestCart` (returns `'added' | 'full' | 'duplicate'`), `removeFromGuestCart`, `clearGuestCart`, `isInGuestCart`, plus `subscribe` for `useSyncExternalStore` integration (listens to `storage` events filtered by key + custom `nessi_cart_change` event)
- **hooks/use-guest-cart.ts** — `useGuestCart()` React hook using `useSyncExternalStore` for hydration-safe localStorage access. Returns `{ items, count, add, remove, clear, isInCart }`. SSR-safe (empty cart on server). Cross-tab sync via `storage` event, same-tab reactivity via custom event.
- **hooks/use-cart.ts** — Tanstack Query hooks for authenticated cart data fetching and mutations with optimistic updates. See Hooks table below.

## Database Schema

### cart_items table

| Column       | Type         | Notes                                             |
| ------------ | ------------ | ------------------------------------------------- |
| id           | uuid         | Primary key                                       |
| user_id      | uuid         | FK → members.id (ON DELETE CASCADE)               |
| listing_id   | uuid         | FK → listings.id (ON DELETE CASCADE)              |
| price_at_add | integer      | Snapshot of listing price in cents at add time    |
| added_from   | text \| null | Source context (e.g., "listing_detail", "search") |
| added_at     | timestamptz  | Default NOW()                                     |
| expires_at   | timestamptz  | Default NOW() + 30 days                           |

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
- **Cart validation** — `validateCartServer` categorizes items into `valid`, `removed` (with reason: sold/deleted/expired/deactivated), and `priceChanged` (with old/new prices). Called before checkout. The three arrays are mutually exclusive — `priceChanged` items are still purchasable but require user acknowledgment. Downstream consumers (checkout) should treat `valid + priceChanged` (after acknowledgment) as the purchasable set. The `'expired'` reason exists for forward-compatibility; expired items are currently hard-deleted by the DB cleanup trigger before they reach validation.
- **Guest merge** — `mergeGuestCartServer` treats all guest data as untrusted: validates UUID format, re-fetches listings from DB, ignores guest-provided prices, skips invalid/own/duplicate items, and respects the 25-item cap.
- **Server client** — Uses `@/libs/supabase/server` (not admin client), matching the listings service pattern.
- **Client services** — Thin `@/libs/fetch` wrappers calling future `/api/cart/*` routes. No direct Supabase usage on client.

## Hooks

| Hook                  | Query Key                       | Purpose                                                  | Optimistic                                                         |
| --------------------- | ------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `useCart()`           | `['cart', userId]`              | Full cart with listing + seller data                     | —                                                                  |
| `useCartCount()`      | `['cart-count', userId]`        | Lightweight count for badge                              | —                                                                  |
| `useAddToCart()`      | mutation, invalidates both keys | Add item to cart                                         | Yes — increments count, rollback on error                          |
| `useRemoveFromCart()` | mutation, invalidates both keys | Remove item from cart                                    | Yes — filters item from cache, decrements count, rollback on error |
| `useClearCart()`      | mutation, invalidates both keys | Clear entire cart                                        | Yes — sets empty cart and zero count, rollback on error            |
| `useValidateCart()`   | mutation (no invalidation)      | Pre-checkout validation                                  | No — server is source of truth                                     |
| `useMergeGuestCart()` | mutation, invalidates both keys | Merge guest cart on login                                | No — calls `clearGuestCart()` on success                           |
| `useRefreshExpiry()`  | mutation, invalidates cart key  | Reset item expiry timer                                  | No                                                                 |
| `useCartBadgeCount()` | wrapper (no own key)            | Unified badge count for auth + guest                     | — returns DB count when auth'd, guest count when not               |
| `useCartMerge()`      | side-effect (no own key)        | Detects login transition, merges guest cart, shows toast | — fire-and-forget, wired into Navbar                               |

**Query key convention:** Both `['cart', userId]` and `['cart-count', userId]` are user-scoped. All mutations that modify cart contents invalidate both keys in `onSettled`.

**`useCartBadgeCount` pattern:** Calls `useCartCount()` and `useGuestCart()` unconditionally to satisfy rules of hooks. `useCartCount` is gated by `enabled: !!userId`; `useGuestCart` is always active but its value is only used for guest users. Returns `0` while auth is loading.

## Guest Cart

The guest cart enables unauthenticated users to add items to a localStorage-backed cart that merges into the database cart on login.

- **localStorage key:** `nessi_cart` — stores `GuestCartItem[]` as JSON
- **25-item cap** — enforced in `addToGuestCart`, returns `'full'` when at capacity
- **Duplicate prevention** — same `listingId` cannot appear twice, returns `'duplicate'`
- **Hydration safety** — `useGuestCart()` uses `useSyncExternalStore` with server snapshot returning empty array
- **Cross-tab sync** — `subscribe` listens to `StorageEvent` filtered by `nessi_cart` key
- **Same-tab reactivity** — mutating functions dispatch `nessi_cart_change` custom event
- **Snapshot stability** — Hook caches snapshot reference via JSON.stringify comparison to prevent infinite re-renders

## Components

### CartIcon

`components/cart-icon/index.tsx` — Client component (`'use client'`) that renders a linked shopping bag icon with a badge count overlay. Integrated into the navbar at `src/components/navigation/navbar/index.tsx`.

**Props:** None — reads count internally via `useCartBadgeCount()`.

**Behavior:**

- Links to `/cart` via Next.js `<Link>`
- Badge shows item count when > 0, hidden when count is 0
- `aria-label` dynamically reflects count: "Cart, X items" or "Cart"
- Badge uses accent color tokens, 44x44px minimum tap target (WCAG)
- Visible to all users (auth, guest, member context, shop context)

### AddToCartButton

`components/add-to-cart-button/index.tsx` — Client component (`'use client'`) that renders the add-to-cart action with full state management for both authenticated and guest users.

**Props:**

| Prop            | Type             | Default  | Description                                        |
| --------------- | ---------------- | -------- | -------------------------------------------------- |
| `listingId`     | `string`         | required | Listing to add                                     |
| `priceCents`    | `number`         | required | Current listing price (for guest cart snapshot)    |
| `currentUserId` | `string \| null` | required | Logged-in user ID (null for guests)                |
| `sellerId`      | `string`         | required | Listing owner — hidden when equals `currentUserId` |
| `fullWidth`     | `boolean`        | `true`   | Whether button fills container width               |

**State machine:**

| State           | Render                                           |
| --------------- | ------------------------------------------------ |
| Default         | "Add to Cart" secondary outline button           |
| Loading         | Disabled button with spinner, `aria-busy="true"` |
| Already in cart | "In Your Cart" muted link to `/cart`             |
| Own listing     | `null` (hidden)                                  |

**Toast feedback:**

| Outcome        | Toast type  | Message                     |
| -------------- | ----------- | --------------------------- |
| Success        | `'success'` | "Added to cart"             |
| Cart full (25) | `'error'`   | "Cart is full (25 items)"   |
| Error          | `'error'`   | Error message from mutation |

**Code paths:**

- **Authenticated:** Uses `useAddToCart()` mutation with `addedFrom: 'listing_detail'`. Checks `useCart()` data for "already in cart".
- **Guest:** Uses `useGuestCart().add()` returning `'added' | 'full' | 'duplicate'`. Checks `useGuestCart().isInCart()` for "already in cart".

**Integration points:**

- Listing detail action buttons section (full width)
- Listing detail sticky bottom bar (natural width beside price)

### CartItemCard

`components/cart-item-card/index.tsx` — Client component displaying a cart item as a horizontal card: 80px thumbnail, title link, condition badge, price with change detection, and remove button.

**Props:** `item: CartItemWithListing`, `onRemove: (cartItemId: string) => void`, `isRemoving?: boolean`

**Features:**

- Price change notice: old price struck through + "Price changed" warning pill when `price_at_add !== listing.price_cents`
- Remove button: `aria-label="Remove {title} from cart"`, 44x44px minimum tap target (WCAG)
- All images via `next/image` with `sizes="80px"`

### CartSummary

`components/cart-summary/index.tsx` — Order summary card: item count, subtotal, shipping placeholder, disclaimer, disabled checkout button (MVP), clear cart action.

**Props:** `itemCount: number`, `subtotalCents: number`, `onClearCart: () => void`, `isClearing?: boolean`

### Cart Page

`src/app/(frontend)/cart/` — Full cart page at `/cart`:

- **page.tsx** — Server component with `{ title: 'Your Cart' }` metadata
- **cart-page.tsx** — Client component orchestrating all cart states:
  - Loading: skeleton placeholders matching cart layout
  - Empty: centered icon + "Your cart is empty" + "Start Shopping" CTA
  - Authenticated: items grouped by seller (header with 32px avatar + name + profile link), two-column layout at lg+, sticky sidebar summary, mobile sticky checkout bar
  - Guest: minimal item list with "Sign in to checkout" CTA
  - Stale items: auto-removal on mount + dismissible banner with per-item reasons

## Related Features

- `src/features/listings/` — Listing entity; `listing_id` FK on cart items, listing types used for JOIN
- `src/features/context/` — Active member/shop context; determines seller identity for "not own listing" check
- `src/features/members/` — User identity; `user_id` FK on cart items
