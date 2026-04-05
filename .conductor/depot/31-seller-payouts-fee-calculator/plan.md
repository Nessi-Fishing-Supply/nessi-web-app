# Implementation Plan: #31 — Seller Payouts, Fee Calculator & Dispute Webhook

## Overview

4 phases, 14 total tasks
Estimated scope: medium

**Key codebase findings:**

- Fee logic already exists in `src/features/shared/utils/format.ts` (`calculateFee`, `calculateNet`, `formatPrice`) — reuse directly, no need for a separate `calculateNessiFee`
- Webhook registry pattern in `src/features/webhooks/handlers/stripe/registry.ts` — add `charge.dispute.created` handler
- Email templates follow the pattern in `src/features/email/templates/` — plain HTML with `emailLayout()` wrapper
- Stripe client singleton at `src/libs/stripe/client.ts` via `getStripe()`
- `stripe_account_id` and `is_stripe_connected` live on the `members` table
- Orders table has `status` (includes `'disputed'`) and `escrow_status` (includes `'disputed'`) columns
- Client services use `get`/`post` from `@/libs/fetch` — thin wrappers around `fetch`
- Tanstack Query hooks follow the pattern in `src/features/orders/hooks/` — one hook per file
- No `/dashboard/payouts` page exists yet — create from scratch
- No `/sell` page exists yet — create from scratch
- No `src/features/transactions/` directory exists — the ticket references it but the fee utils are in `shared/utils`

**Decision: No `transactions` feature domain.** The ticket assumes a `transactions` feature that doesn't exist. Instead:

- Payout components go in `src/features/orders/components/` (payouts are order-derived data)
- Payout hooks go in `src/features/orders/hooks/`
- Payout client services go in `src/features/orders/services/`
- API routes go in `src/app/api/stripe/` for Stripe-specific endpoints
- Fee calculator is a standalone page component (no feature domain needed)

---

## Phase 1: Stripe API Routes (Balance + Payouts)

**Goal:** Create server-side API routes that fetch Stripe balance and transfer history for authenticated sellers.
**Verify:** `pnpm build`

### Task 1.1: Create Stripe balance API route

Create `src/app/api/stripe/balance/route.ts` — GET handler that fetches the authenticated seller's Stripe Connect balance. Must verify the user is authenticated (401), has `is_stripe_connected` and `stripe_account_id` (403), then call `stripe.balance.retrieve({ stripeAccount })` and return `{ available, pending }` amounts in cents.

**Files:** `src/app/api/stripe/balance/route.ts`
**AC:**

- Returns 401 for unauthenticated requests
- Returns 403 for users without `stripe_account_id`
- Returns `{ available: number, pending: number }` from Stripe Balance API
- Uses `getStripe()` from `@/libs/stripe/client`
- Uses server Supabase client to get the current user's member record
- Has description comment above the handler

**Expert Domains:** nextjs

### Task 1.2: Create Stripe payouts (transfers) API route

Create `src/app/api/stripe/payouts/route.ts` — GET handler that fetches payout/transfer history for the authenticated seller's connected account. Returns paginated list of transfers with amount, fee, net, date, and associated order ID (from transfer metadata). Supports `?limit=` and `?starting_after=` query params for cursor-based pagination. Add `Cache-Control: private, max-age=300` header for 5-minute caching.

**Files:** `src/app/api/stripe/payouts/route.ts`
**AC:**

- Returns 401 for unauthenticated requests
- Returns 403 for users without `stripe_account_id`
- Returns paginated list of transfers: `{ transfers: TransferItem[], hasMore: boolean, nextCursor: string | null }`
- Each `TransferItem` includes: `id`, `amount` (cents), `nessiFeeCents`, `netAmount` (cents), `createdAt` (ISO string), `orderId` (from metadata, nullable)
- Respects `?limit=` (default 20, max 100) and `?starting_after=` for pagination
- Sets `Cache-Control: private, max-age=300` response header
- Has description comment above the handler

**Expert Domains:** nextjs

### Task 1.3: Create payout types and client services

Create types for the balance and payout API responses, and thin client service functions that call the API routes via `@/libs/fetch`.

**Files:** `src/features/orders/types/payout.ts`, `src/features/orders/services/payout.ts`
**AC:**

