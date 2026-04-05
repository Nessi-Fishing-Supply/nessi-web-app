# Implementation Plan: #30 — Checkout flow — escrow orders

## Overview

5 phases, 25 total tasks
Estimated scope: large

## Phase 1: Database migration and feature scaffold

**Goal:** Create the `orders` table with RLS policies, scaffold the orders feature domain with types and server/client services.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create orders table migration with RLS policies and indexes

Create a Supabase SQL migration that creates the `orders` table with all columns specified in the issue. The FK references should use `members(id)` (not `profiles(id)` — the codebase uses `members` as the user table). Add RLS policies: buyers read their own orders (by `buyer_id`), sellers read orders where `seller_id` matches, service_role has full access. Add indexes on `buyer_id`, `seller_id`, `listing_id`, `status`, and `stripe_payment_intent_id`. Add CHECK constraints for `status` and `escrow_status` enums. Add an `updated_at` trigger to auto-set the timestamp on update.
**Files:** SQL migration via Supabase MCP
**AC:** Migration applies without errors; RLS prevents cross-user order access; indexes exist on buyer_id, seller_id, listing_id, status; CHECK constraints reject invalid status values
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.2: Regenerate database types

Run `pnpm db:types` to regenerate `src/types/database.ts` with the new `orders` table types so that all downstream TypeScript code has correct types.
**Files:** `src/types/database.ts`
**AC:** `database.ts` contains the `orders` table Row/Insert/Update types; `pnpm typecheck` passes
**Expert Domains:** supabase

### Task 1.3: Create order types

Define derived order types from the generated database types. Include `Order` (Row), `OrderInsert`, `OrderUpdate`, `OrderStatus`, `EscrowStatus`, `OrderWithListing` (order joined with listing title, cover photo, and seller/buyer display names). Define a `TIMELINE_STEPS` constant mapping statuses to step labels.
**Files:** `src/features/orders/types/order.ts`
**AC:** All types export cleanly; `OrderStatus` is a union of the 7 status values; `OrderWithListing` includes listing title, cover_photo_url, buyer name, seller name; `pnpm typecheck` passes
**Expert Domains:** supabase

### Task 1.4: Create order server service

Implement server-side Supabase queries using `createClient` from `@/libs/supabase/server`. Functions: `getOrdersByBuyerServer(userId)` returning orders with listing details, `getOrdersBySellerServer(userId)` returning seller's orders with listing details, `getOrderByIdServer(userId, orderId)` returning a single order (validates buyer or seller access), `updateOrderStatusServer(orderId, status, extraFields?)` for status transitions, `getOrdersForAutoReleaseServer()` for cron (verification_deadline past), `getOrdersForAutoDeliverServer()` for cron (shipped > 30 days). Follow the pattern established in `src/features/listings/services/listing-server.ts` and `src/features/messaging/services/messaging-server.ts`.
**Files:** `src/features/orders/services/order-server.ts`
**AC:** All functions use the Supabase server client with cookie-based auth; `getOrderByIdServer` returns null when user is neither buyer nor seller; queries join listings for title/cover_photo_url and members for display names; `pnpm typecheck` passes
**Expert Domains:** supabase, nextjs

### Task 1.5: Create order client service

