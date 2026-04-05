# Orders Feature

Escrow-based order management for buyers and sellers. Orders are created by the Stripe webhook handler when a `payment_intent.succeeded` event fires — never directly by the client. Funds are held in escrow until the buyer accepts delivery or the verification window expires, at which point a Stripe Transfer releases payment to the seller.

## Overview

An order is created atomically when Stripe confirms payment on a listing checkout session. The order record holds the full financial snapshot (amount, Nessi fee, shipping cost), buyer/seller identities, and shipping details. The lifecycle moves through status and escrow states in tandem: the `status` column tracks the fulfillment stage visible to users; `escrow_status` tracks the financial state visible to the platform.

Sellers mark orders as shipped (providing tracking). The system auto-advances `delivered` after 30 days if the buyer hasn't confirmed. Buyers have a 3-day verification window after delivery to accept or dispute. If the window expires without action, a cron job auto-releases funds. If the buyer explicitly accepts, funds release immediately.

## Database Schema

### `orders` table

| Column                     | Type        | Constraints                                               |
| -------------------------- | ----------- | --------------------------------------------------------- |
| `id`                       | UUID        | PK, `gen_random_uuid()`                                   |
| `listing_id`               | UUID        | NOT NULL, FK `listings(id)`                               |
| `buyer_id`                 | UUID        | NULL, FK `members(id)` — NULL on account deletion         |
| `seller_id`                | UUID        | NOT NULL, FK `members(id)`                                |
| `buyer_email`              | TEXT        | NOT NULL — snapshot at purchase time                      |
| `amount_cents`             | INTEGER     | NOT NULL — total charged to buyer                         |
| `nessi_fee_cents`          | INTEGER     | NOT NULL — platform fee retained by Nessi                 |
| `shipping_cost_cents`      | INTEGER     | NOT NULL, DEFAULT `0`                                     |
| `shipping_address`         | JSONB       | NOT NULL — address snapshot at purchase time              |
| `stripe_payment_intent_id` | TEXT        | NOT NULL, UNIQUE — used for escrow and Stripe Transfer    |
| `status`                   | TEXT        | NOT NULL, DEFAULT `'paid'` — see `OrderStatus`            |
| `escrow_status`            | TEXT        | NOT NULL, DEFAULT `'held'` — see `EscrowStatus`           |
| `carrier`                  | TEXT        | NULL — set when seller marks shipped                      |
| `tracking_number`          | TEXT        | NULL — set when seller marks shipped                      |
| `shipped_at`               | TIMESTAMPTZ | NULL — timestamp when seller marks shipped                |
| `delivered_at`             | TIMESTAMPTZ | NULL — timestamp when delivered (manual or auto-advanced) |
| `buyer_accepted_at`        | TIMESTAMPTZ | NULL — timestamp when buyer explicitly accepts            |
| `verification_deadline`    | TIMESTAMPTZ | NULL — 3 days after `delivered_at`, set by ship route     |
| `released_at`              | TIMESTAMPTZ | NULL — timestamp when Stripe Transfer completes           |
| `created_at`               | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                                 |
| `updated_at`               | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                                 |

**Foreign keys:**

- `orders_buyer_id_fkey` — `buyer_id` → `members(id)` (nullable — buyer row may be deleted)
- `orders_seller_id_fkey` — `seller_id` → `members(id)`
- `orders_listing_id_fkey` — `listing_id` → `listings(id)`

**RLS Policies:**

- SELECT: authenticated users may read orders where `buyer_id = auth.uid()` OR `seller_id = auth.uid()`
- INSERT: service role only (orders are created exclusively by the webhook handler, never by the client)
- UPDATE: restricted to API routes running the server client; clients never update order rows directly

## Types

All types live in `src/features/orders/types/order.ts`.

### Base database types

```ts
type Order        // Database['public']['Tables']['orders']['Row']
type OrderInsert  // Database['public']['Tables']['orders']['Insert']
type OrderUpdate  // Database['public']['Tables']['orders']['Update']
```

### Status unions

```ts
type OrderStatus =
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'verification'
  | 'released'
  | 'disputed'
  | 'refunded';
type EscrowStatus = 'held' | 'released' | 'disputed' | 'refunded';
type Carrier = 'USPS' | 'UPS' | 'FedEx' | 'DHL' | 'Other';
```

