# Implementation Plan: #130 — Navbar Cart Icon, Badge Count, and Guest Merge on Login

## Overview
3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Cart Icon Component with Badge
**Goal:** Create the CartIcon component with badge count display and SCSS styles, ready for navbar integration.
**Verify:** `pnpm build`

### Task 1.1: Create CartIcon component with badge overlay
Create `src/features/cart/components/cart-icon/index.tsx` as a `'use client'` component that renders `<HiOutlineShoppingBag>` wrapped in a Next.js `<Link>` to `/cart`. Call `useCartBadgeCount()` from `src/features/cart/hooks/use-cart.ts` (already exists — returns unified count for auth and guest users via `useSyncExternalStore`). When count > 0, render a small badge `<span>` with the count. When count is 0, hide the badge entirely (no DOM node). Add `aria-label` on the link: `"Cart, X items"` when count > 0, `"Cart"` when empty. The icon itself gets `aria-hidden="true"`. Follow the existing `AddToCartButton` pattern for client component structure.
**Files:** `src/features/cart/components/cart-icon/index.tsx`
**AC:** Component renders a link to `/cart` with shopping bag icon; badge shows count when > 0; badge hidden when count is 0; accessible `aria-label` reflects item count; no hydration mismatch (count comes from `useCartBadgeCount` which uses `useSyncExternalStore` under the hood)
**Reuses:** `src/features/cart/hooks/use-cart.ts` (`useCartBadgeCount`)
**Expert Domains:** nextjs, state-management

### Task 1.2: Create CartIcon SCSS module with mobile-first badge styles
Create `src/features/cart/components/cart-icon/cart-icon.module.scss`. The wrapper should use `position: relative` and `display: inline-flex` with `align-items: center`. Ensure 44x44px minimum tap target on the link (WCAG). The badge is `position: absolute`, top-right corner of the icon, small rounded pill using `border-radius: 50%` for single digits or `border-radius: var(--spacing-300)` for multi-digit. Badge uses `var(--color-accent-500)` background with `var(--color-neutral-900)` text (matching the existing `.button` accent pattern in navbar). Font size should be `var(--font-size-100)` or similar small size. Icon size matches existing `.icon` class in navbar: `var(--spacing-700)` width/height. Mobile-first — no breakpoint overrides needed since the badge is the same at all sizes.
**Files:** `src/features/cart/components/cart-icon/cart-icon.module.scss`
**AC:** Badge is positioned top-right of icon; uses accent color tokens (not hardcoded hex); minimum 44x44px tap target; mobile-first with no max-width queries; matches navbar icon sizing
**Expert Domains:** scss

### Task 1.3: Export CartIcon from cart feature barrel
Add the `CartIcon` component to the cart feature barrel file at `src/features/cart/index.ts` so it can be imported cleanly by the navbar. Follow the existing export pattern (e.g., `export { default as CartIcon } from './components/cart-icon'`).
**Files:** `src/features/cart/index.ts`
**AC:** `CartIcon` is exported from `@/features/cart`; existing exports unchanged
**Expert Domains:** nextjs

## Phase 2: Navbar Integration
**Goal:** Replace the static shopping bag icon in the navbar with the interactive CartIcon component.
**Verify:** `pnpm build`

### Task 2.1: Replace static shopping bag icon with CartIcon in navbar
Modify `src/components/navigation/navbar/index.tsx`. Remove the static `<HiOutlineShoppingBag className={styles.icon} aria-hidden="true" />` at line 374 (inside the `{mounted && !isShopContext && (...)}` block). Replace it with `<CartIcon />` imported from `@/features/cart/components/cart-icon`. The cart icon should be visible to ALL users (authenticated and guest), regardless of context (member or shop). Currently the shopping bag is hidden in shop context — the CartIcon should render unconditionally (when `mounted` is true) since guests and shop-context users can still have carts. Remove the `!isShopContext` guard. Remove `HiOutlineShoppingBag` from the react-icons import ONLY if it is no longer used elsewhere in the file (check: it is still used in the dropdown menu for "Listings" link at line 290, so keep the import). Do NOT modify any other navbar elements.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** CartIcon renders in navbar for all users (auth, guest, member context, shop context); links to `/cart`; badge shows correct count; static shopping bag icon removed from navbar bar (but kept in dropdown menu); no other navbar elements affected; `HiOutlineShoppingBag` import retained for dropdown usage
**Reuses:** `src/features/cart/components/cart-icon/index.tsx`
**Expert Domains:** nextjs

