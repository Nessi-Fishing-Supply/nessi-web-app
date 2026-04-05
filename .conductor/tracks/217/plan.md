# Implementation Plan: #217 — scaffold orders feature domain

## Overview

1 phase, 1 total task
Estimated scope: small

**Codebase assessment:** The orders feature domain at `src/features/orders/` is already fully built — well beyond the scaffold stage described in the ticket. It contains:

- **Types:** `types/order.ts` (Order, OrderInsert, OrderUpdate, OrderStatus, EscrowStatus, Carrier, OrderWithListing, TimelineStepDef, TIMELINE_STEPS, STATUS_PILL_MAP, STATUS_LABELS) and `types/payout.ts` (SellerBalance, TransferItem, PayoutHistoryResponse). Types are DB-derived via `Database['public']['Tables']['orders']`, not manually defined with TODO comments.
- **Client services:** `services/order.ts` (getOrders, getOrder, getSellerOrders, shipOrder, acceptOrder) and `services/payout.ts` (getSellerBalance, getPayoutHistory) — real fetch wrappers, not placeholders.
- **Server services:** `services/order-server.ts` (6 functions including auto-release/auto-deliver queries) and `services/stripe-transfer.ts`.
- **Hooks:** `hooks/use-orders.ts`, `hooks/use-order.ts`, `hooks/use-seller-orders.ts`, `hooks/use-ship-order.ts`, `hooks/use-accept-order.ts`, `hooks/use-seller-balance.ts`, `hooks/use-payout-history.ts` — 7 hooks total covering both buyer and seller flows.
- **Components:** 6 components (order-card, order-timeline, ship-modal, available-balance, pending-balance, payout-history).
- **CLAUDE.md:** Comprehensive documentation (23KB) covering schema, services, hooks, components, lifecycle, escrow flow, cron jobs, and email notifications.
- **Utils:** `utils/get-timeline-steps.ts`.

The only missing artifact from the ticket's acceptance criteria is the **barrel `index.ts`** file. All other features (cart, watchlist) that follow this pattern have a barrel export. The orders feature does not yet have one.

## Phase 1: Add barrel export

**Goal:** Create the barrel `index.ts` to complete the feature domain scaffold and match the pattern used by cart and watchlist features.
**Verify:** `pnpm build`

### Task 1.1: Create barrel index.ts for the orders feature domain

Create `src/features/orders/index.ts` following the barrel export pattern established by `src/features/cart/index.ts` and `src/features/watchlist/index.ts`. Export all public types from `types/order.ts` and `types/payout.ts`, all client service functions from `services/order.ts` and `services/payout.ts`, and all hooks from `hooks/`. Do not export server services (they use the server Supabase client and should only be imported directly by API routes). Do not export components from the barrel (matching the watchlist pattern where components are imported from their direct paths).
**Files:** `src/features/orders/index.ts`
**AC:** The file exists, re-exports all public types (Order, OrderInsert, OrderUpdate, OrderStatus, EscrowStatus, Carrier, OrderWithListing, TimelineStepDef, TIMELINE_STEPS, STATUS_PILL_MAP, STATUS_LABELS, SellerBalance, TransferItem, PayoutHistoryResponse), all client service functions (getOrders, getOrder, getSellerOrders, shipOrder, acceptOrder, getSellerBalance, getPayoutHistory), and all hooks (useOrders, useOrder, useSellerOrders, useShipOrder, useAcceptOrder, useSellerBalance, usePayoutHistory). `pnpm build` passes.
**Expert Domains:** nextjs
