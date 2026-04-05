# Implementation Plan: #180 — POST /api/webhooks/stripe

## Overview

3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Webhooks Feature Domain Foundation

**Goal:** Create the webhooks feature domain with types, event-logging services, and CLAUDE.md
**Verify:** `pnpm build`

### Task 1.1: Create webhooks feature domain scaffold and types

Create `src/features/webhooks/` with handler types for the Stripe event router. Define a `StripeEventHandler` type alias (async function taking a Stripe event, returning void), and a `HandlerRegistry` type mapping event type strings to handler functions. Also create the feature barrel export.
**Files:** `src/features/webhooks/types/handler.ts`, `src/features/webhooks/index.ts`
**AC:** `src/features/webhooks/types/handler.ts` exports `StripeEventHandler` and `HandlerRegistry` types. Both are importable and `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.2: Create webhook event logging service

Create a server-side service that wraps Supabase admin client operations on the `webhook_events` table. Implement three functions: `insertWebhookEvent(eventId, eventType, source, payload)` inserts a row with status `'received'`; `markEventProcessed(eventId)` updates status to `'processed'` and sets `processed_at` to now; `markEventFailed(eventId, errorMessage)` updates status to `'failed'` with the error message. Use `createAdminClient()` from `@/libs/supabase/admin` (bypasses RLS). Import `WebhookEventInsert` and `WebhookEventUpdate` from `@/types/webhook`.
**Files:** `src/features/webhooks/services/event-logger.ts`
**AC:** All three functions are exported. `insertWebhookEvent` inserts into `webhook_events` with status `'received'`. `markEventProcessed` sets status to `'processed'` and `processed_at`. `markEventFailed` sets status to `'failed'` and `error_message`. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.3: Create deduplication check service

Create a function `isEventAlreadyProcessed(eventId: string): Promise<boolean>` in the same or a new service file. It queries `webhook_events` where `event_id` matches and `status` is `'processed'` or `'received'`. Returns `true` if a matching row exists (event should be skipped). Uses admin client.
**Files:** `src/features/webhooks/services/event-logger.ts`
**AC:** `isEventAlreadyProcessed` returns `true` when a row with the given `event_id` already exists in `webhook_events` with status `'processed'` or `'received'`, `false` otherwise. `pnpm typecheck` passes.
**Expert Domains:** supabase

## Phase 2: API Route and Handler Registry

**Goal:** Build the Stripe webhook POST endpoint with signature verification, deduplication, and handler dispatch
**Verify:** `pnpm build`

### Task 2.1: Create Stripe handler registry

Create the handler registry that maps Stripe event type strings to handler functions. Export a `handleStripeEvent` function that accepts a `Stripe.Event`, looks up the handler by `event.type`, and calls it if found. If no handler is registered for the event type, return gracefully (no error). The registry map starts empty — future tickets will register handlers. Use the `StripeEventHandler` type from Task 1.1.
**Files:** `src/features/webhooks/handlers/stripe/registry.ts`
**AC:** `handleStripeEvent(event)` is exported. When called with an event whose type has no registered handler, it resolves without error. The registry map is typed as `HandlerRegistry`. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 2.2: Create POST /api/webhooks/stripe route

Create the webhook API route. The POST handler must: (1) read raw body via `request.text()` and get the `stripe-signature` header; (2) call `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` — return 400 on verification failure; (3) after valid signature, check deduplication via `isEventAlreadyProcessed` — if duplicate, return 200 immediately; (4) insert the event via `insertWebhookEvent` with source `'stripe'`; (5) call `handleStripeEvent` in a try/catch — on success call `markEventProcessed`, on failure call `markEventFailed` with the error message and `console.error` the failure; (6) always return 200 after valid signature (even on handler failure). Use `getStripe()` from `@/libs/stripe/client`. Add the required description comment above the export. Do NOT use `AUTH_CACHE_HEADERS` — this endpoint is not auth-gated.
**Files:** `src/app/api/webhooks/stripe/route.ts`
**AC:** POST handler verifies Stripe signature and returns 400 on invalid signature. Duplicate events return 200 without re-processing. Valid new events are inserted into `webhook_events`, routed through the handler registry, and status is updated to `'processed'` or `'failed'`. Always returns 200 after valid signature. Has description comment above the export. `pnpm build` passes.
**Expert Domains:** nextjs, supabase

## Phase 3: Documentation

**Goal:** Create the webhooks feature CLAUDE.md documenting architecture, patterns, and extension points
**Verify:** `pnpm build`

### Task 3.1: Create src/features/webhooks/CLAUDE.md

Write the feature CLAUDE.md following the pattern established by other features (e.g., `src/features/notifications/CLAUDE.md`). Document: overview (webhook ingestion and event routing), database schema (`webhook_events` table columns and purpose), architecture (types, services, handlers, API route), the handler registry pattern (how future tickets add handlers by registering in the registry map), event lifecycle (received -> processed/failed), key patterns (always-200 after signature verification, deduplication, fire-and-forget handler errors), directory structure tree, and related features (Stripe payments, orders).
**Files:** `src/features/webhooks/CLAUDE.md`
**AC:** CLAUDE.md exists, documents the webhook_events table schema, handler registry extension pattern, event lifecycle, and directory structure. Follows the structure of existing feature CLAUDE.md files.
**Expert Domains:** nextjs, supabase
