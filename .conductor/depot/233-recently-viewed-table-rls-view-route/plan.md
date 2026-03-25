# Implementation Plan: #233 — recently_viewed table, RLS policies, and view route integration

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Database Foundation

**Goal:** Create the `recently_viewed` table with indexes, RLS policies, and the 50-row cap trigger via Supabase migration
**Verify:** `pnpm build`

### Task 1.1: Create the recently_viewed migration file

Create a new Supabase migration following the `cart_items` pattern (`supabase/migrations/20260323000000_create_cart_items.sql`). The migration must include:

1. **Table creation** with columns: `id` UUID PK (default `gen_random_uuid()`), `user_id` UUID NOT NULL FK to `members(id)` ON DELETE CASCADE, `listing_id` UUID NOT NULL FK to `listings(id)` ON DELETE CASCADE, `viewed_at` TIMESTAMPTZ DEFAULT `now()`, and a UNIQUE constraint on `(user_id, listing_id)`.
2. **Indexes**: `idx_recently_viewed_user_id` on `user_id`, `idx_recently_viewed_user_viewed` on `(user_id, viewed_at DESC)`, `idx_recently_viewed_listing_id` on `listing_id`.
3. **Enable RLS** and create four policies (SELECT, INSERT, UPDATE, DELETE) all scoped to `user_id = (SELECT auth.uid())` for the `authenticated` role, following the exact pattern from `cart_items`.
4. **Trigger function** `enforce_recently_viewed_cap()` as `SECURITY DEFINER SET search_path = public` that deletes rows for the inserting user where `viewed_at` is not in the top 50 (by `viewed_at DESC`). Attach as an `AFTER INSERT` trigger on `recently_viewed`.

Use section comment headers matching the cart_items migration style.

**Files:** `supabase/migrations/20260324000000_create_recently_viewed.sql`
**AC:** Migration SQL is syntactically valid; table has all columns, constraints, indexes, RLS policies, and the cap trigger
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.2: Apply migration and regenerate database types

Apply the migration to the Supabase instance via MCP, then run `pnpm db:types` to regenerate `src/types/database.ts` with the new `recently_viewed` table types. Verify the generated types include `recently_viewed` in the `Tables` object with correct `Row`, `Insert`, and `Update` shapes.

**Files:** `src/types/database.ts`
**AC:** `src/types/database.ts` contains `recently_viewed` table types with `id`, `user_id`, `listing_id`, and `viewed_at` fields; `pnpm typecheck` passes
**Expert Domains:** supabase

## Phase 2: View Route Integration

**Goal:** Update the existing listing view API route to upsert into `recently_viewed` for authenticated users alongside the view count increment
**Verify:** `pnpm build && pnpm typecheck`

### Task 2.1: Add recently_viewed upsert to the view route

Update `src/app/api/listings/[id]/view/route.ts` to add an upsert into `recently_viewed` for authenticated users. After the existing `view_count` increment, add a call using `.upsert()` with `{ user_id: user.id, listing_id: id }` and `onConflict: 'user_id,listing_id'` so re-views update `viewed_at` instead of creating duplicates. The upsert should not block the response — if it fails, log the error but still return `{ success: true }`. Unauthenticated requests remain unchanged (early return before DB writes).

**Files:** `src/app/api/listings/[id]/view/route.ts`
**AC:** Authenticated POST upserts into `recently_viewed`; re-viewing updates `viewed_at`; unauthenticated requests return `{ success: true }` without DB write (no regression); upsert failure does not break the response
**Expert Domains:** supabase, nextjs

### Task 2.2: Verify build and type safety

Run `pnpm build` and `pnpm typecheck` to confirm all changes compile correctly. The view route must reference the `recently_viewed` table through the typed Supabase client without any type errors.

**Files:** (no new files — verification only)
**AC:** `pnpm build` passes; `pnpm typecheck` passes; no lint errors in modified files
**Expert Domains:** nextjs
