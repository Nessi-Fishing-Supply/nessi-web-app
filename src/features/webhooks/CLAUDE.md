# Webhooks Feature

## Overview

Webhook ingestion and event routing — receives incoming webhook events from external services (Stripe), verifies signatures, deduplicates events, routes to domain-specific handlers, and tracks event lifecycle in the database.

## Database Schema

### `webhook_events` table

| Column        | Type        | Default           | Notes                                       |
| ------------- | ----------- | ----------------- | ------------------------------------------- |
| id            | UUID        | gen_random_uuid() | PK                                          |
| event_id      | TEXT        |                   | NOT NULL, unique ID from the source service |
| event_type    | TEXT        |                   | NOT NULL, e.g. `checkout.session.completed` |
| source        | TEXT        |                   | NOT NULL, e.g. `stripe`                     |
| status        | TEXT        | `received`        | One of: `received`, `processed`, `failed`   |
| payload       | JSONB       |                   | Full event payload from the source          |
| error_message | TEXT        |                   | Nullable, populated on handler failure      |
| processed_at  | TIMESTAMPTZ |                   | Nullable, set when status → `processed`     |
| created_at    | TIMESTAMPTZ | NOW()             |                                             |

**RLS:** Admin client only — webhook events are system-level, not user-scoped.

## Architecture

### Event Lifecycle

```
Stripe POST → signature verification → deduplication check → insert (status: received)
  → handler dispatch → markProcessed (status: processed)
                      → markFailed (status: failed, error_message set)
```

### Key Patterns

- **Always return 200 after valid signature** — even if the handler fails. Returning non-200 causes Stripe to retry the event, which we've already recorded. Failures are tracked in the database for investigation.
- **Deduplication** — before processing, check if `event_id` already exists with status `received` or `processed`. Stripe may send the same event multiple times.
- **Fire-and-forget handler errors** — handler failures are logged and recorded in `webhook_events`, but never bubble up to the HTTP response.
- **Admin client only** — all database operations use `createAdminClient()` since webhook events are system-level and not tied to a user session.

### Handler Registry

The handler registry at `src/features/webhooks/handlers/stripe/registry.ts` maps Stripe event type strings to async handler functions. To add a new handler:

1. Create a handler file in `src/features/webhooks/handlers/stripe/` (e.g., `checkout-session.ts`)
2. Export an async function matching the `StripeEventHandler` signature: `(event: Stripe.Event) => Promise<void>`
3. Import and register it in `registry.ts` by adding it to the `registry` map:

   ```ts
   import { handleCheckoutSessionCompleted } from './checkout-session';

   const registry: HandlerRegistry = {
     'checkout.session.completed': handleCheckoutSessionCompleted,
   };
   ```

## Directory Structure

```
src/features/webhooks/
├── CLAUDE.md
├── index.ts                           # Barrel export (types)
├── types/
│   └── handler.ts                     # StripeEventHandler, HandlerRegistry
├── services/
│   └── event-logger.ts                # insertWebhookEvent, markEventProcessed, markEventFailed, isEventAlreadyProcessed
└── handlers/
    └── stripe/
        └── registry.ts                # handleStripeEvent + event type → handler map
```

## API Route

`POST /api/webhooks/stripe` — receives Stripe webhook events. No auth required (signature-verified by Stripe signing secret).

## Environment Variables

| Variable                | Scope       | Description                                       |
| ----------------------- | ----------- | ------------------------------------------------- |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret (`whsec_*`)         |
| `STRIPE_SECRET_KEY`     | Server only | Used by `getStripe()` to initialize Stripe client |

## Related Features

- **Stripe** (`src/libs/stripe/`) — Stripe client singleton
- **Payments** (future) — checkout session handlers will register in the handler registry
