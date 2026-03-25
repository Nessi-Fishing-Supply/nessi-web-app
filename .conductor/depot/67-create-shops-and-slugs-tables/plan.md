# Implementation Plan: #67 — Create shops, shop_members, and slugs tables with RLS

## Overview

3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Create tables, functions, indexes, and constraints

**Goal:** Create the `shops`, `shop_members`, and `slugs` tables with all columns, constraints, indexes, and database functions (`reserve_slug`, `check_slug_available`, `release_slug`) in a single migration file.
**Verify:** `pnpm build`

### Task 1.1: Create the migration file with shops, shop_members, and slugs tables

Create a new Supabase migration file following the established naming convention (`YYYYMMDD######_description.sql`). The migration must create all three tables with their full column definitions, constraints, and indexes as specified in the issue and design spec (Sections 2.2, 2.3, 2.5).

**shops table:** All 22 columns per the issue spec. FK `owner_id` references `members.id` ON DELETE RESTRICT. Constraints: `shop_name_length` (3-60 chars), `slug_format` matching `^[a-z0-9][a-z0-9-]*[a-z0-9]$`. Indexes: unique on `slug`, index on `owner_id`, index on `is_verified`, index on `subscription_tier`. Add `handle_updated_at` trigger (reuse existing function from `20260319000000`).

**shop_members table:** All 5 columns. FKs: `shop_id` references `shops.id` ON DELETE CASCADE, `member_id` references `members.id` ON DELETE CASCADE. Constraints: UNIQUE on `(shop_id, member_id)`. Partial unique index: one owner per shop (`WHERE role = 'owner'`). CHECK on `role` being one of `'owner'`, `'admin'`, `'contributor'`.

**slugs table:** `slug` as TEXT PRIMARY KEY, `entity_type` TEXT NOT NULL with CHECK for `'member'` or `'shop'`, `entity_id` UUID NOT NULL, `created_at` TIMESTAMPTZ DEFAULT NOW(). Unique index on `(entity_type, entity_id)` to ensure one slug per entity.

Follow the migration comment header pattern from existing files (`-- ============================================================`).

**MCP:** supabase
**Files:** `supabase/migrations/20260320000003_create_shops_shop_members_slugs_tables.sql`
**AC:**

- Migration applies cleanly without errors
- `shops` table has all 22 columns with correct types and defaults
- `shops.owner_id` FK references `members.id` with ON DELETE RESTRICT
- `shop_members` has UNIQUE constraint on `(shop_id, member_id)`
- `shop_members` has partial unique index enforcing one owner per shop
- `slugs` table has `slug` as PRIMARY KEY
- `slugs.entity_type` is constrained to `'member'` or `'shop'`
  **Expert Domains:** supabase

### Task 1.2: Create reserve_slug, check_slug_available, and release_slug database functions

In the same migration file created in Task 1.1, add three database functions after the table definitions.

