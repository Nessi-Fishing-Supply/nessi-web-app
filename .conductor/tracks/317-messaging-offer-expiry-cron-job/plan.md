# Implementation Plan: #317 — Messaging: Offer expiry cron job

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Enhance offer expiry service with system message insertion

**Goal:** Refactor `expirePendingOffersServer` to insert system messages into offer threads when expiring, using the admin client for all operations (no user session available in cron context).
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Refactor expirePendingOffersServer to insert system messages and return split counts

The existing `expirePendingOffersServer` in `src/features/messaging/services/offers-server.ts` already expires pending and accepted offers using the admin client, but it does NOT insert system messages into the offer threads, and it returns a single combined `{ expired }` count instead of the split `{ expired_pending, expired_checkout }` the cron route needs.

Refactor the function to: (1) select expired offers with their `thread_id` before (or after) the bulk status update, (2) for each expired offer, insert a system message (`type: 'system'`, `content: 'This offer has expired.'`) into the offer's thread using the admin client directly (cannot use `createMessageServer` — it requires cookie-based auth), (3) update thread metadata (`last_message_at`, `last_message_preview`), (4) wrap each offer's message insertion in try/catch so one failure does not block others, (5) add LIMIT 100 to both queries, (6) return `{ expired_pending: number, expired_checkout: number }` instead of the current combined count.

The system message `sender_id` should use the offer's `buyer_id` (as a convention for system-generated messages in the thread — the buyer initiated the offer). Alternatively, since system messages are rendered differently in the UI (centered, muted text via `MessageNode`), the sender is not prominently displayed, so either participant works. Use `buyer_id` for consistency with the thread initiator pattern.

**Files:** `src/features/messaging/services/offers-server.ts`
**AC:**

- `expirePendingOffersServer` returns `{ expired_pending: number, expired_checkout: number }`
- Each expired offer gets a system message with content `'This offer has expired.'` inserted in its thread via admin client
- Thread `last_message_at` and `last_message_preview` are updated for threads that receive system messages
- Individual offer message insertion failures are caught and do not block other offers
- Both queries have `LIMIT 100`
- Existing callers of `expirePendingOffersServer` (if any beyond the new cron route) still work with the updated return type
  **Expert Domains:** supabase

### Task 1.2: Update messaging CLAUDE.md to reflect the updated return type

Update the `expirePendingOffersServer` entry in the CLAUDE.md table to reflect the new return type `{ expired_pending: number, expired_checkout: number }` and note that it now inserts system messages.

**Files:** `src/features/messaging/CLAUDE.md`
**AC:**

- The `expirePendingOffersServer` row in the Server Services table shows the updated return type and description
  **Expert Domains:** supabase

## Phase 2: Create cron route and register in vercel.json

**Goal:** Create the `GET /api/cron/offers-expiry` route following the exact pattern from the price-drops cron, and register it in `vercel.json`.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 2.1: Create the offers-expiry cron route handler

Create `src/app/api/cron/offers-expiry/route.ts` following the exact pattern from `src/app/api/cron/price-drops/route.ts`: validate `Authorization: Bearer {CRON_SECRET}`, call `expirePendingOffersServer()`, return the split counts. The route must have a description comment above the handler per the API routes CLAUDE.md convention.

Pattern to follow from price-drops cron:

- Import `NextResponse` from `next/server`
- Validate auth header against `process.env.CRON_SECRET` — return 401 on mismatch
- Call the service function
- Return JSON response with counts
- Wrap in try/catch for top-level error handling (500)

**Files:** `src/app/api/cron/offers-expiry/route.ts`
**AC:**

- Route exists at `GET /api/cron/offers-expiry`
- Returns 401 with `{ error: 'Unauthorized' }` when `Authorization` header is missing or invalid
- Calls `expirePendingOffersServer()` and returns `{ expired_pending, expired_checkout }` on success
- Has a description comment above the export (`// Expire stale pending and accepted offers past their time windows`)
- Returns 500 with `{ error: '...' }` on service failure
- File follows the exact structural pattern of `src/app/api/cron/price-drops/route.ts`
  **Expert Domains:** nextjs, supabase

### Task 2.2: Add offers-expiry cron entry to vercel.json

Add the new cron job entry to the `crons` array in `vercel.json` with path `/api/cron/offers-expiry` and schedule `0 0 * * *` (daily at midnight UTC). Vercel Hobby plan allows max 2 crons — this will be the second one alongside price-drops.

**Files:** `vercel.json`
**AC:**

- `vercel.json` `crons` array has two entries: price-drops and offers-expiry
- New entry has `path: "/api/cron/offers-expiry"` and `schedule: "0 0 * * *"`
- JSON is valid and well-formatted
  **Expert Domains:** vercel