### Enriched join type

```ts
type OrderWithListing = Order & {
  listing: { title: string; cover_photo_url: string | null };
  buyer: { first_name: string; last_name: string; avatar_url: string | null } | null;
  seller: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    stripe_account_id: string | null;
  };
};
```

Used by all list and detail views. Buyer is nullable because the buyer's account may have been deleted after the order was placed. Seller always exists (seller cannot delete account while orders are active).

### Timeline types and constants

```ts
type TimelineStepDef = {
  key: OrderStatus;
  label: string;
  getDescription: (order: Order) => string | undefined;
};
```

`TIMELINE_STEPS: TimelineStepDef[]` — ordered array of the 5 main progress steps (`paid`, `shipped`, `delivered`, `verification`, `released`). Disputed and refunded states are not shown in the timeline stepper but are handled in status pills.

`STATUS_PILL_MAP: Record<OrderStatus, 'primary' | 'warning' | 'success' | 'error' | 'default'>` — maps each status to a pill color variant:

| Status         | Pill variant |
| -------------- | ------------ |
| `paid`         | `primary`    |
| `shipped`      | `warning`    |
| `delivered`    | `success`    |
| `verification` | `warning`    |
| `released`     | `success`    |
| `disputed`     | `error`      |
| `refunded`     | `default`    |

`STATUS_LABELS: Record<OrderStatus, string>` — human-readable display labels for each status.

## Services

### Server service — `services/order-server.ts`

Used in API route handlers and cron jobs. All functions use the server Supabase client (user JWT from cookies) except the auto-release/deliver functions which receive an admin client.

All queries use the shared `ORDER_WITH_LISTING_SELECT` fragment:

```sql
*, listing:listings(title, cover_photo_url),
buyer:members!orders_buyer_id_fkey(first_name, last_name, avatar_url),
seller:members!orders_seller_id_fkey(first_name, last_name, avatar_url, stripe_account_id)
```

| Function                                                                       | Description                                                                                              |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `getOrdersByBuyerServer(): Promise<OrderWithListing[]>`                        | Returns all orders for the authenticated buyer, newest first                                             |
| `getOrdersBySellerServer(status?: string): Promise<OrderWithListing[]>`        | Returns orders for the authenticated seller, optionally filtered by status                               |
| `getOrderByIdServer(orderId: string): Promise<OrderWithListing \| null>`       | Returns a single order; returns null if the caller is neither buyer nor seller                           |
| `updateOrderStatusServer(orderId, updates): Promise<OrderWithListing \| null>` | Generic update used by ship and accept route handlers                                                    |
| `getOrdersForAutoReleaseServer(adminClient): Promise<OrderWithListing[]>`      | Returns `verification` orders past their `verification_deadline` with no buyer acceptance — used by cron |
| `getOrdersForAutoDeliverServer(adminClient): Promise<OrderWithListing[]>`      | Returns `shipped` orders where `shipped_at` is older than 30 days — used by cron                         |

`getOrderByIdServer` enforces access control in the application layer: it fetches the order without a user filter, then checks `buyer_id === user.id || seller_id === user.id` and returns null on mismatch.

### Client service — `services/order.ts`

Thin wrappers around the `@/libs/fetch` helpers. Used exclusively from client components via Tanstack Query hooks.

| Function                                                                | Endpoint called                     |
| ----------------------------------------------------------------------- | ----------------------------------- |
| `getOrders(): Promise<OrderWithListing[]>`                              | `GET /api/orders`                   |
| `getOrder(id: string): Promise<OrderWithListing>`                       | `GET /api/orders/[id]`              |
| `getSellerOrders(status?: string): Promise<OrderWithListing[]>`         | `GET /api/orders/seller[?status=…]` |
| `shipOrder(id, { trackingNumber, carrier }): Promise<OrderWithListing>` | `POST /api/orders/[id]/ship`        |
| `acceptOrder(id: string): Promise<OrderWithListing>`                    | `POST /api/orders/[id]/accept`      |

## Hooks

All hooks live in `src/features/orders/hooks/`. Import from the individual hook files — there is no barrel export.

### Query hooks

