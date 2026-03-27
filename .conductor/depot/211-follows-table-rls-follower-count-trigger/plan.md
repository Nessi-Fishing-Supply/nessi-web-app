# Implementation Plan: #211 — follows table, RLS, follower_count columns, and trigger

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Database Schema — follows table, columns, trigger, and RLS

**Goal:** Create the `follows` table with all constraints, add `follower_count` to `members` and `shops`, create the `update_follower_count()` trigger, and apply RLS policies — all in a single migration.
**Verify:** `pnpm build`

### Task 1.1: Create follows migration SQL file

Write the migration file `supabase/migrations/20260326200000_create_follows.sql` with the following sections:

1. **Table:** `public.follows` with columns `id` (UUID PK, `gen_random_uuid()`), `follower_id` (UUID NOT NULL FK `public.members(id) ON DELETE CASCADE`), `target_type` (TEXT NOT NULL CHECK IN `('member', 'shop')`), `target_id` (UUID NOT NULL, polymorphic — no FK since it points to either members or shops), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT `now()`).
2. **Constraints:** `UNIQUE (follower_id, target_type, target_id)` to prevent duplicate follows. CHECK constraint: `NOT (target_type = 'member' AND follower_id = target_id)` to prevent self-follows.
3. **Indexes:** `follows_follower_id_idx` on `follower_id`, `follows_target_type_target_id_idx` on `(target_type, target_id)` for efficient lookups of "who follows this entity".
4. **RLS:** Enable RLS. Policy "Follows are viewable by everyone" — `SELECT` for `authenticated, anon` with `USING (true)`. Policy "Users can insert own follows" — `INSERT` for `authenticated` with `WITH CHECK (follower_id = (SELECT auth.uid()))`. Policy "Users can delete own follows" — `DELETE` for `authenticated` with `USING (follower_id = (SELECT auth.uid()))`.
5. **Alter members:** `ALTER TABLE public.members ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0`.
6. **Alter shops:** `ALTER TABLE public.shops ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0`.
7. **Trigger function:** `update_follower_count()` — on INSERT, increment the appropriate table's `follower_count` by 1 (choosing members or shops based on `NEW.target_type`). On DELETE, decrement by 1 (using `OLD.target_type` and `OLD.target_id`). Use `SECURITY DEFINER` with `SET search_path = public` since RLS might block the update otherwise.
8. **Trigger:** `on_follows_change` — `AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.update_follower_count()`.

Follow the migration style established in `20260326000000_create_reports.sql` and `20260323000000_create_cart_items.sql` — numbered section headers with `============` dividers, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`.

**Files:** `supabase/migrations/20260326200000_create_follows.sql`
**AC:**

- The migration file contains a valid `CREATE TABLE` for `follows` with all five columns and correct types
- UNIQUE constraint on `(follower_id, target_type, target_id)` is present
- CHECK constraint prevents `follower_id = target_id` when `target_type = 'member'`
- CHECK constraint limits `target_type` to `'member'` or `'shop'`
- RLS is enabled with three policies: public SELECT, INSERT own, DELETE own
- `follower_count` column is added to both `members` and `shops` tables
- Trigger function `update_follower_count()` correctly increments/decrements based on `target_type`
- Trigger fires on INSERT and DELETE of `follows` rows
  **Expert Domains:** supabase

### Task 1.2: Apply the migration via MCP

Execute the migration SQL against the Supabase database using the Supabase MCP tool. Verify the table, columns, constraints, RLS policies, and trigger are all created successfully by querying the database schema.

**MCP:** supabase
**Files:** `supabase/migrations/20260326200000_create_follows.sql` (read and execute)
**AC:**

- `follows` table exists in `public` schema with correct columns and constraints
- `follower_count` column exists on both `members` and `shops` tables with default 0
- RLS is enabled on `follows` with three policies
- `update_follower_count()` function exists
- `on_follows_change` trigger exists on `follows` table
  **Expert Domains:** supabase

## Phase 2: Type Regeneration and Feature Scaffold

**Goal:** Regenerate TypeScript database types to include the new `follows` table and updated `members`/`shops` columns, and create the follows feature directory with its CLAUDE.md.
**Verify:** `pnpm build`

### Task 2.1: Regenerate database types

Run `pnpm db:types` to regenerate `src/types/database.ts` with the new `follows` table definition and the `follower_count` column on `members` and `shops`.

**Files:** `src/types/database.ts`
**AC:**

- `database.ts` contains a `follows` table definition with `Row`, `Insert`, and `Update` types
- `follows.Row` includes `id`, `follower_id`, `target_type`, `target_id`, `created_at`
- `members.Row` includes `follower_count: number`
- `shops.Row` includes `follower_count: number`
- `pnpm build` passes with no type errors
  **Expert Domains:** supabase

### Task 2.2: Create follows feature CLAUDE.md

Create the `src/features/follows/` directory with a `CLAUDE.md` documenting the follows feature architecture. This establishes the feature domain for future tasks (API routes, hooks, components from sibling tickets in #155).

The CLAUDE.md should document: the `follows` table schema, the polymorphic `target_type` pattern, the `follower_count` denormalized columns and their trigger, the RLS policy summary, and placeholders for future services/hooks/components that will be added by sibling tickets.

**Files:** `src/features/follows/CLAUDE.md`
**AC:**

- `src/features/follows/` directory exists
- `CLAUDE.md` documents the follows table schema, constraints, RLS policies, and trigger behavior
- `CLAUDE.md` notes the polymorphic target pattern and that `follower_count` is maintained by a database trigger
- `pnpm build` passes
  **Expert Domains:** supabase
