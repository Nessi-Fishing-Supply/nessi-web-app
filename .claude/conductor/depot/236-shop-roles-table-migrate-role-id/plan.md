# Implementation Plan: #236 — Create shop_roles table and migrate shop_members.role to role_id FK

## Overview
2 phases, 4 total tasks
Estimated scope: medium

## Phase 1: Database Migration
**Goal:** Create the shop_roles table, seed system roles, migrate shop_members from TEXT role to role_id FK, and update all affected RLS policies and indexes in a single atomic migration.
**Verify:** Migration applied successfully via Supabase MCP

### Task 1.1: Write the shop_roles migration SQL file
Write a single migration file that performs the following operations in order:

1. Create `shop_roles` table with columns: `id` (UUID PK, no default — deterministic IDs), `shop_id` (UUID nullable FK to shops ON DELETE CASCADE, null = system role), `name` (TEXT NOT NULL), `slug` (TEXT NOT NULL), `permissions` (JSONB NOT NULL), `is_system` (BOOLEAN NOT NULL DEFAULT false), `sort_order` (INTEGER NOT NULL DEFAULT 0), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()). Add unique constraint on `(shop_id, slug)` using a partial index that handles NULL shop_id correctly (use COALESCE or two separate unique indexes). Enable RLS.

2. Seed three system roles with deterministic UUIDs (use `uuid_generate_v5` with the DNS namespace and descriptive names, or explicit hex UUIDs documented as constants). Roles: Owner (`sort_order: 1`, full permissions on all 6 domains), Manager (`sort_order: 2`, full on listings/pricing/orders/messaging, view on shop_settings, none on members), Contributor (`sort_order: 3`, full on listings, none on everything else). Permissions JSONB must match the specification exactly.

3. Add `role_id` UUID column to `shop_members` (nullable initially, FK to `shop_roles.id`).

4. Backfill `role_id` for all existing rows: map `role = 'owner'` to Owner system role ID, `role = 'admin'` to Manager system role ID, `role = 'contributor'` to Contributor system role ID.

5. Set `role_id` to NOT NULL after backfill.

6. Drop the old unique index `shop_members_one_owner_per_shop` and recreate it using `role_id = <owner_system_role_uuid>` instead of `role = 'owner'`.

7. Drop the CHECK constraint `shop_members_role_check` and then drop the `role` TEXT column from `shop_members`.

8. Update the shops UPDATE RLS policy "Shop owner or admin can update shop" to use `role_id IN (<owner_uuid>, <manager_uuid>)` instead of `role IN ('owner', 'admin')`.

9. Create RLS policies on `shop_roles`: (a) SELECT for authenticated users where `shop_id IS NULL` (system roles visible to all), (b) SELECT for authenticated users where `shop_id` is a shop they belong to (via shop_members lookup on member_id = auth.uid()).

**Files:** `supabase/migrations/20260324100000_create_shop_roles_migrate_role_id.sql`
**AC:**
- `shop_roles` table exists with 3 system role rows where `is_system = true` and `shop_id IS NULL`
- Each system role has the correct permissions JSONB per the specification
- `shop_members.role_id` is NOT NULL UUID FK to `shop_roles.id`
- `shop_members.role` TEXT column no longer exists
- The one-owner-per-shop unique index uses `role_id` referencing the Owner system role
- RLS on `shop_roles` allows authenticated users to SELECT system roles
- The shops UPDATE policy references `role_id` instead of the text `role` column
**Expert Domains:** supabase

### Task 1.2: Apply the migration to Supabase via MCP
Execute the migration SQL against the linked Supabase project using the Supabase MCP `execute_sql` tool. Verify the migration applied correctly by querying `shop_roles` to confirm 3 system rows exist, and querying `information_schema.columns` to confirm `shop_members` has `role_id` and no longer has `role`.

**MCP:** supabase
**Files:** (no new files — executes SQL from Task 1.1)
**AC:**
- `SELECT count(*) FROM shop_roles WHERE is_system = true` returns 3
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'shop_members' AND column_name = 'role'` returns 0 rows
- `SELECT column_name FROM information_schema.columns WHERE table_name = 'shop_members' AND column_name = 'role_id'` returns 1 row
**Expert Domains:** supabase

## Phase 2: Type Regeneration and Build Verification
**Goal:** Regenerate TypeScript types from the updated schema and verify the project builds successfully (even though application code changes are out of scope for this ticket).
**Verify:** `pnpm build`

### Task 2.1: Regenerate database types
Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. The output should include the new `shop_roles` table type and the updated `shop_members` type with `role_id` instead of `role`.

**Files:** `src/types/database.ts`
**AC:**
- `database.ts` contains a `shop_roles` table definition with columns: id, shop_id, name, slug, permissions, is_system, sort_order, created_at
- `database.ts` `shop_members` table has `role_id` (string) and does NOT have `role` (text)
**Expert Domains:** supabase

### Task 2.2: Fix type errors caused by schema change and verify build
The schema change (removing `shop_members.role` TEXT, adding `role_id` UUID) will cause TypeScript compilation errors in application code that references the old `role` field. Since the issue explicitly says "Do NOT modify any application code (types, services, hooks, components)", but the build MUST pass per AC #9, we need to reconcile this.

Review `src/features/shops/types/shop.ts` — the `ShopMemberRole` type (`'owner' | 'manager' | 'staff'`) is a standalone union type not derived from the database column, so it will not cause a build error on its own. Check if any code directly accesses `.role` on a `ShopMemberRow` (which is `Database['public']['Tables']['shop_members']['Row']`). If build errors exist:

1. The `ShopMemberRole` type in `src/features/shops/types/shop.ts` can remain as-is (it is a standalone type, not derived from the column).
2. Any service code that passes `role` as a column value to Supabase insert/update calls will fail type checks — these need minimal fixes (change `role` to `role_id` in the query).
3. Any component code that reads `.role` from a `ShopMemberRow` will fail — these need minimal fixes.

Make the minimum changes necessary to pass `pnpm build`. This means updating Supabase query calls in services and direct `.role` property accesses to use `.role_id`, but NOT refactoring the permission system or UI logic.

**Files:**
- `src/features/shops/services/shop.ts` (update `addShopMember` to use `role_id` instead of `role`)
- `src/features/shops/types/shop.ts` (update `ShopMemberInsert` if needed, keep `ShopMemberRole` as-is)
- `src/features/shops/components/shop-settings/shop-members-section/index.tsx` (update `.role` references to `.role_id` if needed for build)
**AC:**
- `pnpm typecheck` passes with zero errors
- `pnpm build` completes successfully
- Changes are minimal — only what is required to fix compilation errors from the schema change
**Expert Domains:** nextjs, supabase