| Hook                               | Query key                      | Description                                        |
| ---------------------------------- | ------------------------------ | -------------------------------------------------- |
| `useOrders()`                      | `['orders']`                   | Buyer's full order history                         |
| `useOrder(orderId?: string)`       | `['orders', orderId]`          | Single order; disabled when `orderId` is undefined |
| `useSellerOrders(status?: string)` | `['orders', 'seller', status]` | Seller's orders, optionally filtered by status     |

### Mutation hooks

Both mutation hooks accept an options object `{ onSuccess?, onError? }` and invalidate the `['orders']` query tree on success.

| Hook               | Mutation function                              | Description                                   |
| ------------------ | ---------------------------------------------- | --------------------------------------------- |
| `useShipOrder()`   | `{ orderId, trackingNumber, carrier } => void` | Mark an order as shipped                      |
| `useAcceptOrder()` | `(orderId: string) => void`                    | Buyer accepts delivery, triggers fund release |

## Components

### `order-timeline/`

`src/features/orders/components/order-timeline/index.tsx`

A vertical progress stepper rendered as an accessible `<ol>`. Driven by generic `TimelineStep[]` data — it does not consume `TIMELINE_STEPS` or `Order` directly; callers map order data to `TimelineStep` objects before passing them in.

```ts
type TimelineStep = {
  label: string;
  description?: string;
  timestamp?: Date;
  icon?: ReactNode;
};

interface OrderTimelineProps {
  steps: TimelineStep[];
  currentStep: number; // index of the active step
  className?: string;
}
```

Each step is rendered in one of three states driven by comparing the step index to `currentStep`:

- `completed` (index < currentStep) — filled circle with `HiCheck` icon
- `active` (index === currentStep) — highlighted circle, current position
- `pending` (index > currentStep) — muted circle, not yet reached

Accessibility: `<ol aria-label="Order progress">`, decorative connector lines and icons use `aria-hidden="true"`, timestamps rendered with `<time dateTime={…}>`.

To render the standard 5-step order progress, map `TIMELINE_STEPS` from `types/order.ts` to `TimelineStep[]`:

```ts
const steps: TimelineStep[] = TIMELINE_STEPS.map((step) => ({
  label: step.label,
  description: step.getDescription(order),
}));
const STATUS_ORDER: OrderStatus[] = ['paid', 'shipped', 'delivered', 'verification', 'released'];
const currentStep = STATUS_ORDER.indexOf(order.status as OrderStatus);
```

## API Routes

These routes are to be built in Phase 2. The service layer and hooks are wired to these endpoints already.

| Method | Path                      | Auth            | Description                                                              |
| ------ | ------------------------- | --------------- | ------------------------------------------------------------------------ |
| GET    | `/api/orders`             | buyer           | Returns authenticated buyer's full order history as `OrderWithListing[]` |
| GET    | `/api/orders/[id]`        | buyer or seller | Returns a single order; 403 if caller is neither buyer nor seller        |
| GET    | `/api/orders/seller`      | seller          | Returns authenticated seller's orders; accepts `?status=` query param    |
| POST   | `/api/orders/[id]/ship`   | seller only     | Marks order shipped; body: `{ trackingNumber: string; carrier: string }` |
| POST   | `/api/orders/[id]/accept` | buyer only      | Buyer accepts delivery; triggers Stripe Transfer to release escrow       |

Route handlers must use `getOrderByIdServer` to load the order and verify caller ownership before mutating. The `stripe_payment_intent_id` field must never be returned to the client — omit it from API responses.

## Order Lifecycle

```
[paid] ──── seller ships ────► [shipped] ──── 30 days (cron) ────► [delivered]
                                                                          │
                                                              ┌───────────┴───────────┐
                                                   buyer accepts          3-day window expires (cron)
                                                              │                       │
                                                         [verification]          [verification]
                                                              │                       │
                                                    fund release (Stripe)   fund release (Stripe)
                                                              │                       │
                                                         [released] ◄────────────────┘

Dispute branch (from verification):
[verification] ──── buyer disputes ────► [disputed] ──── manual review ────► [refunded] or [released]
```

Status transitions are one-way and enforced in API route handlers — no client can move an order backwards or skip steps.

## Escrow Flow

