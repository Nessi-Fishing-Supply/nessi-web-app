# Implementation Plan: #68 — feat(database): add member_id and shop_id to products, drop user_id

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Database Migration
**Goal:** Replace `user_id` with `member_id`/`shop_id` dual FK columns, add `is_visible`, and update all RLS policies on `products` and `product_images` tables.
**Verify:** `pnpm build`

### Task 1.1: Create migration to modify products table schema
Create a new SQL migration that: (1) drops the existing `user_id` column from `products`, (2) adds `member_id UUID` (nullable, FK to `members.id` ON DELETE CASCADE), (3) adds `shop_id UUID` (nullable, FK to `shops.id` ON DELETE CASCADE), (4) adds CHECK constraint ensuring exactly one of `member_id`/`shop_id` is non-null, (5) adds `is_visible BOOLEAN NOT NULL DEFAULT TRUE`, and (6) adds indexes on `member_id` and `shop_id`. No production data exists so the migration can be destructive (no data backfill needed).
**Files:** `supabase/migrations/YYYYMMDDHHMMSS_modify_products_dual_fk.sql`
**AC:** Migration SQL is syntactically valid. Products table gains `member_id`, `shop_id`, `is_visible` columns and loses `user_id`. CHECK constraint named `products_single_owner_check` enforces exactly one owner. Indexes exist on both FK columns.
**MCP:** supabase
**Expert Domains:** supabase

### Task 1.2: Update RLS policies on products and product_images tables
In the same migration file from Task 1.1, drop all existing RLS policies on `products` and `product_images`, then recreate them. For `products`: (a) SELECT remains open to everyone, (b) INSERT checks `member_id = auth.uid()` OR the user is a shop_member of the given `shop_id`, (c) UPDATE/DELETE use same ownership pattern via `member_id = auth.uid()` OR membership in the product's `shop_id` via `shop_members` lookup. For `product_images`: same pattern — ownership verified by joining through `products` to check `member_id` or `shop_members` membership. The SELECT policy on products should also filter by `is_visible = true` for non-owners (anon sees only visible; owner/shop-member sees all their own).
**Files:** `supabase/migrations/YYYYMMDDHHMMSS_modify_products_dual_fk.sql` (same file as 1.1)
**AC:** RLS policies allow a member to CRUD their own products (where `member_id = auth.uid()`). RLS policies allow a shop member to CRUD products belonging to their shop (via `shop_members` join). Product images RLS follows the same ownership pattern through the `products` table. Anonymous/public users can only SELECT products where `is_visible = true`.
**MCP:** supabase
**Expert Domains:** supabase

### Task 1.3: Regenerate TypeScript database types
Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. Verify the generated types show `member_id`, `shop_id`, and `is_visible` on the products type, and that `user_id` is no longer present.
**Files:** `src/types/database.ts`
**AC:** `products.Row` has `member_id: string | null`, `shop_id: string | null`, `is_visible: boolean`, and no `user_id`. `products.Insert` has `member_id` and `shop_id` as optional nullable, `is_visible` as optional boolean. Relationships array includes FK entries for `member_id` and `shop_id`.
**Expert Domains:** supabase

## Phase 2: Update API Routes
**Goal:** Update all product API routes to use `member_id` instead of `user_id`, keeping existing member-owned product functionality working.
**Verify:** `pnpm build`

### Task 2.1: Update product creation route to use member_id
In the POST handler, change the insert payload from `user_id: user.id` to `member_id: user.id`. The route continues to create member-owned products only (shop-scoped creation is out of scope).
**Files:** `src/app/api/products/route.ts`
**AC:** `POST /api/products` inserts with `member_id: user.id` instead of `user_id: user.id`. No other changes to the route logic. `pnpm typecheck` passes.
**Expert Domains:** nextjs, supabase

### Task 2.2: Update user products route to query by member_id
Change the `.eq('user_id', user.id)` filter to `.eq('member_id', user.id)` in the GET handler.
**Files:** `src/app/api/products/user/route.ts`
**AC:** `GET /api/products/user` queries `.eq('member_id', user.id)`. `pnpm typecheck` passes.
**Expert Domains:** nextjs, supabase

### Task 2.3: Verify product [id] route has no user_id references
Review and confirm the `[id]/route.ts` GET/PUT/DELETE handlers do not reference `user_id`. The current code relies on RLS for authorization (no explicit `user_id` filter in application code). Confirm no changes are needed, or update any `user_id` references if found. The DELETE handler's storage cleanup and the PUT handler's update logic should work unchanged since they operate by product `id`, not by owner column.
**Files:** `src/app/api/products/[id]/route.ts`
**AC:** No `user_id` string appears in the file. All operations continue to work for member-owned products via RLS. `pnpm typecheck` passes.
**Expert Domains:** nextjs, supabase

## Phase 3: Update Product Types and Verify
**Goal:** Ensure product feature types align with the new schema and all quality checks pass.
**Verify:** `pnpm typecheck && pnpm lint && pnpm build && pnpm test:run`

### Task 3.1: Update product types if needed
Check whether `src/features/products/types/product.ts` needs any changes. Since the types are derived from `Database['public']['Tables']['products']`, they should automatically reflect the regenerated types. Verify that no code in `src/features/products/` references `user_id`. If the `ProductWithImages` type or any component references `user_id`, update it.
**Files:** `src/features/products/types/product.ts`
**AC:** No `user_id` references exist anywhere in `src/features/products/`. The `Product`, `ProductInsert`, `ProductUpdate`, and `ProductWithImages` types correctly reflect the new schema (with `member_id`, `shop_id`, `is_visible`).
**Expert Domains:** nextjs

### Task 3.2: Run full quality gate and fix any issues
Run `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm format:check`, `pnpm test:run`, and `pnpm build`. Fix any type errors, lint issues, or build failures that arise from the schema change. Search the entire `src/` directory for any remaining `user_id` references related to products and update them.
**Files:** Any files that fail quality checks
**AC:** All commands pass: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:run`. Zero references to `user_id` in product-related code across the entire `src/` directory.
**Expert Domains:** nextjs, supabase
