# Implementation Plan: #217 — scaffold orders feature domain

## Overview

1 phase, 1 task
Estimated scope: small

## Context

The `src/features/orders/` domain is already fully implemented beyond the original scaffold ticket:

- **Types:** `types/order.ts` and `types/payout.ts` with DB-derived types
- **Services:** 2 client services (`order.ts`, `payout.ts`) + 2 server services (`order-server.ts`, `stripe-transfer.ts`)
- **Hooks:** 7 Tanstack Query hooks (use-orders, use-order, use-seller-orders, use-ship-order, use-accept-order, use-seller-balance, use-payout-history)
- **Components:** 6 components (order-card, order-timeline, ship-modal, available-balance, pending-balance, payout-history)
- **CLAUDE.md:** Comprehensive 23KB documentation
- **Utils:** Timeline step utilities

The only missing deliverable from the ticket pattern is the **barrel `index.ts`** file. Every comparable feature domain (cart, watchlist, blocks, etc.) has one.

## Phase 1: Add barrel export

**Goal:** Create the barrel `index.ts` to match the pattern used by other feature domains
**Verify:** `pnpm build`

### Task 1.1: Create barrel index.ts for orders feature

Create `src/features/orders/index.ts` that re-exports public API from the orders feature domain. Follow the pattern from `src/features/cart/index.ts` and `src/features/watchlist/index.ts` — export types, hooks, and any components that are used outside the feature boundary.

**Files:** `src/features/orders/index.ts`
**AC:**

- Barrel file exists at `src/features/orders/index.ts`
- Exports all public types (Order, OrderStatus, OrderWithListing, etc.)
- Exports all hooks (useOrders, useOrder, useSeller*, useShip*, useAccept*, usePayout*, useSellerBalance)
- Exports key components used outside the feature boundary
- `pnpm build` passes