## Phase 3: Guest Cart Merge on Login
**Goal:** Automatically merge guest cart items into the authenticated cart when a user logs in, with toast feedback and localStorage cleanup.
**Verify:** `pnpm build`

### Task 3.1: Create useCartMerge hook for auth-transition detection
Create `src/features/cart/hooks/use-cart-merge.ts`. This hook detects when a user transitions from unauthenticated to authenticated (login). Use a `useRef` to track the previous auth state. On each render, compare: if previous `user` was `null` and current `user` is non-null, a login just occurred. Read guest cart via `getGuestCart()` (direct util call, not the hook — to get a one-time snapshot). If guest cart is empty, no-op. If guest cart has items, call `useMergeGuestCart().mutate()` with the guest items. The mutation's `onSuccess` already calls `clearGuestCart()` (built into `useMergeGuestCart` in `use-cart.ts`). After `mutate` resolves, show a toast via `useToast()`: if `merged === guestCount`, show success `"X items from your guest cart were added"`; if `merged < guestCount`, show `"X items added, Y items no longer available"` (where Y = guestCount - merged); if `merged === 0`, show `"Items in your guest cart are no longer available"`. The merge should be fire-and-forget — do not block UI. Use `mutate` (not `mutateAsync`) with `onSuccess`/`onError` callbacks for toast feedback. The hook takes no props and returns nothing — it is a side-effect-only hook.
**Files:** `src/features/cart/hooks/use-cart-merge.ts`
**AC:** Hook detects null-to-authenticated transition; reads guest cart snapshot; calls merge mutation only when guest items exist; shows appropriate toast for full success, partial success, and zero-merge cases; clears localStorage on success (handled by existing `useMergeGuestCart`); does not block UI; no-ops when guest cart is empty; does not re-trigger on subsequent renders
**Reuses:** `src/features/cart/hooks/use-cart.ts` (`useMergeGuestCart`), `src/features/cart/utils/guest-cart.ts` (`getGuestCart`), `src/components/indicators/toast/context.tsx` (`useToast`)
**Expert Domains:** state-management

### Task 3.2: Wire useCartMerge into the navbar
Import and call `useCartMerge()` inside the `Navbar` component in `src/components/navigation/navbar/index.tsx`. The hook is side-effect-only (no return value), so simply invoke it at the top of the component alongside the other hooks. This ensures the merge fires on every login regardless of which page the user is on, since the navbar is present on all pages. No conditional calling — the hook itself handles the guard logic internally.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** `useCartMerge()` is called in Navbar; guest cart items merge to DB on login; toast appears after merge; localStorage cleared after successful merge; no UI blocking; hook call is unconditional (not inside an if/else)
**Reuses:** `src/features/cart/hooks/use-cart-merge.ts`
**Expert Domains:** nextjs, state-management

### Task 3.3: Export useCartMerge from cart feature barrel and update CLAUDE.md
Add `useCartMerge` to the barrel export in `src/features/cart/index.ts`. Update `src/features/cart/CLAUDE.md` to document: (1) the new `CartIcon` component in the Components section with its props and behavior, (2) the `useCartMerge` hook in the Hooks table with its purpose ("Detects login transition, merges guest cart, shows toast"), and (3) note in the Components section that CartIcon is integrated into the navbar.
**Files:** `src/features/cart/index.ts`, `src/features/cart/CLAUDE.md`
**AC:** `useCartMerge` exported from barrel; CLAUDE.md documents CartIcon component and useCartMerge hook; existing documentation unchanged
**Expert Domains:** nextjs
