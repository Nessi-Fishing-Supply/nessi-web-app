# Implementation Plan: #123 — feat(cart): database migration, RLS policies, and cleanup trigger

## Overview

2 phases, 3 total tasks
Estimated scope: small

## Phase 1: Database Migration

**Goal:** Create the `cart_items` table with all columns, constraints, indexes, RLS policies, and the listing status change trigger
**Verify:** `pnpm build`

### Task 1.1: Create cart_items migration file with table, constraints, indexes, RLS, and trigger

Write a single idempotent migration SQL file that:

1. Creates the `cart_items` table with all 7 columns (`id`, `user_id`, `listing_id`, `price_at_add`, `added_at`, `expires_at`, `added_from`) using correct types and defaults (`gen_random_uuid()` for PK, `NOW()` for `added_at`, `NOW() + INTERVAL '30 days'` for `expires_at`).
2. Adds FK constraints: `user_id` references `members(id) ON DELETE CASCADE`, `listing_id` references `listings(id) ON DELETE CASCADE`.
3. Adds UNIQUE constraint on `(user_id, listing_id)`.
4. Creates indexes on `user_id` and `listing_id`.
5. Enables RLS and creates 4 policies — SELECT, INSERT, DELETE all check `user_id = (SELECT auth.uid())`. UPDATE uses the same ownership check but restricts modification to the `expires_at` column only (using `WITH CHECK` that verifies only `expires_at` changed, or by granting column-level UPDATE).
6. Creates the `handle_listing_status_change()` trigger function that fires `BEFORE UPDATE OF status ON listings` — when `OLD.status = 'active' AND NEW.status != 'active'`, it deletes all `cart_items` rows where `listing_id = NEW.id`.
7. Creates the trigger on the `listings` table that invokes the function.

Follow the idempotent patterns from existing migrations: `IF NOT EXISTS` for tables/indexes, `DO $$ ... EXCEPTION ... END $$` for objects that don't support `IF NOT EXISTS`, and `DROP POLICY IF EXISTS` before `CREATE POLICY` to make re-runs safe. Use `(SELECT auth.uid())` (subquery form) for RLS policies, matching the convention in the listings and listing_drafts policies. Target the `authenticated` role for all policies.

**Files:** `supabase/migrations/20260323000000_create_cart_items.sql`
**AC:**

- Table `cart_items` exists with all 7 columns, correct types, and defaults
- UNIQUE constraint on `(user_id, listing_id)` is enforced
- FK CASCADE on both `user_id` (to `members.id`) and `listing_id` (to `listings.id`)
- RLS enabled with 4 policies (SELECT, INSERT, DELETE, UPDATE) all scoped to `auth.uid()`
- UPDATE policy only permits changes to the `expires_at` column
- Indexes exist on `user_id` and `listing_id`
- Trigger function `handle_listing_status_change()` exists
- Trigger fires on `listings.status` UPDATE and removes cart items when status leaves `active`
- Migration is idempotent (safe to re-run)
  **Expert Domains:** supabase
  **MCP:** supabase

## Phase 2: Type Generation and Build Verification

**Goal:** Regenerate TypeScript types from the updated schema and verify the build passes
**Verify:** `pnpm build`

### Task 2.1: Regenerate database types

Run `pnpm db:types` to regenerate `src/types/database.ts` with the new `cart_items` table definition. Verify the generated types include the `cart_items` table with all expected columns and types.

**Files:** `src/types/database.ts` (modified by codegen)
**AC:**

- `pnpm db:types` completes successfully
- `src/types/database.ts` contains `cart_items` table type with all 7 columns
- Types match the migration column definitions (e.g., `price_at_add` is `number`, `added_from` is `string | null`, `expires_at` is `string`)
  **Expert Domains:** supabase

### Task 2.2: Verify build passes

Run `pnpm build` to confirm the regenerated types don't break any existing code. Since this is a new table with no application-layer consumers yet, the build should pass cleanly.

**Files:** none (verification only)
**AC:**

- `pnpm build` completes with exit code 0
- No type errors related to `cart_items` or `database.ts`
  **Expert Domains:** nextjs