- `SellerBalance` type: `{ available: number; pending: number }`
- `TransferItem` type: `{ id: string; amount: number; nessiFeeCents: number; netAmount: number; createdAt: string; orderId: string | null }`
- `PayoutHistoryResponse` type: `{ transfers: TransferItem[]; hasMore: boolean; nextCursor: string | null }`
- Client service `getSellerBalance()` calls `GET /api/stripe/balance`
- Client service `getPayoutHistory(params?)` calls `GET /api/stripe/payouts` with optional limit/cursor

### Task 1.4: Create Tanstack Query hooks for balance and payouts

Create query hooks that wrap the client services with proper query keys and stale times.

**Files:** `src/features/orders/hooks/use-seller-balance.ts`, `src/features/orders/hooks/use-payout-history.ts`
**AC:**

- `useSellerBalance(enabled?)` — query key `['stripe', 'balance']`, 5-minute staleTime, disabled when `enabled` is false
- `usePayoutHistory(enabled?)` — query key `['stripe', 'payouts']`, 5-minute staleTime, disabled when `enabled` is false
- Both follow the existing hook pattern (one hook per file, named export)

**Expert Domains:** state-management

---

## Phase 2: Payout Dashboard UI

**Goal:** Build the `/dashboard/payouts` page with pending escrow balance, Stripe available balance, and payout history table.
**Verify:** `pnpm build`

### Task 2.1: Create pending escrow balance component

Create a component that queries the orders table (via existing `useSellerOrders`) and sums `amount_cents - nessi_fee_cents` for orders with `escrow_status = 'held'`. Display as a card with the pending amount.

**Files:** `src/features/orders/components/pending-balance/index.tsx`, `src/features/orders/components/pending-balance/pending-balance.module.scss`
**AC:**

