# Implementation Plan: #179 — feat(webhooks): create webhook_events table

## Overview

2 phases, 3 total tasks
Estimated scope: small

## Phase 1: Create webhook_events table with RLS and indexes

**Goal:** Apply a Supabase migration that creates the webhook_events table with all columns, constraints, indexes, and deny-all RLS policies
**Verify:** `pnpm build`

### Task 1.1: Apply webhook_events migration via Supabase MCP

Create a migration that defines the webhook_events table for idempotent webhook event processing. The table stores incoming events from Stripe and EasyPost with a unique event_id constraint to prevent duplicate processing. RLS must deny all access since this table is server-only, accessed exclusively via the admin client which bypasses RLS.

The migration must follow the established pattern from existing migrations (e.g., `20260323000000_create_cart_items.sql`): header comment block, numbered step comments, `CREATE TABLE IF NOT EXISTS`, indexes with `IF NOT EXISTS`, `ENABLE ROW LEVEL SECURITY`, and explicit deny-all policies.

**Migration name:** `create_webhook_events`
**MCP:** `mcp__plugin_supabase_supabase__apply_migration` — apply the following SQL:

```sql
-- ============================================================
-- Migration: create_webhook_events
-- Created: 2026-04-04
-- Creates the webhook_events table for idempotent processing
-- of incoming webhooks from Stripe, EasyPost, and future
-- integrations. Server-only — accessed via admin client.
-- ============================================================

-- ============================================================
-- Step 1: Create webhook_events table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       TEXT          NOT NULL,
  source         TEXT          NOT NULL,
  event_type     TEXT          NOT NULL,
  payload        JSONB         NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT          NOT NULL DEFAULT 'received'
                               CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  error_message  TEXT,
  processed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_event_id_unique UNIQUE (event_id)
);

-- ============================================================
-- Step 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_webhook_events_source_event_type
  ON public.webhook_events (source, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON public.webhook_events (created_at);

-- ============================================================
-- Step 3: Enable RLS
-- ============================================================

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: RLS policies — deny all (server-only table)
-- ============================================================
-- No policies are created. With RLS enabled and no permissive
-- policies, all access via anon/authenticated roles is denied.
-- This table is accessed exclusively via the admin client
-- (service_role key), which bypasses RLS.
```

**Files:** `supabase/migrations/{timestamp}_create_webhook_events.sql` (created by MCP)
**AC:**

- Table `public.webhook_events` exists with all specified columns and correct types
- `event_id` column has a UNIQUE constraint
- `status` column has a CHECK constraint allowing only `received`, `processing`, `processed`, `failed`
- Composite index exists on `(source, event_type)`
- Index exists on `created_at`
- RLS is enabled with zero permissive policies (deny-all for non-service-role)
  **Expert Domains:** supabase

## Phase 2: Regenerate TypeScript types

**Goal:** Regenerate the Supabase TypeScript types so the new webhook_events table is available in the Database type
**Verify:** `pnpm build`

### Task 2.1: Regenerate database types via pnpm db:types

Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. This ensures the `webhook_events` table appears in the `Database['public']['Tables']` type, making it available for typed queries via the admin client.

**Files:** `src/types/database.ts` (regenerated)
**AC:**

- `src/types/database.ts` contains a `webhook_events` table definition under `public.Tables`
- The `Row` type includes all columns: `id`, `event_id`, `source`, `event_type`, `payload`, `status`, `error_message`, `processed_at`, `created_at`
- `payload` is typed as `Json`
- `error_message` and `processed_at` are nullable
- `pnpm build` passes with no type errors
  **Expert Domains:** supabase

### Task 2.2: Add webhook_events convenience type export

Create a TypeScript type alias for the webhook_events row, following the pattern used by other features (e.g., `src/features/members/types/member.ts` extracts `Member` from `Database['public']['Tables']['members']['Row']`). Since webhooks is infrastructure rather than a feature domain, place this in `src/types/webhook.ts` alongside `database.ts`.

**Files:** `src/types/webhook.ts` (new)
**AC:**

- File exports `WebhookEvent` type alias extracted from `Database['public']['Tables']['webhook_events']['Row']`
- File exports `WebhookEventInsert` type alias from the `Insert` variant
- File exports `WebhookEventUpdate` type alias from the `Update` variant
- `pnpm build` passes
  **Expert Domains:** supabase
