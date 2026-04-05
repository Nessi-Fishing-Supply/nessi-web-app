# Implementation Plan: #219 — Order Card Component

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Implement OrderCard component

**Goal:** Rebuild the existing OrderCard skeleton to match all ticket requirements -- selectable state with accent border, seller name, accessibility attributes, and responsive layout (stacked mobile, single row desktop), following the CartItemCard pattern.
**Verify:** `pnpm build`

### Task 1.1: Update OrderCard component with full props and markup

The existing `src/features/orders/components/order-card/index.tsx` has a basic implementation using a `<Link>` wrapper with `href` prop, but the ticket specifies `isSelected` + `onSelect` callback props (selectable card, not a navigation link). Rewrite the component to use an `<article>` wrapper with a nested `<button>` (or make the article itself clickable via `onClick={onSelect}` with `role="button"` and `tabIndex={0}`). Add seller name from `order.seller.first_name` + `order.seller.last_name`. Format date as "Mon DD, YYYY" via `toLocaleDateString`. Display total via `formatPrice(order.amount_cents)`. Render `OrderStatusBadge` for the status. The thumbnail uses `next/image` with `sizes="80px"`, `fill` layout, and `objectFit: 'cover'`. Include a placeholder div when `cover_photo_url` is null.

Props interface: `{ order: OrderWithListing; isSelected?: boolean; onSelect?: () => void }`. When `isSelected` is true, apply a `.selected` CSS class. Accessibility: set `aria-pressed={isSelected}` on the interactive element and `aria-label` that describes the order (e.g., `"Order: {title}, {status}, {price}"`). Ensure 44px minimum tap target. Add `:focus-visible` outline.

**Files:** `src/features/orders/components/order-card/index.tsx`
**Reuses:** `src/features/orders/components/order-status-badge/` (OrderStatusBadge), `src/features/shared/utils/format.ts` (formatPrice)
**AC:**

- Component accepts `order: OrderWithListing`, `isSelected?: boolean`, `onSelect?: () => void` props
- Renders 80px thumbnail with `next/image` (sizes="80px", fill, objectFit cover); placeholder when no photo
- Displays listing title, seller full name (`first_name last_name`), formatted date (Mon DD, YYYY), formatted price (`formatPrice`), and OrderStatusBadge
- `aria-pressed` reflects `isSelected` state; `aria-label` includes order title, status, and price
- Clicking the card calls `onSelect`; does not error when `onSelect` is undefined
- Minimum 44px tap target on the card element
  **Expert Domains:** nextjs, scss

### Task 1.2: Update OrderCard SCSS with selected state and responsive layout

Rewrite `order-card.module.scss` to implement mobile-first responsive design following the CartItemCard pattern. Mobile (default): thumbnail + text stack vertically in the details area (title, seller name line, date/price meta row). Desktop (`@include breakpoint(md)`): single horizontal row with thumbnail on the left, stacked text details in the middle (flex: 1), and status badge right-aligned. Selected state: apply a 3px left border using `var(--color-primary-500)` and a subtle background `var(--color-primary-50)`. Use the existing `.selected` class toggled by the component. Keep thumbnail at 60px on mobile and 80px on desktop (matching the existing pattern in the current SCSS). All values must use CSS custom property tokens from `src/styles/variables/`. Ensure `:focus-visible` has a visible 2px outline with offset. Transition background and border for smooth selection feedback.

**Files:** `src/features/orders/components/order-card/order-card.module.scss`
**AC:**

- Mobile: details area uses column flex direction; text stacks vertically
- Desktop (md+): single horizontal row with thumbnail, details (flex: 1), and status badge inline
- Selected state applies 3px left accent border and subtle primary background
- All sizing, color, spacing values use CSS custom property tokens
- Mobile-first: base styles target smallest viewport, `@include breakpoint(md)` enhances upward
- `:focus-visible` outline is visible with 2px solid primary color and 2px offset
- Thumbnail is 60px on mobile, 80px on desktop (matching existing pattern)
  **Expert Domains:** scss

### Task 1.3: Export OrderCard from orders barrel index

Add the `OrderCard` default export to `src/features/orders/index.ts` so consumers can import it via `import { OrderCard } from '@/features/orders'`. Place the export in the Components section alongside the existing `OrderStatusBadge` export.

**Files:** `src/features/orders/index.ts`
**AC:**

- `export { default as OrderCard } from './components/order-card'` is present in the barrel file
- Existing exports are unchanged
- `pnpm build` passes with the new export
  **Expert Domains:** nextjs

## Phase 2: Unit tests

**Goal:** Add comprehensive unit tests for the OrderCard component covering rendering, selected state, accessibility, callbacks, and edge cases.
**Verify:** `pnpm test:run`

### Task 2.1: Write OrderCard unit tests

Create test file at `src/features/orders/components/order-card/__tests__/index.test.tsx` following the OrderStatusBadge test pattern (Vitest + `@testing-library/react`, `beforeEach` with `cleanup`, `describe`/`it`/`expect`). Mock `next/image` to render a plain `<img>` with forwarded props. Build a `createMockOrder()` factory that returns a valid `OrderWithListing` object with sensible defaults (paid status, a listing title, seller name, cover photo URL, `amount_cents: 2500`).

Test cases to cover:

1. Renders listing title text
2. Renders seller full name (first + last)
3. Renders formatted date (Mon DD, YYYY pattern)
4. Renders formatted price via `formatPrice`
5. Renders OrderStatusBadge with correct status text
6. Renders thumbnail image with `sizes="80px"` and correct alt text
7. Renders placeholder when `cover_photo_url` is null
8. `aria-pressed` is `false` by default (isSelected undefined)
9. `aria-pressed` is `true` when `isSelected={true}`
10. `aria-label` contains the listing title
11. Calls `onSelect` callback when card is clicked
12. Does not throw when clicked with no `onSelect` provided
13. Applies selected CSS class when `isSelected` is true

**Files:** `src/features/orders/components/order-card/__tests__/index.test.tsx`
**AC:**

- All 13 test cases pass via `pnpm test:run`
- Uses Vitest `describe`/`it`/`expect` with `@testing-library/react` `render`/`screen`/`fireEvent`
- `next/image` is mocked to render a plain `<img>` element
- Factory helper `createMockOrder()` produces valid `OrderWithListing` with overrideable fields
- Tests cover rendering, accessibility attributes, interaction callbacks, and edge cases
  **Expert Domains:** nextjs
