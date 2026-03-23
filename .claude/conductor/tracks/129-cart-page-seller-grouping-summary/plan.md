# Implementation Plan: #129 — Cart Page with Seller Grouping and Summary

## Overview
3 phases, 9 total tasks
Estimated scope: medium

## Key Discovery

The existing `CartItemWithListing` type includes `seller_id`, `member_id`, and `shop_id` from the listing join, but does NOT include seller profile data (name, avatar, slug) needed for seller grouping headers. The `getCartServer` query joins `listings(title, price_cents, cover_photo_url, status, seller_id, member_id, shop_id, listing_photos(*))` but does not join `members` or `shops` tables. The cart page needs seller identity resolution to display grouped headers with avatar, name, and profile link.

Two approaches: (A) extend the server query to join seller data, or (B) resolve seller identities client-side. Approach A is cleaner — extend `getCartServer` and `CartItemWithListing` to include seller profile data via nested joins, matching the pattern in `getListingWithSellerServer`.

## Phase 1: Extend Cart Types and Server Layer for Seller Data
**Goal:** Extend the cart data layer so cart items include seller identity information needed for grouping.
**Verify:** `pnpm typecheck && pnpm build`

### Task 1.1: Extend CartItemWithListing type to include seller identity
Add a `seller` field to `CartItemWithListing` that carries the `SellerIdentity` type (reused from `@/features/listings/types/listing`). This gives the cart page the seller name, avatar, slug, and type needed for grouping headers. Also add a `CartSellerGroup` type for the grouped data structure the UI will consume.
**Files:** `src/features/cart/types/cart.ts`
**AC:** `CartItemWithListing` has a `seller: SellerIdentity | null` field. A new `CartSellerGroup` type exists with `seller: SellerIdentity | null`, `items: CartItemWithListing[]`, and `subtotalCents: number` fields. Types import cleanly with no circular dependencies.
**Expert Domains:** state-management

### Task 1.2: Extend getCartServer to resolve seller identities
Modify `getCartServer` in `cart-server.ts` to resolve seller identity for each cart item, following the same pattern used in `getListingWithSellerServer` (check `shop_id` first, fall back to `member_id`/`seller_id`). Batch unique seller/shop IDs to avoid N+1 queries — fetch all unique member IDs and shop IDs in two bulk queries, then attach to items.
**Files:** `src/features/cart/services/cart-server.ts`
**AC:** `getCartServer` returns `CartItemWithListing[]` where each item has a populated `seller` field with name, avatar, slug, and type. Seller resolution is batched (at most 2 extra queries regardless of cart size). Existing API route at `src/app/api/cart/route.ts` returns the enriched data without changes.
**Expert Domains:** supabase

### Task 1.3: Add cart grouping utility function
Create a utility function `groupCartBySeller` that takes `CartItemWithListing[]` and returns `CartSellerGroup[]`. Group items by seller identity key (`shop:{shop_id}` or `member:{seller_id}`). Calculate per-group subtotal in cents. Maintain item order within groups.
**Files:** `src/features/cart/utils/group-cart.ts`
**AC:** Function groups items correctly by seller identity. Items with the same `shop_id` are grouped together; items with null `shop_id` and same `seller_id` are grouped together. Each group has a correct `subtotalCents` sum of `listing.price_cents`. Empty input returns empty array.
**Expert Domains:** state-management

## Phase 2: Cart Page Route and Core Components
**Goal:** Create the cart page route, cart item card, and cart summary components with full layout.
**Verify:** `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm build`

### Task 2.1: Create cart page server component with metadata
Create the `/cart` route with a server component that exports static metadata (`{ title: 'Your Cart' }`) and renders the client-side `CartPage` component. Follow the pattern from `src/app/(frontend)/listing/[id]/page.tsx` — simple server component that delegates to a `'use client'` component.
**Files:** `src/app/(frontend)/cart/page.tsx`
**AC:** `/cart` route exists and renders. Page title resolves to "Your Cart | Nessi" via the template. Server component imports and renders `CartPage` client component.
**Expert Domains:** nextjs

### Task 2.2: Create CartItemCard component
Build the cart item card component displaying: 80px square thumbnail via `next/image` with `sizes="80px"`, title as link to `/listing/{id}`, formatted price via `formatPrice`, condition badge (reuse `ConditionBadge` from `@/features/listings/components/condition-badge/`), remove button (X icon top-right using `HiOutlineX` from `react-icons/hi`), and price change notice (old price struck through with "Price changed" warning pill when `price_at_add` differs from current `listing.price_cents`). Mobile-first SCSS.
**Files:** `src/features/cart/components/cart-item-card/index.tsx`, `src/features/cart/components/cart-item-card/cart-item-card.module.scss`
**Reuses:** `src/features/listings/components/condition-badge/`, `src/components/indicators/pill/`, `src/components/controls/button/`
**AC:** Card renders thumbnail, title link, price, condition badge. Remove button calls `onRemove` callback. Price change notice appears when `priceAtAdd !== listing.price_cents` showing old price struck through and a "Price changed" warning pill. All images use `next/image` with `sizes="80px"`. Remove button has `aria-label="Remove {title} from cart"`.
**Expert Domains:** nextjs, scss

