# Implementation Plan: #128 — Add to Cart button on listing detail page

## Overview

2 phases, 5 total tasks
Estimated scope: medium

## Phase 1: Create AddToCartButton component

**Goal:** Build the standalone AddToCartButton component with all button states (default, loading, already-in-cart, cart-full), supporting both authenticated and guest users, with full accessibility.
**Verify:** `pnpm build`

### Task 1.1: Create AddToCartButton component with all states

Create the `AddToCartButton` component that encapsulates all add-to-cart logic for both authenticated and guest users. The component accepts a `listingId`, `priceCents`, `currentUserId`, and `sellerId` to determine visibility and state. It uses `useAuth` to determine auth status, `useAddToCart()` for authenticated users, `useGuestCart()` for guests, and `useToast()` for success/error/full feedback. The "already in cart" state renders as a muted link to `/cart` instead of a button.

**Files:**

- `src/features/cart/components/add-to-cart-button/index.tsx` (new)
- `src/features/cart/components/add-to-cart-button/add-to-cart-button.module.scss` (new)

**AC:**

- Component renders "Add to Cart" button in default state
- Component renders "In Your Cart" with link to `/cart` when item is already in cart (checks `useCart` data for auth'd users, `useGuestCart().isInCart()` for guests)
- Component returns `null` when `currentUserId === sellerId` (own listing)
- Auth'd add calls `useAddToCart()` mutation with `listingId` and `addedFrom: 'listing_detail'`
- Guest add calls `useGuestCart().add()` with `GuestCartItem` shape; handles `'added'`, `'full'`, and `'duplicate'` return values
- Loading state shows spinner via existing Button `loading` prop and sets `aria-busy="true"`
- Success shows toast: "Added to cart" with type `'success'`
- Cart full (25 items) shows toast: "Cart is full (25 items)" with type `'error'`
- Error shows toast with error message and type `'error'`
- Uses existing `Button` component from `@/components/controls/button/` with `style="secondary"` and `outline`
- 44px minimum tap target enforced via SCSS (`min-height: 44px`)
- Mobile-first SCSS using only `@include breakpoint()` for responsive enhancement
- All SCSS values use CSS custom property design tokens (no hardcoded hex/px)

**Reuses:** `src/components/controls/button/`, `src/components/indicators/toast/context.tsx`
**Expert Domains:** state-management, scss, nextjs

### Task 1.2: Export AddToCartButton from cart feature barrel

Add the new component export to the cart feature's barrel file so it can be imported cleanly from `@/features/cart`.

**Files:**

- `src/features/cart/index.ts` (modify)

**AC:**

- `AddToCartButton` is exported from `@/features/cart/index.ts`
- Existing exports remain unchanged
- `pnpm typecheck` passes

**Expert Domains:** nextjs

## Phase 2: Integrate into listing detail page

**Goal:** Wire the AddToCartButton into the listing detail page's action buttons area and sticky bottom bar, replacing the placeholder "Buy Now" disabled button pattern with the functioning cart button while keeping "Buy Now" disabled for future checkout.
**Verify:** `pnpm build`

### Task 2.1: Add AddToCartButton to the action buttons section

Import and render `AddToCartButton` in the listing detail page's action buttons area (lines 104-121). Place it below the existing disabled "Buy Now" button. The component's own `null`-return logic handles the own-listing and inactive cases, but it should only be rendered in the non-sold, non-own-listing branch (which is already gated by the existing conditional at line 92).

**Files:**

- `src/app/(frontend)/listing/[id]/listing-detail.tsx` (modify)

**AC:**

- `AddToCartButton` appears below the disabled "Buy Now" button in the action buttons area for non-owner, active listings
- Button is not rendered for sold listings (existing `isSold` gate) or own listings (component's internal check + existing `isOwnListing` gate)
- `listingId`, `priceCents` (from `listing.price_cents`), `currentUserId`, and `sellerId` (from `listing.seller_id`) are passed as props
- Existing disabled "Buy Now" and "Make Offer" buttons remain unchanged
- `fullWidth` prop is passed to match sibling button layout
- No layout or styling regressions in the action buttons area

**Reuses:** `src/features/cart/components/add-to-cart-button/`
**Expert Domains:** nextjs

### Task 2.2: Add AddToCartButton to the sticky bottom bar

Replace or augment the sticky bottom bar (lines 201-209) to include the AddToCartButton alongside the price. The sticky bar is mobile-only (hidden at `lg` breakpoint via existing CSS). The disabled "Buy Now" in the sticky bar should be replaced with the AddToCartButton since cart addition is the primary mobile CTA.

**Files:**

- `src/app/(frontend)/listing/[id]/listing-detail.tsx` (modify)
- `src/app/(frontend)/listing/[id]/listing-detail.module.scss` (modify — if sticky bar layout adjustments are needed)

**AC:**

- Sticky bottom bar shows price + AddToCartButton (replacing the disabled "Buy Now")
- Bar remains hidden at `lg` breakpoint (existing behavior)
- AddToCartButton in sticky bar does NOT use `fullWidth` (it sits beside the price in a flex row)
- "In Your Cart" state in sticky bar links to `/cart` correctly
- 44px minimum tap target maintained in the sticky bar context
- No SCSS `max-width` media queries added

**Reuses:** `src/features/cart/components/add-to-cart-button/`
**Expert Domains:** nextjs, scss

### Task 2.3: Update cart feature CLAUDE.md with component documentation

Document the new `AddToCartButton` component in the cart feature's CLAUDE.md, including its props interface, state machine, and integration points.

**Files:**

- `src/features/cart/CLAUDE.md` (modify)

**AC:**

- Components section added or updated with `AddToCartButton` entry listing props, states, and usage context
- Documents both auth'd and guest code paths
- Documents the toast messages for each outcome (success, full, error)
- Consistent with existing CLAUDE.md documentation style in the codebase