- Shows formatted dollar amount of pending escrow (sum of held orders' seller net)
- Shows "Pending Escrow" label with brief explanation
- Shows count of held orders
- Loading state while data fetches
- Handles zero state ("No pending funds")
- Mobile-first styling with CSS custom property tokens

**Expert Domains:** scss

### Task 2.2: Create available balance component

Create a component that displays the seller's Stripe available and pending balances using the `useSellerBalance` hook.

**Files:** `src/features/orders/components/available-balance/index.tsx`, `src/features/orders/components/available-balance/available-balance.module.scss`
**AC:**

- Shows Stripe available balance and Stripe pending balance as formatted dollar amounts
- Labels: "Available for Payout" and "Processing"
- Loading skeleton while fetching
- Error state if Stripe API fails
- Mobile-first card styling

**Expert Domains:** scss

### Task 2.3: Create payout history table component

Create a table component displaying transfer history with date, order link, gross amount, fee withheld, and net received. Must horizontally scroll on mobile.

**Files:** `src/features/orders/components/payout-history/index.tsx`, `src/features/orders/components/payout-history/payout-history.module.scss`
**AC:**

- Table columns: Date, Order, Amount, Fee, Net Received
- Date formatted as "MMM D, YYYY"
- Order column links to `/dashboard/orders/{orderId}` when orderId is available
- Amounts formatted via `formatPrice()` from shared utils
- Empty state: "No payouts yet"
- Loading state with skeleton rows
- Table wrapper with `overflow-x: auto` for mobile horizontal scroll
- Accessible: `<table>` with `<caption>`, `<thead>`, `<tbody>`, proper `scope` attributes

**Expert Domains:** scss

### Task 2.4: Create the payouts dashboard page

Create `src/app/(frontend)/dashboard/payouts/page.tsx` that composes the balance cards and payout history table. Must check if the seller has completed Stripe onboarding — if not, show an onboarding prompt; if yes, show the full payout dashboard.

**Files:** `src/app/(frontend)/dashboard/payouts/page.tsx`, `src/app/(frontend)/dashboard/payouts/payouts-page.module.scss`
**AC:**

- Checks `is_stripe_connected` from the member record
- When NOT connected: shows a message directing to Stripe Connect setup (placeholder — Ticket 1 scope)
- When connected: shows PendingBalance + AvailableBalance cards side by side (stacked on mobile), then PayoutHistory table below
- Page heading: "Payouts"
- `'use client'` directive (uses hooks)
- Mobile-first layout: single column on mobile, two-column balance cards on tablet+

**Expert Domains:** nextjs, scss

---

## Phase 3: Public Fee Calculator

**Goal:** Build the `/sell` page with a public, SEO-friendly fee calculator that shows Nessi's pricing vs competitors.
**Verify:** `pnpm build`

### Task 3.1: Create the fee calculator component

Create a client component with a price input field that calculates and displays Nessi's fee, seller net payout, and competitor comparison in real time. Uses `calculateFee` and `calculateNet` from `src/features/shared/utils/format.ts`.

**Files:** `src/app/(frontend)/sell/fee-calculator.tsx`, `src/app/(frontend)/sell/fee-calculator.module.scss`
**AC:**

- Dollar input field (accepts decimal values, converts to cents internally)
- Live calculation display: "Nessi fee: $X.XX", "You receive: $X.XX"
- Competitor comparison table: eBay (~13.25%), Tackle Traders (~10%), Nessi (uses `calculateFee`)
- Each competitor row shows: platform name, fee percentage, fee amount, seller net
- Large, tap-friendly input (44px+ height, 16px+ font to prevent iOS zoom)
- Mobile-first: single column, full-width input
- Accessible: input has `<label>`, table has `<caption>`, results use `aria-live="polite"` for screen reader updates
- No auth required

**Expert Domains:** scss

### Task 3.2: Create the /sell page

Create the server page component at `src/app/(frontend)/sell/page.tsx` with SEO metadata, headline copy, and the fee calculator component. This is a public, unauthenticated page designed to attract sellers.

**Files:** `src/app/(frontend)/sell/page.tsx`, `src/app/(frontend)/sell/sell-page.module.scss`
**AC:**

- SEO metadata: `title: "Sell Your Fishing Gear"`, `description` mentioning low fees
- `generateMetadata()` export for dynamic page metadata
- Heading: "Sell Your Fishing Gear on Nessi"
- Subheading explaining low fees / value proposition
- Embeds `<FeeCalculator />` component
- CTA section below calculator: "Ready to start selling?" with link to signup/onboarding
- Public page — no auth check
- Mobile-first layout

**Expert Domains:** nextjs, scss

---

## Phase 4: Dispute Webhook + Notification Emails

**Goal:** Handle `charge.dispute.created` webhook events by updating order status and sending notification emails.
**Verify:** `pnpm build`

### Task 4.1: Create dispute notification email template

Create an email template for dispute notifications sent to both buyer and seller when a Stripe dispute is filed.

**Files:** `src/features/email/templates/order-disputed.ts`
**AC:**

- Follows existing email template pattern (`emailLayout()` wrapper, `escapeHtml()` for user content)
- Params: `recipientFirstName`, `listingTitle`, `orderId`, `role` ('buyer' | 'seller')
- Subject: "A dispute has been filed — {listingTitle}"
- Body varies by role: buyer sees "A dispute has been filed on your order", seller sees "A dispute has been filed by the buyer"
- Includes CTA button linking to `/dashboard/orders/{orderId}`
- Returns `EmailTemplate` type

### Task 4.2: Create dispute webhook handler

Create a handler for `charge.dispute.created` Stripe events. Must find the order by `stripe_payment_intent_id`, update `status` to `'disputed'` and `escrow_status` to `'disputed'`, then send notification emails to buyer and seller.

**Files:** `src/features/webhooks/handlers/stripe/charge-dispute-created.ts`
**AC:**

- Extracts `payment_intent` from the dispute object
- Queries the `orders` table by `stripe_payment_intent_id` to find the matching order
- Updates `status = 'disputed'`, `escrow_status = 'disputed'` using admin client
- Fetches buyer and seller member records for email addresses
- Sends dispute notification email to buyer (if buyer exists) and seller
- Logs warning and returns gracefully if no matching order found
- Uses `createAdminClient()` for all DB operations (webhook context, no user session)

### Task 4.3: Register dispute handler in webhook registry

Add the `charge.dispute.created` handler to the Stripe webhook registry.

**Files:** `src/features/webhooks/handlers/stripe/registry.ts`
**AC:**

- Imports `handleChargeDisputeCreated` from `./charge-dispute-created`
- Adds `'charge.dispute.created': handleChargeDisputeCreated` to the registry map
- Existing `payment_intent.succeeded` handler unchanged

### Task 4.4: Update orders CLAUDE.md with payout and dispute documentation

Update the orders feature CLAUDE.md to document the new payout hooks, types, components, and the dispute webhook flow.

**Files:** `src/features/orders/CLAUDE.md`
**AC:**

- Documents `payout.ts` types (SellerBalance, TransferItem, PayoutHistoryResponse)
- Documents `payout.ts` client service functions
- Documents `use-seller-balance` and `use-payout-history` hooks
- Documents payout dashboard components (PendingBalance, AvailableBalance, PayoutHistory)
- Documents the dispute webhook flow and status transitions
- Adds dispute notification email to the email notifications table
