# Implementation Plan: #65 — chore(database): rename profiles table to members

## Overview

2 phases, 3 total tasks
Estimated scope: small

## Phase 1: Create the rename migration

**Goal:** Write a single SQL migration that renames the `profiles` table to `members`, restores `shop_name` to `display_name`, and updates all associated database objects (indexes, constraints, triggers, trigger functions, RLS policies).
**Verify:** `pnpm build`

### Task 1.1: Write the rename migration SQL file

Create a new migration file that performs the full rename in a single transaction. The migration must:

1. Rename `profiles` table to `members`
2. Rename `shop_name` column back to `display_name`
3. Rename constraint `shop_name_length` to `display_name_length` (drop + recreate with new name referencing `display_name`)
4. Rename indexes: `profiles_shop_name_unique` to `members_display_name_unique`, `profiles_slug_unique` to `members_slug_unique`, `profiles_home_state_idx` to `members_home_state_idx`, `profiles_is_seller_idx` to `members_is_seller_idx`
5. Drop and recreate triggers `on_profiles_updated_at` (renamed to `on_members_updated_at`) and `on_profiles_system_fields` (renamed to `on_members_system_fields`) on the `members` table
6. Replace `handle_profiles_system_fields()` with `handle_members_system_fields()` (same body, new name) and drop the old function
7. Replace `handle_new_user()` to INSERT into `public.members` with `display_name` column instead of `public.profiles` with `shop_name`
8. Drop and recreate all three RLS policies on `members` with updated policy names: "Members are viewable by everyone" (SELECT), "Users can insert own member row" (INSERT), "Users can update own member row" (UPDATE)

Reference the current schema from these existing migrations to ensure nothing is missed:

- `supabase/migrations/20260319000000_create_profiles_table.sql` (original table, indexes, constraints, triggers, RLS)
- `supabase/migrations/20260320000000_add_first_last_name_to_profiles.sql` (added first_name/last_name, updated handle_new_user)
- `supabase/migrations/20260320000001_rename_display_name_to_shop_name.sql` (renamed display_name to shop_name, updated indexes/constraints/trigger)

Use timestamp format `20260320000002` for the migration filename so it sorts after the existing migrations.

**Files:** `supabase/migrations/20260320000002_rename_profiles_to_members.sql`
**AC:**

- `ALTER TABLE profiles RENAME TO members` is present
- `ALTER TABLE members RENAME COLUMN shop_name TO display_name` is present
- All four indexes are renamed with `members_` prefix and reference `display_name` where applicable
- Constraint `display_name_length` exists with CHECK on `display_name`
- `handle_new_user()` inserts into `public.members` with `display_name` column
- `handle_members_system_fields()` function exists; old `handle_profiles_system_fields()` is dropped
- Triggers `on_members_updated_at` and `on_members_system_fields` exist on `members` table
- Three RLS policies exist on `members` with updated names
- No references to `profiles` or `shop_name` remain in the new migration (except in comments noting the rename)
  **Expert Domains:** supabase
  **MCP:** supabase

## Phase 2: Regenerate TypeScript types

**Goal:** Regenerate the database types so `src/types/database.ts` reflects the `members` table with `display_name` column instead of `profiles` with `shop_name`.
**Verify:** `pnpm build` (note: type errors in application code are expected per ticket scope -- only verify the migration applied and types regenerated)

### Task 2.1: Apply migration to local Supabase and regenerate types

Apply the new migration to the local Supabase instance using `supabase db reset` (since there is no production data and this ensures a clean state with all migrations applied in order), then run `pnpm db:types` to regenerate `src/types/database.ts`.

**Files:** `src/types/database.ts` (modified by regeneration)
**AC:**

- `src/types/database.ts` contains a `members` key under `Tables` (not `profiles`)
- The `members` type has `display_name: string` in its Row type (not `shop_name`)
- The `members` type has `first_name: string | null` and `last_name: string | null`
- No reference to `profiles` table or `shop_name` column exists in the generated types
  **Expert Domains:** supabase

### Task 2.2: Verify migration correctness via SQL assertions

Run SQL queries against the local Supabase database to verify the migration applied correctly. Check:

1. `SELECT * FROM members LIMIT 0` succeeds
2. `SELECT * FROM profiles LIMIT 0` fails with "relation does not exist"
3. Index `members_display_name_unique` exists in `pg_indexes`
4. Index `members_slug_unique` exists in `pg_indexes`
5. Function `handle_members_system_fields` exists in `pg_proc`
6. Function `handle_profiles_system_fields` does NOT exist in `pg_proc`
7. Trigger `on_members_updated_at` exists on `members` table
8. Trigger `on_members_system_fields` exists on `members` table

This is a verification-only task -- no files are modified.

**Files:** none (verification only)
**AC:** All 8 SQL assertions pass, confirming the migration is correct
**Expert Domains:** supabase
**MCP:** supabase
