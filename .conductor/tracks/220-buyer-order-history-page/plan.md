# Implementation Plan: #220 — buyer order history page at dashboard/orders/ with detail drawer

## Overview

4 phases, 16 total tasks
Estimated scope: large

## Phase 1: Foundation — carrier URL utility, tracking link helper, and proxy guard

**Goal:** Add the carrier tracking URL utility, update proxy.ts to guard /orders, and extend the layout metadata to match the ticket title
**Verify:** `pnpm build`

### Task 1.1: Add carrier tracking URL utility

Create a utility that maps carrier names to their tracking URL patterns. The ticket specifies USPS, UPS, and FedEx URL patterns. DHL and Other should return null (no link). This utility will be consumed by the OrderDetailPanel to render clickable tracking links.
**Files:** `src/features/orders/utils/get-tracking-url.ts`
**AC:** `getTrackingUrl('USPS', '9400111899223...')` returns `https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223...`; `getTrackingUrl('UPS', '1Z...')` returns `https://www.ups.com/track?tracknum=1Z...`; `getTrackingUrl('FedEx', '7489...')` returns `https://www.fedex.com/fedextrack/?trknbr=7489...`; `getTrackingUrl('Other', '...')` returns `null`
**Expert Domains:** nextjs

### Task 1.2: Update layout metadata title to "Your Orders"

The ticket specifies the page title should be "Your Orders". Update the existing orders layout metadata from "My Orders" to "Your Orders".
**Files:** `src/app/(frontend)/dashboard/orders/layout.tsx`
**AC:** Metadata title is `Your Orders`

### Task 1.3: Add /orders to proxy.ts auth guard

The ticket requires adding `/orders` to the proxy.ts auth guard. Currently, `/dashboard/*` is already guarded (line 56 of proxy.ts checks `request.nextUrl.pathname.startsWith('/dashboard')`), which means `/dashboard/orders` is already protected. Verify this covers the requirement. If the ticket means a standalone `/orders` route (outside dashboard), add it to the guard. Based on the issue body referencing `dashboard/orders/`, no proxy change is needed — the existing `/dashboard` guard already covers it. Document this finding in the task output.
**Files:** `src/proxy.ts` (verify only — likely no change needed)
**AC:** Navigating to `/dashboard/orders` while unauthenticated redirects to `/`. Verified the existing guard covers this route.

### Task 1.4: Export carrier tracking utility from feature barrel

Add the new `getTrackingUrl` utility to the orders feature barrel export so it can be consumed by components.
**Files:** `src/features/orders/index.ts`
**AC:** `getTrackingUrl` is exported from `@/features/orders`

## Phase 2: OrderDetailPanel component

**Goal:** Build the OrderDetailPanel component that displays full order details — listing photo, seller link, price breakdown, OrderTimeline, tracking with carrier link, and shipping address
**Verify:** `pnpm build`

### Task 2.1: Create OrderDetailPanel component

Build the core detail panel component. It receives an `OrderWithListing` and renders: listing photo (using `next/image` with `fill` + `sizes`), seller name as a link to their profile, price breakdown (item price, shipping, total), the OrderTimeline stepper (reusing existing `OrderTimeline` component and `getTimelineSteps` utility), tracking number with clickable carrier link (using `getTrackingUrl`), and shipping address from the JSONB column. Include a close button and back-to-orders link. The component must be a client component.
**Files:** `src/features/orders/components/order-detail-panel/index.tsx`, `src/features/orders/components/order-detail-panel/order-detail-panel.module.scss`
**AC:** Component renders all sections (listing info, seller, price breakdown, timeline, tracking, shipping address). Tracking number links to the correct carrier URL. Shipping address displays formatted from JSONB. Close button calls `onClose` callback. Uses `next/image` with proper `sizes` attribute. All text has proper semantic HTML (dl for price breakdown, address element for shipping).
**Reuses:** `src/features/orders/components/order-timeline/`, `src/features/orders/components/order-status-badge/`, `src/components/indicators/pill/`, `src/features/orders/utils/get-timeline-steps.ts`, `src/features/orders/utils/get-tracking-url.ts`
**Expert Domains:** scss, nextjs

### Task 2.2: Add accept-delivery action to OrderDetailPanel