Implement client-side fetch wrappers using `get`, `post` from `@/libs/fetch`, following the pattern in `src/features/messaging/services/messaging.ts`. Functions: `getOrders()` (buyer's orders), `getOrder(id)` (single order), `shipOrder(id, { trackingNumber, carrier })`, `acceptOrder(id)`.
**Files:** `src/features/orders/services/order.ts`
**AC:** All functions call the correct API paths; `shipOrder` sends tracking_number and carrier in the POST body; all functions return typed responses; `pnpm typecheck` passes
**Expert Domains:** nextjs

### Task 1.6: Create Tanstack Query hooks for orders

Create `use-orders.ts` with `useOrders()` query hook (key: `['orders']`) and `use-order.ts` with `useOrder(orderId)` query hook (key: `['orders', orderId]`). Create `use-ship-order.ts` with `useShipOrder()` mutation that invalidates `['orders']` on success, and `use-accept-order.ts` with `useAcceptOrder()` mutation that invalidates `['orders']` on success. Follow the hook patterns in `src/features/listings/hooks/` and `src/features/messaging/hooks/`.
**Files:** `src/features/orders/hooks/use-orders.ts`, `src/features/orders/hooks/use-order.ts`, `src/features/orders/hooks/use-ship-order.ts`, `src/features/orders/hooks/use-accept-order.ts`
**AC:** Query hooks fetch from the correct service functions; mutations invalidate the `['orders']` query key family; hooks are disabled when IDs are falsy; `pnpm typecheck` passes
**Expert Domains:** state-management

### Task 1.7: Update orders feature CLAUDE.md

Update the existing `src/features/orders/CLAUDE.md` with full documentation: schema, types, services, hooks, components, API routes, and key patterns. Follow the documentation depth of `src/features/messaging/CLAUDE.md`.
**Files:** `src/features/orders/CLAUDE.md`
**AC:** CLAUDE.md documents the orders table schema, all types, all services (server + client), all hooks, all components, all API routes, and key patterns; it matches the documentation quality of other feature CLAUDE.md files
**Expert Domains:** supabase, nextjs

## Phase 2: API routes and webhook handler

**Goal:** Implement all order API routes (GET, ship, accept) and the Stripe Transfer logic, plus wire a webhook handler for payment_intent.succeeded.
**Verify:** `pnpm build && pnpm typecheck`

### Task 2.1: Create GET /api/orders route (buyer's order list)

Implement a GET route that authenticates the user via the Supabase server client, calls `getOrdersByBuyerServer`, and returns the buyer's orders. Return 401 for unauthenticated requests. Follow the description-comment convention from `src/app/api/CLAUDE.md`.
**Files:** `src/app/api/orders/route.ts`
**AC:** Returns only the authenticated buyer's orders; returns 401 for unauthenticated; never exposes `stripe_payment_intent_id` in the response; response shape matches `OrderWithListing[]`; description comment present above handler
**Expert Domains:** supabase, nextjs

### Task 2.2: Create GET /api/orders/[id] route (single order detail)

Implement a GET route for a single order. Authenticate user, call `getOrderByIdServer`, return 404 if user is neither buyer nor seller. Strip `stripe_payment_intent_id` from the response before returning. Seller sees `shipping_address` only when status is not `paid` (the issue says "seller sees buyer address only after order is paid" — this means the address is visible once the order enters a post-payment processing state, but the `paid` status means payment was just captured, so the address should be visible at `paid` and beyond — include it for all statuses since the order only exists after payment).
**Files:** `src/app/api/orders/[id]/route.ts`
**AC:** Returns order with listing details for authorized buyer or seller; returns 404 for unauthorized users; `stripe_payment_intent_id` is never in the response; description comment present
**Expert Domains:** supabase, nextjs

### Task 2.3: Create POST /api/orders/[id]/ship route

Implement a POST route for seller to mark an order as shipped. Validate: user is the seller, order status is `paid`, request body includes `tracking_number` and `carrier`. Update order to `status: 'shipped'`, set `shipped_at`, `tracking_number`, `carrier`. Fire-and-forget email notification to buyer using the email template from Task 2.5. Follow the fire-and-forget email pattern from messaging (`void (async () => { ... })()`).
**Files:** `src/app/api/orders/[id]/ship/route.ts`
**AC:** Only the seller can call; 403 if not seller; 400 if status is not `paid`; 400 if tracking_number or carrier missing; sets shipped_at timestamp; sends email asynchronously; returns updated order; description comment present
**Expert Domains:** supabase, nextjs

### Task 2.4: Create POST /api/orders/[id]/accept route with Stripe Transfer

Implement a POST route for buyer to accept delivery, triggering the Stripe Transfer. Validate: user is the buyer, order status is `delivered` or `verification`. Use `getStripe()` from `@/libs/stripe/client`. Retrieve the PaymentIntent to get the latest charge ID, then call `stripe.transfers.create()` with `amount = amount_cents - nessi_fee_cents`, `currency: 'usd'`, `destination` (seller's Stripe Connect account ID from members table `stripe_account_id`), and `source_transaction` set to the charge ID. Update order: `status: 'released'`, `escrow_status: 'released'`, `buyer_accepted_at: now()`, `released_at: now()`. Fire-and-forget email to seller.
**Files:** `src/app/api/orders/[id]/accept/route.ts`
**AC:** Only the buyer can call; 403 if not buyer; 400 if status is not `delivered` or `verification`; Stripe Transfer uses charge ID from the original PaymentIntent (not standalone); transfer amount = amount_cents - nessi_fee_cents; order status and escrow_status both update; sends seller email asynchronously; returns updated order; description comment present
**Expert Domains:** supabase, nextjs

### Task 2.5: Create order email templates (shipped, delivered, released)

Create three email templates following the pattern in `src/features/email/templates/`: `order-shipped.ts` (buyer gets tracking info), `order-delivered.ts` (buyer notified of delivery + verification window), `order-released.ts` (seller notified funds released). Each template uses `emailLayout()` from `layout.ts` and `escapeHtml()` from `utils.ts`. Define typed param interfaces for each.
**Files:** `src/features/email/templates/order-shipped.ts`, `src/features/email/templates/order-delivered.ts`, `src/features/email/templates/order-released.ts`
**AC:** Each template returns `{ subject, html }` matching the `EmailTemplate` type; all user-provided strings are escaped with `escapeHtml()`; templates use the branded email layout; `pnpm typecheck` passes
**Expert Domains:** nextjs

### Task 2.6: Register payment_intent.succeeded webhook handler

Create a Stripe webhook handler at `src/features/webhooks/handlers/stripe/payment-intent-succeeded.ts` that handles `payment_intent.succeeded` events. The handler should create an order row in the `orders` table using the admin client: extract listing_id, buyer_id, buyer_email, seller_id, amounts, and shipping_address from the PaymentIntent metadata. Register the handler in `src/features/webhooks/handlers/stripe/registry.ts`. This is how orders are created — the checkout flow (out of scope for this ticket) creates a PaymentIntent with metadata, and this webhook creates the order when payment succeeds.
**Files:** `src/features/webhooks/handlers/stripe/payment-intent-succeeded.ts`, `src/features/webhooks/handlers/stripe/registry.ts`
**AC:** Handler extracts order data from PaymentIntent metadata; inserts into `orders` table using admin client; sets listing status to `sold` via admin client; registered in registry under `payment_intent.succeeded`; `pnpm typecheck` passes
**Expert Domains:** supabase, nextjs

## Phase 3: Buyer pages

**Goal:** Build the buyer-facing order list page and order detail page with the status timeline.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 3.1: Create order card component

Create a reusable order card for the order list page. Displays: listing cover photo (via `next/image` with `fill` + `sizes`), listing title, order date, formatted price (via `formatPrice` from `@/features/shared/utils/format.ts`), and a status badge using the existing `Pill` component (`src/components/indicators/pill/`). Map order statuses to Pill colors: paid=primary, shipped=warning, delivered=success, verification=warning, released=success, disputed=error, refunded=default. Card links to `/dashboard/orders/[id]`. Mobile-first stacked layout.
**Files:** `src/features/orders/components/order-card/index.tsx`, `src/features/orders/components/order-card/order-card.module.scss`
**AC:** Renders listing thumbnail, title, price, date, and status pill; uses `next/image` with appropriate `sizes` attribute; uses existing `Pill` component for status badge; links to order detail page; responsive mobile-first layout; `pnpm build` passes
**Reuses:** `src/components/indicators/pill/`, `src/features/shared/utils/format.ts`
**Expert Domains:** nextjs, scss

### Task 3.2: Create buyer orders list page

Create the buyer orders page at `/dashboard/orders`. Server component that renders the page header ("My Orders") and a client component `OrderList` that uses `useOrders()` to fetch and display order cards. Show an empty state when no orders exist. Page should be protected by proxy.ts (already covers `/dashboard/*`).
**Files:** `src/app/(frontend)/dashboard/orders/page.tsx`, `src/features/orders/components/order-list/index.tsx`, `src/features/orders/components/order-list/order-list.module.scss`
**AC:** Page renders at `/dashboard/orders`; lists buyer's orders using order cards; shows empty state with message when no orders; protected by existing `/dashboard` route guard; mobile-first layout; `pnpm build` passes
**Reuses:** `src/components/indicators/pill/`
**Expert Domains:** nextjs, scss

### Task 3.3: Update order timeline component with aria-current and status mapping

The existing `OrderTimeline` component at `src/features/orders/components/order-timeline/` needs to be extended with `aria-current="step"` on the active step (accessibility requirement from the ticket). Also add a helper function `getTimelineSteps(order: OrderWithListing)` that maps an order's status and timestamps to the correct `TimelineStep[]` array with 5 steps: Paid, Shipped, Delivered, Verification, Released.
**Files:** `src/features/orders/components/order-timeline/index.tsx`, `src/features/orders/utils/get-timeline-steps.ts`
**AC:** Active step has `aria-current="step"` attribute; `getTimelineSteps` returns correct steps with timestamps populated from order data; step descriptions include contextual info (e.g., "3-day verification window" for verification step); `pnpm build` passes
**Expert Domains:** nextjs, scss

### Task 3.4: Create buyer order detail page

Create the order detail page at `/dashboard/orders/[id]`. Server component wrapper with a client component that uses `useOrder(orderId)` to fetch the order. Display: listing photo and title (linked to listing), price breakdown (item price, Nessi fee, shipping, total), `OrderTimeline` with steps from `getTimelineSteps`, tracking info (carrier + tracking number) when shipped, and the accept delivery button when status is `delivered` or `verification`. The accept button uses `useAcceptOrder()` mutation with a confirmation dialog. Show verification deadline countdown when in verification status.
**Files:** `src/app/(frontend)/dashboard/orders/[id]/page.tsx`, `src/features/orders/components/order-detail/index.tsx`, `src/features/orders/components/order-detail/order-detail.module.scss`
**AC:** Page renders at `/dashboard/orders/[id]`; shows full order details with timeline; accept button appears only in delivered/verification status; confirmation dialog before accepting; shows tracking info when available; shows verification deadline when in verification; price breakdown is accurate; mobile-first stacked layout; `pnpm build` passes
**Reuses:** `src/features/orders/components/order-timeline/`, `src/components/layout/confirmation-dialog/`, `src/features/shared/utils/format.ts`
**Expert Domains:** nextjs, scss

## Phase 4: Seller pages and ship modal

**Goal:** Build the seller-facing orders dashboard with tabbed view and the ship modal for marking orders as shipped.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 4.1: Create seller orders API route

Create a GET route at `/api/orders/seller` that returns orders where the authenticated user is the seller. Support a `status` query param for filtering. Follow the pattern of `GET /api/listings/seller`. Join listing data for display.
**Files:** `src/app/api/orders/seller/route.ts`
**AC:** Returns only orders where seller_id matches authenticated user; supports optional `status` filter param; never exposes `stripe_payment_intent_id`; returns 401 for unauthenticated; description comment present
**Expert Domains:** supabase, nextjs

### Task 4.2: Add seller orders hooks and client service

Add `getSellerOrders(status?)` to the client service. Create `use-seller-orders.ts` hook with `useSellerOrders(status?)` query (key: `['orders', 'seller', status]`). This is separate from the buyer hooks to allow independent caching.
**Files:** `src/features/orders/services/order.ts` (modify), `src/features/orders/hooks/use-seller-orders.ts`
**AC:** `getSellerOrders` calls `GET /api/orders/seller` with optional status param; `useSellerOrders` hook caches per status; `pnpm typecheck` passes
**Expert Domains:** state-management

### Task 4.3: Create ship modal component

Create a modal for sellers to mark orders as shipped. Contains: tracking number text input (required), carrier dropdown select (USPS, UPS, FedEx, DHL, Other), and a "Mark Shipped" submit button. Uses the existing `Modal` component from `src/components/layout/modal/`. On submit, calls `useShipOrder()` mutation. Shows `aria-busy` on submit button during pending state. Focus management: auto-focus tracking number input on open.
**Files:** `src/features/orders/components/ship-modal/index.tsx`, `src/features/orders/components/ship-modal/ship-modal.module.scss`
**AC:** Modal opens with auto-focused tracking number input; carrier dropdown has 5 options; submit is disabled until both fields are filled; shows loading state during submission; closes and invalidates orders on success; shows error toast on failure; `pnpm build` passes
**Reuses:** `src/components/layout/modal/`, `src/components/controls/input/`, `src/components/controls/select/`
**Expert Domains:** nextjs, scss

### Task 4.4: Create seller orders dashboard page

Create the seller orders page at `/dashboard/orders` (same route as buyer — the page should detect whether the user is viewing as buyer or seller based on context, or show both views). Better approach: create `/dashboard/sales` for the seller view to avoid route collision with the buyer page. This page uses the existing `Tabs` component (`src/components/controls/tabs/`) with three tabs: "Action Required" (status=paid), "Shipped" (status=shipped), "Completed" (status=released). Each tab renders a filtered order list using `useSellerOrders(status)`. Order rows show: listing thumbnail, title, buyer display name, price, status pill, and a "Ship" button (for paid orders) that opens the ship modal. Mobile-first: tabs scroll horizontally on small screens.
**Files:** `src/app/(frontend)/dashboard/sales/page.tsx`, `src/features/orders/components/seller-order-list/index.tsx`, `src/features/orders/components/seller-order-list/seller-order-list.module.scss`, `src/features/orders/components/seller-order-row/index.tsx`, `src/features/orders/components/seller-order-row/seller-order-row.module.scss`
**AC:** Page renders at `/dashboard/sales`; three tabs with correct filtering; "Action Required" tab shows orders needing shipment with Ship button; Ship button opens ship modal; order rows show listing thumbnail, title, buyer name, price, and status; mobile-first with horizontal tab scroll; `pnpm build` passes
**Reuses:** `src/components/controls/tabs/`, `src/components/indicators/pill/`
**Expert Domains:** nextjs, scss

### Task 4.5: Add Orders and Sales links to navigation

Add "Orders" link to the navbar account dropdown (buyer-facing, points to `/dashboard/orders`) and the side-nav member context (below Messages). Add "Sales" link to the side-nav member context for sellers (below Listings, gated by `isSeller`). Also add "Sales" to the shop context nav items with `requiredFeature: 'listings'`.
**Files:** `src/components/navigation/navbar/index.tsx` (modify), `src/components/navigation/side-nav/index.tsx` (modify)
**AC:** "Orders" appears in navbar dropdown for authenticated users; "Orders" appears in side-nav member context; "Sales" appears in side-nav for sellers (member context) and shop context; links point to correct routes; `pnpm build` passes
**Expert Domains:** nextjs

## Phase 5: Cron jobs, auto-release, and polish

**Goal:** Implement the Vercel Cron routes for auto-delivery and auto-release, add route protection for `/orders`, and handle edge cases.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles`

### Task 5.1: Create auto-release cron route

Create a Vercel Cron route at `/api/cron/orders-release` that runs daily. Authenticates via `CRON_SECRET` Bearer token (same pattern as `src/app/api/cron/price-drops/route.ts`). Finds orders where `status='verification'` AND `verification_deadline < now()`, updates them to `status='released'`, `escrow_status='released'`, `released_at=now()`. For each released order, triggers the Stripe Transfer (same logic as the accept route) and sends the released email to the seller. Returns a count of processed orders.
**Files:** `src/app/api/cron/orders-release/route.ts`
**AC:** Route authenticates with CRON_SECRET; finds and processes orders past verification deadline; triggers Stripe Transfer for each; updates status and escrow_status; sends seller email; returns `{ processed: number }`; description comment present
**Expert Domains:** supabase, nextjs

### Task 5.2: Create auto-deliver cron route

Create a Vercel Cron route at `/api/cron/orders-deliver` that runs daily. Authenticates via `CRON_SECRET`. Finds orders where `status='shipped'` AND `shipped_at < now() - 30 days`. Updates them to `status='delivered'`, sets `delivered_at=now()`, sets `verification_deadline = now() + 3 days`. Sends the delivered email to the buyer for each.
**Files:** `src/app/api/cron/orders-deliver/route.ts`
**AC:** Route authenticates with CRON_SECRET; finds shipped orders older than 30 days; updates to delivered with 3-day verification window; sends buyer email; returns `{ processed: number }`; description comment present
**Expert Domains:** supabase, nextjs

### Task 5.3: Register cron schedules in vercel.json

Add the two new cron routes to `vercel.json` alongside the existing price-drops and offers-expiry crons. Both run daily at midnight UTC.
**Files:** `vercel.json` (modify)
**AC:** `vercel.json` contains entries for `/api/cron/orders-release` and `/api/cron/orders-deliver` with `"schedule": "0 0 * * *"`; existing cron entries are preserved; file is valid JSON
**Expert Domains:** vercel

### Task 5.4: Add /orders route protection to proxy.ts

Update `src/proxy.ts` to redirect unauthenticated users from `/dashboard/orders` and `/dashboard/sales` to `/`. The existing guard already covers `/dashboard/*` so this is already handled — verify and add an explicit test note. No code change needed if the existing guard covers it, but confirm the route paths are under `/dashboard/`.
**Files:** `src/proxy.ts` (verify — likely no changes needed since `/dashboard/*` is already guarded)
**AC:** Unauthenticated users are redirected from `/dashboard/orders` and `/dashboard/sales` to `/`; existing proxy logic covers these routes without modification
**Expert Domains:** nextjs

### Task 5.5: Extract shared Stripe Transfer utility

Both the accept route (Task 2.4) and auto-release cron (Task 5.1) need identical Stripe Transfer logic. Extract a shared utility function `executeStripeTransfer({ orderId, amountCents, nessiFeeCents, stripePaymentIntentId, sellerStripeAccountId })` into the orders service layer. This keeps the Transfer logic DRY and testable. Update both callers to use it.
**Files:** `src/features/orders/services/stripe-transfer.ts`, `src/app/api/orders/[id]/accept/route.ts` (modify), `src/app/api/cron/orders-release/route.ts` (modify)
**AC:** Transfer utility encapsulates PaymentIntent charge retrieval + `stripe.transfers.create()`; both the accept route and auto-release cron use the shared utility; `pnpm typecheck` passes
**Expert Domains:** nextjs
