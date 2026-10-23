# Implementation Plan: #218 — Order Status Badge Component

## Overview

1 phase, 3 total tasks
Estimated scope: small

## Phase 1: OrderStatusBadge Component + Tests

**Goal:** Create a reusable `OrderStatusBadge` component that maps all 7 `OrderStatus` values to the existing `Pill` component with the correct color variant and label, following the `ConditionBadge` pattern of a thin domain-specific wrapper, and verify with unit tests.
**Verify:** `pnpm build`

### Task 1.1: Create the OrderStatusBadge component

Create a new `OrderStatusBadge` component in the orders feature that accepts an `OrderStatus` and renders a `Pill` with the correct color and label. The component should consume the existing `STATUS_PILL_MAP` and `STATUS_LABELS` constants from `src/features/orders/types/order.ts` rather than duplicating any mapping logic. It follows the `ConditionBadge` pattern (a domain-specific wrapper around a shared UI primitive) but is simpler — no popover, no interactivity, just a status-to-pill mapping. The component does not need `'use client'` since it has no client-side state or effects.

**Files:**

- `src/features/orders/components/order-status-badge/index.tsx` (create)

**Reuses:** `src/components/indicators/pill/` (existing Pill component with `color` prop)

**AC:**

- Component accepts `status: OrderStatus` and optional `className?: string` props
- Renders a `Pill` with `color` from `STATUS_PILL_MAP[status]` and children from `STATUS_LABELS[status]`
- Falls back to `color="default"` and raw status string if status is not in the maps
- All 7 statuses render correctly: `paid` (primary, "Paid"), `shipped` (warning, "Shipped"), `delivered` (success, "Delivered"), `verification` (warning, "Verification"), `released` (success, "Released"), `disputed` (error, "Disputed"), `refunded` (default, "Refunded")
- `className` is forwarded to the `Pill` component

**Expert Domains:** nextjs

### Task 1.2: Add unit tests for OrderStatusBadge

Write Vitest + Testing Library unit tests covering all 7 order statuses. Follow the test patterns established in `src/features/orders/components/order-timeline/__tests__/index.test.tsx` — use `describe`/`it` blocks, `render`/`screen` from Testing Library, and the `/// <reference types="@testing-library/jest-dom" />` triple-slash directive. Test that each status renders the correct label text and that the className prop is forwarded.

**Files:**

- `src/features/orders/components/order-status-badge/__tests__/index.test.tsx` (create)

**AC:**

- 7 individual test cases, one per `OrderStatus` value, each asserting the correct label text is rendered
- Test for `paid` status asserts "Paid" text is in the document
- Test for `shipped` status asserts "Shipped" text is in the document
- Test for `delivered` status asserts "Delivered" text is in the document
- Test for `verification` status asserts "Verification" text is in the document
- Test for `released` status asserts "Released" text is in the document
- Test for `disputed` status asserts "Disputed" text is in the document
- Test for `refunded` status asserts "Refunded" text is in the document
- Test that `className` prop is forwarded to the rendered output
- All tests pass via `pnpm test:run`

**Expert Domains:** nextjs

### Task 1.3: Export OrderStatusBadge from the orders barrel and refactor OrderCard to use it

Add `OrderStatusBadge` to the orders feature barrel export (`src/features/orders/index.ts`). Then refactor `OrderCard` to import and use `OrderStatusBadge` instead of directly importing `Pill`, `STATUS_PILL_MAP`, and `STATUS_LABELS` — this consolidates the status-to-pill logic into a single component. The refactor should produce identical rendered output.

**Files:**

- `src/features/orders/index.ts` (modify — add component export)
- `src/features/orders/components/order-card/index.tsx` (modify — replace inline Pill usage with OrderStatusBadge)

**AC:**

- `OrderStatusBadge` is exported from `src/features/orders/index.ts`
- `OrderCard` imports `OrderStatusBadge` instead of `Pill`, `STATUS_PILL_MAP`, and `STATUS_LABELS`
- `OrderCard` renders `<OrderStatusBadge status={status} />` in place of the previous `<Pill color={STATUS_PILL_MAP[status]} ...>` usage
- `pnpm build` passes with no type errors
- `pnpm lint` passes

**Expert Domains:** nextjs