### Task 2.3: Create CartSummary component
Build the cart summary component showing: item count, subtotal (sum of current `listing.price_cents` values), "Shipping: calculated at checkout" placeholder text, "Items in your cart are not reserved and may sell before checkout" disclaimer, disabled "Proceed to Checkout" button (MVP — checkout is #30), and "Clear Cart" text button. Accept `itemCount`, `subtotalCents`, `onClearCart`, and `isClearing` props.
**Files:** `src/features/cart/components/cart-summary/index.tsx`, `src/features/cart/components/cart-summary/cart-summary.module.scss`
**Reuses:** `src/components/controls/button/`
**AC:** Summary displays correct item count and formatted subtotal. "Proceed to Checkout" button is visually present but disabled with `aria-disabled`. "Clear Cart" triggers `onClearCart` callback. Disclaimer text is visible. Shipping line shows "Calculated at checkout". Mobile-first styles.
**Expert Domains:** scss

### Task 2.4: Build CartPage client component with seller grouping, states, and layout
Create the main `CartPage` client component orchestrating: auth check via `useAuth()`, cart data via `useCart()`, guest cart via `useGuestCart()`, validation via `useValidateCart()` on mount, seller grouping via `groupCartBySeller()`, remove via `useRemoveFromCart()`, clear via `useClearCart()`. Implement all states: (1) loading skeleton, (2) empty cart with `HiOutlineShoppingCart` icon + "Your cart is empty" heading + "Start Shopping" CTA linking to `/`, (3) authenticated cart with items grouped by seller (seller header: 32px avatar + name + profile link, items listed under group, per-seller subtotal), (4) guest cart showing localStorage items with "Sign in to checkout" CTA, (5) stale item banner when validation returns removed items. Mobile layout: single column with sticky checkout bar. Desktop (lg+): two-column with sticky summary sidebar (left 70% items, right 30% summary).
**Files:** `src/app/(frontend)/cart/cart-page.tsx`, `src/app/(frontend)/cart/cart-page.module.scss`
**Reuses:** `src/features/cart/components/cart-item-card/`, `src/features/cart/components/cart-summary/`, `src/components/controls/button/`, `src/components/indicators/pill/`
**AC:** Auth'd user sees DB cart items grouped by seller with seller headers (avatar, name, link). Guest user sees localStorage items with "Sign in to checkout" CTA. Empty state shows icon, heading, subtext, and "Start Shopping" button. Remove button removes item with optimistic update. "Clear Cart" removes all items. Stale item banner appears when `useValidateCart` detects removed items. Cart summary shows correct count and subtotal. Mobile: single column layout. Desktop (lg+): two-column layout with sticky sidebar. All acceptance criteria from the issue are met.
**Expert Domains:** nextjs, scss, state-management

## Phase 3: Polish and Edge Cases
**Goal:** Finalize stale item handling, loading skeletons, accessibility, and verify all acceptance criteria pass.
**Verify:** `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm build`

### Task 3.1: Add stale item auto-removal and banner notification
When `useValidateCart()` returns `removed` items on page mount, auto-remove those stale items from the cart (call `removeFromCart` for each) and display a dismissible banner at the top of the page: "{X} item(s) were removed because they are no longer available" with per-item reasons (sold, deleted, deactivated). Use `role="status"` and `aria-live="polite"` for screen reader announcement.
**Files:** `src/app/(frontend)/cart/cart-page.tsx`, `src/app/(frontend)/cart/cart-page.module.scss`
**AC:** Stale items are automatically removed from the DB cart after validation. Banner shows count and reasons. Banner is dismissible. Screen readers announce the banner via `aria-live`. Banner disappears if user navigates away and returns with no stale items.
**Expert Domains:** nextjs, scss

### Task 3.2: Add loading skeleton state and sticky checkout bar for mobile
Add a skeleton loading state that mirrors the cart layout (seller group placeholders, item card placeholders, summary placeholder). Add a sticky bottom bar on mobile (below lg breakpoint) showing subtotal and the disabled "Proceed to Checkout" button, hidden on desktop where the sidebar summary is visible.
**Files:** `src/app/(frontend)/cart/cart-page.tsx`, `src/app/(frontend)/cart/cart-page.module.scss`
**AC:** Loading state shows skeleton placeholders matching the cart layout structure. Mobile sticky bar shows subtotal and checkout button at the bottom of the viewport. Sticky bar hides at lg+ breakpoint where the sidebar summary is visible. Skeleton disappears when cart data loads.
**Expert Domains:** scss, nextjs
