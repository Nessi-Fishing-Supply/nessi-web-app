# Implementation Plan: #250 — Create shop_invites database table and RLS policies

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Database Migration

**Goal:** Create the `invite_status` enum, `shop_invites` table with all columns, constraints, indexes, and RLS policies
**Verify:** `pnpm build`

### Task 1.1: Create the shop_invites migration SQL file

Create a new migration file following the project naming convention (`YYYYMMDD######_description.sql`). The migration must:

1. Create the `invite_status` enum type with values `pending`, `accepted`, `expired`, `revoked`.
2. Create the `shop_invites` table with all specified columns: `id` (uuid PK, default `gen_random_uuid()`), `shop_id` (uuid FK to `shops(id)` ON DELETE CASCADE, NOT NULL), `email` (text NOT NULL), `role_id` (uuid FK to `shop_roles(id)` ON DELETE RESTRICT, NOT NULL), `token` (uuid UNIQUE NOT NULL, default `gen_random_uuid()`), `status` (`invite_status` NOT NULL default `'pending'`), `invited_by` (uuid FK to `members(id)` ON DELETE SET NULL), `created_at` (timestamptz default `now()`), `expires_at` (timestamptz default `now() + interval '7 days'`).
3. Create indexes: index on `shop_id` for listing invites per shop, index on `email` for checking existing invites, partial unique index on `(shop_id, email)` WHERE `status = 'pending'` to prevent duplicate pending invites. The `token` column already gets a unique index from the UNIQUE constraint.
4. Enable RLS with a single SELECT policy allowing shop members (via `shop_members` join) to read invites for their shop. No INSERT/UPDATE/DELETE policies — all write operations use the admin client.

Follow the migration header comment style from existing files (e.g., `20260324100000_create_shop_roles_migrate_role_id.sql`). Use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DROP POLICY IF EXISTS` for idempotency where appropriate.

**Files:** `supabase/migrations/20260325000000_create_shop_invites.sql`
**AC:**

- Migration file exists with correct timestamp prefix and descriptive name
- `invite_status` enum is created with exactly 4 values
- `shop_invites` table has all 9 columns with correct types, defaults, and NOT NULL constraints
- FK constraints match spec: `shop_id` CASCADE, `role_id` RESTRICT, `invited_by` SET NULL
- 4 indexes exist: unique on `token` (from column constraint), on `shop_id`, on `email`, partial unique on `(shop_id, email)` WHERE `status = 'pending'`
- RLS is enabled with one SELECT policy for shop members; no INSERT/UPDATE/DELETE policies
  **Expert Domains:** supabase

### Task 1.2: Apply the migration to the linked Supabase project

Apply the migration SQL to the linked Supabase database using MCP. Execute the full SQL from the migration file created in Task 1.1 against the remote database.

**MCP:** supabase
**Files:** `supabase/migrations/20260325000000_create_shop_invites.sql` (read and execute)
**AC:**

- The `invite_status` enum type exists in the database
- The `shop_invites` table exists with all columns, constraints, and indexes
- RLS is enabled with the SELECT policy active
- No existing tables are modified
  **Expert Domains:** supabase

## Phase 2: Type Generation and Verification

**Goal:** Regenerate TypeScript types from the updated schema and verify the build passes
**Verify:** `pnpm build`

### Task 2.1: Regenerate TypeScript database types

Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. This will pull the new `shop_invites` table and `invite_status` enum into the TypeScript type definitions.

**Files:** `src/types/database.ts` (modified by code generation)
**AC:**

- `src/types/database.ts` contains a `shop_invites` key under `Database['public']['Tables']` with `Row`, `Insert`, `Update`, and `Relationships` types
- `Database['public']['Enums']` contains `invite_status` with the union type `'pending' | 'accepted' | 'expired' | 'revoked'`
- All column types in the generated `Row` type match the migration: `id: string`, `shop_id: string`, `email: string`, `role_id: string`, `token: string`, `status: Database['public']['Enums']['invite_status']`, `invited_by: string | null`, `created_at: string`, `expires_at: string`
  **Expert Domains:** supabase

### Task 2.2: Verify typecheck and build pass

Run `pnpm typecheck` and `pnpm build` to confirm the regenerated types do not break any existing code. Since this ticket is database-only with no application code changes, existing code should be unaffected by the new table types.

**Files:** (no file changes — verification only)
**AC:**

- `pnpm typecheck` exits with code 0
- `pnpm build` exits with code 0
  **Expert Domains:** nextjs
