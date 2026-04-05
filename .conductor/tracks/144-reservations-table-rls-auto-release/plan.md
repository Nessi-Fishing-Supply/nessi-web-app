# Implementation Plan: #144 — Reservations Table, RLS Policies, and Auto-Release Function

## Overview
2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Database Migration — Table, RLS, and Function
**Goal:** Create the `reservations` table with constraints, RLS policies, and the `release_expired_reservations()` PostgreSQL function via a single SQL migration applied through Supabase MCP.
**Verify:** `pnpm build`

### Task 1.1: Create reservations table SQL migration and apply via MCP
Write and apply the SQL migration file `supabase/migrations/20260405200000_create_reservations.sql`. The migration must:

1. Create the `reservations` table with columns: `id` (uuid PK, default `gen_random_uuid()`), `listing_id` (uuid FK to `listings.id` ON DELETE CASCADE, UNIQUE), `reserved_by` (uuid FK to `members.id` ON DELETE CASCADE), `reserved_until` (timestamptz NOT NULL), `created_at` (timestamptz NOT NULL default `now()`).
2. Add indexes: `idx_reservations_reserved_by` on `reserved_by`, `idx_reservations_reserved_until` on `reserved_until` (used by the expiry function).
3. Enable RLS on the table.
4. Create RLS policies following the project pattern (`(SELECT auth.uid())` subquery form, scoped to `authenticated` role):
   - SELECT: `auth.uid() = reserved_by`
   - INSERT: `auth.uid() = reserved_by`
   - DELETE: `auth.uid() = reserved_by`
   - No UPDATE policy — reservations are immutable; to change, delete and re-create.
5. Create the `release_expired_reservations()` function (returns void, `SECURITY DEFINER`, `SET search_path = public`):
   - UPDATE `listings` SET `status = 'active'` WHERE `id IN (SELECT listing_id FROM reservations WHERE reserved_until < now())` AND `status = 'reserved'`
   - DELETE FROM `reservations` WHERE `reserved_until < now()`
6. Add a SQL comment documenting that `pg_cron` should be configured in the Supabase dashboard to call `SELECT release_expired_reservations()` on a schedule (e.g., every minute). The migration itself should not attempt to create the `pg_cron` job since `pg_cron` extension availability depends on the Supabase project plan and must be configured via the dashboard.

Follow the migration header comment style from existing migrations (see `20260405000000_create_orders.sql` for reference). Use `CREATE TABLE IF NOT EXISTS` for idempotency.

**Files:** `supabase/migrations/20260405200000_create_reservations.sql`
**AC:**
- `reservations` table exists with all 5 columns and correct types
- UNIQUE constraint on `listing_id` prevents duplicate reservations
- FK from `listing_id` to `listings.id` with ON DELETE CASCADE
- FK from `reserved_by` to `members.id` with ON DELETE CASCADE
- RLS is enabled with SELECT/INSERT/DELETE policies scoped to `auth.uid() = reserved_by`
- `release_expired_reservations()` function exists, updates expired listings to `active`, and deletes expired reservation rows
- The function is idempotent — only updates listings currently in `reserved` status
- Migration file follows existing naming and comment conventions
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.2: Apply migration to remote database via MCP
Execute the migration SQL against the Supabase project database using the Supabase MCP `execute_sql` tool. Verify the table, policies, and function were created successfully by querying `information_schema.tables`, `pg_policies`, and `pg_proc`.

**Files:** (no new files — executes SQL from Task 1.1)
**AC:**
- Migration applies without errors
- `SELECT * FROM information_schema.tables WHERE table_name = 'reservations'` returns a row
- RLS policies are visible in `pg_policies` for the `reservations` table
- `SELECT proname FROM pg_proc WHERE proname = 'release_expired_reservations'` returns a row
**Expert Domains:** supabase
**MCP:** supabase

## Phase 2: TypeScript Type Regeneration
**Goal:** Regenerate the TypeScript database types so application code can reference the new `reservations` table with full type safety.
**Verify:** `pnpm build`

### Task 2.1: Regenerate database types via pnpm db:types
Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. This will pick up the new `reservations` table and the `release_expired_reservations` function signature.

**Files:** `src/types/database.ts`
**AC:**
- `src/types/database.ts` contains a `reservations` table definition under `public.Tables`
- The type includes all 5 columns: `id`, `listing_id`, `reserved_by`, `reserved_until`, `created_at`
- `pnpm build` passes with the regenerated types
- `pnpm typecheck` passes
**Expert Domains:** supabase

### Task 2.2: Verify type correctness and build
Run `pnpm typecheck` and `pnpm build` to confirm the regenerated types are valid and do not break any existing code. If the `release_expired_reservations` function appears in the `Functions` section of the types, verify its signature is correct (no args, returns void).

**Files:** (no file changes — verification only)
**AC:**
- `pnpm typecheck` exits 0
- `pnpm build` exits 0
- No existing code is broken by the new types
**Expert Domains:** supabase, nextjs