Extend the OrderDetailPanel to include the "Item arrived as described" accept-delivery button (for orders in `delivered` or `verification` status) with the ConfirmationDialog pattern. Also add the verification deadline notice and dispute contact link, matching the existing pattern from the `[id]/page.tsx` detail page.
**Files:** `src/features/orders/components/order-detail-panel/index.tsx`
**AC:** Accept button renders when `status === 'delivered' || status === 'verification'`. Button triggers ConfirmationDialog. On confirm, calls `useAcceptOrder` mutation. Toast shows on success/error. Verification deadline notice renders for verification-status orders.
**Reuses:** `src/components/layout/confirmation-dialog/`, `src/components/indicators/toast/context.tsx`
**Expert Domains:** state-management

### Task 2.3: Export OrderDetailPanel from feature barrel

Add the new component to the orders feature barrel export.
**Files:** `src/features/orders/index.ts`
**AC:** `OrderDetailPanel` is exported as a default export from `@/features/orders`

## Phase 3: OrdersPage rewrite with detail drawer and responsive layout

**Goal:** Rewrite the OrdersPage to implement the list+detail layout — mobile full-page slide-in panel via portal, desktop lg+ inline right column (60/40 split), with URL state via `?orderId=`
**Verify:** `pnpm build`

### Task 3.1: Create SlidePanel shared layout component

Build a reusable slide-in panel component for mobile. It renders as a full-page overlay sliding in from the right, portaled to `#modal-root`. Includes focus trap, Escape to close, body scroll lock, and transition animation. This follows the same a11y patterns as the existing Modal and BottomSheet components (portal, focus trap, Escape, scroll lock, focus restoration). Desktop lg+ hides the overlay behavior — the panel content renders inline.
**Files:** `src/components/layout/slide-panel/index.tsx`, `src/components/layout/slide-panel/slide-panel.module.scss`
**AC:** On mobile (< lg): renders as portal with scrim overlay, slides in from right, has focus trap, closes on Escape, locks body scroll, restores focus on close. On desktop (lg+): renders children inline without portal/overlay/focus-trap (the parent layout handles positioning). Component accepts `isOpen`, `onClose`, `children`, `ariaLabel`. Transition: `transform: translateX(100%) -> translateX(0)` with 200-300ms ease.
**Reuses:** Patterns from `src/components/layout/modal/index.tsx` and `src/components/layout/bottom-sheet/index.tsx`
**Expert Domains:** scss, nextjs

### Task 3.2: Rewrite OrdersPage with list+detail split layout

Rewrite the existing `page.tsx` as a server component that renders metadata and wraps a new client `orders-page.tsx`. The client OrdersPage manages `?orderId=` URL state via `useSearchParams` + `useRouter`. On mobile: order list is full-width, selecting an order opens SlidePanel with OrderDetailPanel. On desktop lg+: 60/40 CSS grid split — left column is the order list, right column is the inline OrderDetailPanel. OrderCard gets `isSelected` and `onSelect` props wired to URL state. When `?orderId=` is present on load, auto-select that order (enables shareable deep links).
**Files:** `src/app/(frontend)/dashboard/orders/page.tsx`, `src/app/(frontend)/dashboard/orders/orders-page.tsx`, `src/app/(frontend)/dashboard/orders/orders-page.module.scss`
**AC:** URL updates to `?orderId={id}` when an order is selected. Removing selection clears the param. Direct navigation to `?orderId=xyz` auto-selects that order and shows detail. Mobile: list is full-width, detail opens as slide-in panel. Desktop lg+: 60/40 grid, detail shows inline in right column. `page.tsx` is a server component with `Suspense` boundary wrapping the client component (required for `useSearchParams`).
**Reuses:** `src/features/orders/components/order-card/`, `src/features/orders/components/order-detail-panel/`, `src/components/layout/slide-panel/`
**Expert Domains:** nextjs, scss, state-management

### Task 3.3: Update heading to "Your Orders" and wire OrderCard selection

Ensure the page heading is "Your Orders" per the ticket. Wire each OrderCard's `onSelect` to update the URL `?orderId=` param and mark it as `isSelected` when its ID matches the current param. On desktop, if no order is selected, show a placeholder in the right column prompting the user to select an order.
**Files:** `src/app/(frontend)/dashboard/orders/orders-page.tsx`, `src/app/(frontend)/dashboard/orders/orders-page.module.scss`
**AC:** Page heading reads "Your Orders". OrderCards highlight with `isSelected` when their order matches `?orderId=`. Desktop placeholder shows "Select an order to view details" when no order is selected.
**Expert Domains:** scss

## Phase 4: Empty state, loading skeleton, error handling, and polish

**Goal:** Add the empty state with icon + "No orders yet" + Browse CTA, loading skeleton for the order list, error state, and final accessibility/responsive polish
**Verify:** `pnpm build`