**`reserve_slug(p_slug TEXT, p_entity_type TEXT, p_entity_id UUID)`:** Validates slug format against `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, raises exception if invalid. Inserts into `slugs` table (will fail with unique_violation if taken). Updates the entity's `slug` column — use dynamic SQL or IF/ELSIF branching on `p_entity_type` to update the correct table (`members` or `shops`). Releases any previous slug for this entity first (delete from `slugs` where `entity_type = p_entity_type AND entity_id = p_entity_id`). Must be `SECURITY DEFINER` to bypass RLS on the `slugs` table.

**`check_slug_available(p_slug TEXT)`:** Returns BOOLEAN. Queries `slugs` table and returns `NOT FOUND`. Simple and safe for client-side availability checks.

**`release_slug(p_entity_type TEXT, p_entity_id UUID)`:** Deletes the slug entry for the given entity. Used during entity deletion cleanup. Must be `SECURITY DEFINER`.

All three functions should use `LANGUAGE plpgsql`.

**MCP:** supabase
**Files:** `supabase/migrations/20260320000003_create_shops_shop_members_slugs_tables.sql`
**AC:**

- `reserve_slug('test-slug', 'member', some_uuid)` inserts into slugs and updates the member's slug column
- `reserve_slug` with a taken slug raises an error
- `reserve_slug` with invalid format (e.g., `-bad-slug-`, `UPPER`) raises an error
- `check_slug_available('nonexistent')` returns true
- `check_slug_available('taken-slug')` returns false when slug exists
- `release_slug` removes the slug entry for the given entity
  **Expert Domains:** supabase

### Task 1.3: Add RLS policies for all three tables

In the same migration file, after the functions, enable RLS and create policies for all three new tables.

**shops RLS:**

- SELECT: public (authenticated + anon), `USING (true)` — marketplace is public
- INSERT: authenticated, `WITH CHECK (owner_id = (SELECT auth.uid()))` — only the owner can create
- UPDATE: authenticated, `USING (EXISTS (SELECT 1 FROM shop_members WHERE shop_id = shops.id AND member_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')))` — shop owner/admin can update
- DELETE: authenticated, `USING (owner_id = (SELECT auth.uid()))` — only the owner can delete

**shop_members RLS:**

- SELECT: authenticated, `USING (EXISTS (SELECT 1 FROM shop_members sm WHERE sm.shop_id = shop_members.shop_id AND sm.member_id = (SELECT auth.uid())))` — shop members can see their co-members
- INSERT: authenticated, `WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND owner_id = (SELECT auth.uid())))` — only shop owner can add members
- UPDATE: authenticated, same as INSERT USING clause — only shop owner
- DELETE: authenticated, same as INSERT USING clause — only shop owner

**slugs RLS:**

- SELECT: public (authenticated + anon), `USING (true)` — slug availability checks are public
- No INSERT/UPDATE/DELETE policies — all mutations go through `SECURITY DEFINER` functions

Follow the policy naming pattern from existing migrations (descriptive English strings).

**MCP:** supabase
**Files:** `supabase/migrations/20260320000003_create_shops_shop_members_slugs_tables.sql`
**AC:**

- RLS is enabled on all three tables
- `shops` has SELECT, INSERT, UPDATE, DELETE policies
- `shop_members` has SELECT, INSERT, UPDATE, DELETE policies
- `slugs` has SELECT policy only; no direct mutation policies exist
- Policy names follow the existing descriptive naming convention
  **Expert Domains:** supabase

## Phase 2: Update handle_new_user and backfill existing slugs

**Goal:** Modify the `handle_new_user()` trigger function to also insert into the `slugs` table when creating a new member, and backfill all existing member slugs into the `slugs` table.
**Verify:** `pnpm build`

### Task 2.1: Update handle_new_user() to call reserve_slug for new members

In the same migration file, replace `handle_new_user()` using `CREATE OR REPLACE FUNCTION`. The updated function must: (1) generate the slug as before, (2) insert the member row into `members`, (3) insert the slug into the `slugs` table with `entity_type = 'member'` and `entity_id = NEW.id`. The slug insert should happen directly (INSERT INTO slugs) rather than calling `reserve_slug()`, since `handle_new_user` is already `SECURITY DEFINER` and the slug was just generated (no need for format validation on auto-generated slugs). The unique_violation retry loop should catch violations from both the `members` slug unique index AND the `slugs` primary key.

Reference the current `handle_new_user()` from migration `20260320000002_rename_profiles_to_members.sql` for the existing logic that must be preserved.

**MCP:** supabase
**Files:** `supabase/migrations/20260320000003_create_shops_shop_members_slugs_tables.sql`
**AC:**

- `handle_new_user()` creates both a `members` row and a `slugs` row when a new auth user is created
- The function preserves existing behavior: display_name from firstName metadata, slug generation with random suffix, retry loop on unique_violation
- New users have their slug present in both `members.slug` and `slugs.slug`
  **Expert Domains:** supabase

### Task 2.2: Backfill existing member slugs into the slugs table

In the same migration file, after the `handle_new_user()` replacement, add a backfill statement that inserts all existing `members.slug` values into the `slugs` table with `entity_type = 'member'` and `entity_id = members.id`. Use `INSERT INTO slugs (slug, entity_type, entity_id) SELECT slug, 'member', id FROM members` with `ON CONFLICT DO NOTHING` to be idempotent.

**MCP:** supabase
**Files:** `supabase/migrations/20260320000003_create_shops_shop_members_slugs_tables.sql`
**AC:**

- All existing member slugs are present in the `slugs` table after migration
- Each backfilled row has `entity_type = 'member'` and correct `entity_id`
- The backfill is idempotent (safe to run multiple times)
  **Expert Domains:** supabase

## Phase 3: Regenerate types and verify

**Goal:** Regenerate TypeScript types from the updated Supabase schema and verify the build passes with the new type definitions.
**Verify:** `pnpm build` and `pnpm typecheck`

### Task 3.1: Apply migration via MCP and regenerate TypeScript types

Apply the migration to the Supabase database using the Supabase MCP tool, then run `pnpm db:types` to regenerate `src/types/database.ts` with type definitions for the three new tables (`shops`, `shop_members`, `slugs`) and the new database functions.

**MCP:** supabase
**Files:** `src/types/database.ts`
**AC:**

- `src/types/database.ts` contains type definitions for `shops` table with all 22 columns
- `src/types/database.ts` contains type definitions for `shop_members` table with all 5 columns
- `src/types/database.ts` contains type definitions for `slugs` table with all 4 columns
- Type definitions include Row, Insert, and Update variants for each table
  **Expert Domains:** supabase

### Task 3.2: Verify typecheck and build pass

Run `pnpm typecheck` and `pnpm build` to confirm no type errors are introduced by the new type definitions. If any existing code references types that conflict with the new tables, fix the references.

**Files:** `src/types/database.ts`
**AC:**

- `pnpm typecheck` passes with zero errors
- `pnpm build` passes successfully
- No existing code is broken by the new type definitions
  **Expert Domains:** supabase, nextjs