1. **Capture** — Stripe `payment_intent.succeeded` fires; webhook handler creates the `orders` row with `status='paid'`, `escrow_status='held'`, and stores `stripe_payment_intent_id`.
2. **Hold** — Funds sit in the Nessi Stripe account. The order is visible to buyer and seller but no money moves.
3. **Ship** — Seller calls `POST /api/orders/[id]/ship`. `status` advances to `'shipped'`, `shipped_at` and `tracking_number` are set. A "shipped" email is sent to the buyer.
4. **Deliver** — Either the buyer manually confirms delivery (future UI), or the cron job auto-advances `shipped` → `delivered` after 30 days. `delivered_at` and `verification_deadline` (= delivered_at + 3 days) are set. A "delivered" email is sent to the buyer.
5. **Verify** — Buyer has 3 days to call `POST /api/orders/[id]/accept`. On accept: `buyer_accepted_at` is set, `status` → `'verification'` (brief), then immediately → `'released'`, Stripe Transfer fires for `amount_cents - nessi_fee_cents`, `escrow_status` → `'released'`, `released_at` is set.
6. **Auto-release** — Cron job queries orders in `verification` status with `verification_deadline < now()` and `buyer_accepted_at IS NULL`. For each, it fires the Stripe Transfer and updates status to `released`.
7. **Dispute** — Buyer disputes via support (future). Status moves to `'disputed'`, `escrow_status` → `'disputed'`. Resolved manually.

The `stripe_payment_intent_id` is the key used for Stripe Transfers — it links the held funds to the payout. This field is never returned in client API responses.

## Email Notifications

Three transactional emails are triggered by order events. All templates follow the shared layout in `src/features/email/`.

| Trigger                  | Template file (to be created) | Recipients | Key data                                |
| ------------------------ | ----------------------------- | ---------- | --------------------------------------- |
| Order marked shipped     | `order-shipped.tsx`           | Buyer      | Tracking number, carrier, listing title |
| Order marked delivered   | `order-delivered.tsx`         | Buyer      | Verification deadline, listing title    |
| Funds released to seller | `order-released.tsx`          | Seller     | Amount released, listing title          |

Emails are fire-and-forget — API route handlers send them after updating the order row, but do not await them or fail the request if the email call throws.

## Cron Jobs

Two cron jobs run on a scheduled basis (registered in `vercel.json`):

| Job          | Schedule | Endpoint (to be created)        | What it does                                                                              |
| ------------ | -------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Auto-deliver | Daily    | `POST /api/cron/orders/deliver` | Advances `shipped` orders older than 30 days to `delivered`, sets `verification_deadline` |
| Auto-release | Daily    | `POST /api/cron/orders/release` | Releases escrow for `verification` orders past their `verification_deadline`              |

Both cron endpoints are protected by `CRON_SECRET` header validation (same pattern as `/api/cron/watchlist/price-drop`). Both use the admin client via `getOrdersForAutoDeliverServer` / `getOrdersForAutoReleaseServer`.

## Key Patterns

**Webhook-created orders** — No client-facing route creates an order. The Stripe `payment_intent.succeeded` webhook handler in `src/features/webhooks/` is the sole insertion point. This ensures the order row is only written after Stripe confirms funds were captured.

**`stripe_payment_intent_id` is server-only** — This field links the escrow to the Stripe Transfer. It must never be returned in API responses. Strip it before serializing `OrderWithListing` to the client. The `OrderWithListing` type includes it (derived from the DB row) but API routes should omit it from JSON responses.

**RLS is the last line of defense** — API routes verify ownership in application code (`getOrderByIdServer` checks `buyer_id` / `seller_id`) before calling update functions. RLS policies provide backup enforcement at the database layer.

**Fire-and-forget emails** — Email dispatch happens after the order update succeeds. Route handlers do not `await` email calls and do not return errors to the client if email fails. This keeps the order mutation fast and decoupled from email deliverability.

**Seller cannot delete account with active orders** — The account deletion gate in `DELETE /api/auth/delete-account` should block deletion if the seller has orders in `paid`, `shipped`, `delivered`, or `verification` status. (To be enforced when account deletion is wired up for sellers.)

**Buyer `null` on deletion** — `buyer_id` is nullable (`ON DELETE SET NULL`). Order history is preserved for the seller even after the buyer deletes their account. `buyer_email` is a snapshot at purchase time and is always present.