### Task 4.1: Create OrderCardSkeleton loading component

Build a skeleton placeholder that mimics the OrderCard layout (thumbnail rectangle, text lines, status pill). Render 4-6 skeleton cards during loading state. Use CSS animation for the shimmer effect matching existing skeleton patterns in the codebase.
**Files:** `src/features/orders/components/order-card-skeleton/index.tsx`, `src/features/orders/components/order-card-skeleton/order-card-skeleton.module.scss`
**AC:** Skeleton renders with same dimensions as OrderCard: 60x60 thumbnail on mobile (80x80 on md+), 3 text lines, status area. Shimmer animation plays. Component accepts `count` prop to render multiple instances.
**Expert Domains:** scss

### Task 4.2: Add empty state with icon, message, and Browse CTA

Replace the current minimal empty state with a proper empty state: centered icon (`HiOutlineShoppingBag` or similar from react-icons), "No orders yet" heading, descriptive text, and a "Browse listings" CTA button linking to `/listings`. Follow the pattern established by the watchlist empty state.
**Files:** `src/app/(frontend)/dashboard/orders/orders-page.tsx`, `src/app/(frontend)/dashboard/orders/orders-page.module.scss`
**AC:** Empty state renders when `orders.length === 0 && !isLoading`. Shows icon (aria-hidden), "No orders yet" heading, "When you purchase gear, your orders will appear here." description, and a "Browse listings" Button linking to `/listings`. Centered layout, visually matches watchlist empty state pattern.
**Reuses:** `src/components/controls/button/`
**Expert Domains:** scss

### Task 4.3: Wire loading skeleton and error state into OrdersPage

Replace the plain "Loading your orders..." text with OrderCardSkeleton. Add an error state for when the query fails, using the existing error state pattern (InlineBanner or simple error message with retry).
**Files:** `src/app/(frontend)/dashboard/orders/orders-page.tsx`
**AC:** Loading state shows 4 OrderCardSkeleton instances with sr-only live region announcing "Loading your orders". Error state shows a message with a retry option. Screen reader announces loading state via `role="status"` + `aria-live="polite"`.
**Reuses:** `src/features/orders/components/order-card-skeleton/`
**Expert Domains:** nextjs

### Task 4.4: Add OrderDetailPanel loading and not-found states

When an orderId is in the URL but the order data hasn't loaded yet, show a detail panel skeleton. When the orderId doesn't match any order in the list, show a "Order not found" message in the detail area.
**Files:** `src/app/(frontend)/dashboard/orders/orders-page.tsx`, `src/app/(frontend)/dashboard/orders/orders-page.module.scss`
**AC:** Detail panel shows skeleton/loading indicator while order data resolves. If orderId param doesn't match any order, shows "Order not found" with option to clear selection. Works on both mobile (slide panel) and desktop (inline column).

### Task 4.5: Export OrderCardSkeleton from feature barrel and final cleanup

Add the skeleton to the barrel export. Remove the now-unused `[id]/page.tsx` and `[id]/order-detail.module.scss` standalone detail page since the detail is now rendered inline via the drawer pattern. Update the orders feature CLAUDE.md to document the new components.
**Files:** `src/features/orders/index.ts`, `src/features/orders/CLAUDE.md`, `src/app/(frontend)/dashboard/orders/[id]/page.tsx` (remove), `src/app/(frontend)/dashboard/orders/[id]/order-detail.module.scss` (remove)
**AC:** OrderCardSkeleton is exported from the feature barrel. The `[id]` route files are removed (detail is now inline). CLAUDE.md documents OrderDetailPanel, OrderCardSkeleton, and SlidePanel usage. Feature barrel is clean with no broken imports.

### Task 4.6: Accessibility audit and responsive polish

Final pass for WCAG 2.1 AA compliance: verify focus management when opening/closing the detail panel on mobile, ensure all interactive elements have 44x44px tap targets, verify screen reader announcements for order selection changes, test keyboard navigation through the order list and into the detail panel, verify `aria-pressed` on OrderCards, and ensure the slide panel has proper `aria-label`.
**Files:** `src/app/(frontend)/dashboard/orders/orders-page.tsx`, `src/features/orders/components/order-detail-panel/index.tsx`, `src/components/layout/slide-panel/index.tsx`
**AC:** Tab key navigates through order list. Enter/Space on OrderCard opens detail. Escape closes mobile panel. Focus moves to detail panel on open, returns to triggering OrderCard on close. All buttons meet 44x44px minimum. Screen reader announces "Order details for {title}" when detail opens. No focus trap escapes on mobile panel.
