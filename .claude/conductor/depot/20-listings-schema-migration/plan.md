# Implementation Plan: #20 — Listings Schema Migration

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Current State

The database has:
- `products` table with: id (UUID PK), title (TEXT), description (TEXT), price (NUMERIC), member_id (UUID FK -> members), shop_id (UUID FK -> shops), is_visible (BOOLEAN), created_at (TIMESTAMPTZ)
- `product_images` table with: id (UUID PK), image_url (TEXT), product_id (UUID FK -> products), created_at (TIMESTAMPTZ)
- Dual-owner model via `products_single_owner_check` constraint (member_id XOR shop_id)
- RLS policies on both tables referencing member_id, shop_id, and shop_members
- `handle_updated_at()` trigger function already exists (created in profiles migration)
- No existing enums in the public schema

All SQL goes into a single migration file: `supabase/migrations/20260321100000_listings_schema.sql`. Tasks represent logical sections appended to that file.

## Phase 1: Core Schema Transformation
**Goal:** Rename tables, create enums, add all new columns, migrate existing data, and drop obsolete columns
**Verify:** `pnpm build` (will have type errors in product code since database.ts is stale — that is expected and acceptable per the ticket)

### Task 1.1: Create the migration file with enums and table renames
Create the migration file with a header comment block. Add the four PostgreSQL enums (`listing_category`, `listing_condition`, `listing_status`, `shipping_paid_by`) with all specified values. Then drop all existing RLS policies on `products` and `product_images` (they reference old table/column names and must be removed before ALTER operations). Finally, rename `products` to `listings` and `product_images` to `listing_photos`.

**Files:** `supabase/migrations/20260321100000_listings_schema.sql`
**AC:**
- File exists with migration header
- Four enums created with correct values: listing_category (rods, reels, lures, flies, tackle, line, apparel, electronics, watercraft, other), listing_condition (new_with_tags, new_without_tags, like_new, good, fair, poor), listing_status (draft, active, reserved, sold, archived, deleted), shipping_paid_by (seller, buyer, split)
- All 8 RLS policies on products and product_images are dropped (4 each)
- `products` renamed to `listings`, `product_images` renamed to `listing_photos`
**MCP:** supabase
**Expert Domains:** supabase

### Task 1.2: Add new columns to listings and listing_photos, migrate data, drop old columns
Append to the migration file. For the `listings` table: add category (listing_category), condition (listing_condition), price_cents (INTEGER), status (listing_status), seller_id (UUID, FK -> members ON DELETE RESTRICT), cover_photo_url (TEXT), brand (TEXT), model (TEXT), quantity (INTEGER DEFAULT 1), shipping_paid_by (shipping_paid_by), shipping_price_cents (INTEGER), weight_oz (NUMERIC), location_state (TEXT), location_city (TEXT), view_count (INTEGER DEFAULT 0), favorite_count (INTEGER DEFAULT 0), inquiry_count (INTEGER DEFAULT 0), updated_at (TIMESTAMPTZ DEFAULT NOW()), deleted_at (TIMESTAMPTZ), and search_vector (tsvector, GENERATED ALWAYS AS). Migrate existing data: populate price_cents from price (multiply by 100, cast to integer), populate seller_id from member_id. Set defaults for NOT NULL columns on existing rows (status='active', condition='good', category='other'). Then apply NOT NULL constraints on price_cents, status, category, condition. Drop the old `price` column. Drop the `products_single_owner_check` constraint. For `listing_photos`: rename product_id to listing_id, add thumbnail_url (TEXT) and position (INTEGER DEFAULT 0). Rename the FK constraint from product_images_product_id_fkey. Ensure listing_id FK is ON DELETE CASCADE.

**Files:** `supabase/migrations/20260321100000_listings_schema.sql` (append)
**AC:**
- All new columns exist on `listings` with correct types and defaults
- price_cents populated from existing price data (price * 100)
- seller_id populated from member_id for existing rows
- Old `price` column dropped
- `products_single_owner_check` constraint dropped
- listing_photos has listing_id (renamed from product_id), thumbnail_url, position columns
- seller_id FK is ON DELETE RESTRICT
- listing_id FK is ON DELETE CASCADE
- search_vector is GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(model,''))) STORED
**MCP:** supabase
**Expert Domains:** supabase

### Task 1.3: Enable pg_trgm, add indexes, and create updated_at trigger
Append to the migration file. Enable the `pg_trgm` extension. Create indexes: GIN index on search_vector, GIN trigram index on title, btree indexes on seller_id, shop_id, member_id, status, category, condition, created_at, and a composite index on (status, created_at DESC) for feed queries. Create the updated_at trigger on listings using the existing `handle_updated_at()` function. Note: use regular CREATE INDEX (not CONCURRENTLY) since this runs inside a Supabase migration transaction.

**Files:** `supabase/migrations/20260321100000_listings_schema.sql` (append)
**AC:**
- pg_trgm extension enabled
- GIN index on search_vector exists
- GIN trigram index on title exists (using gin_trgm_ops)
- Btree indexes on seller_id, shop_id, member_id, status, category, condition, created_at
- Composite index on (status, created_at DESC)
- updated_at trigger fires on listings updates using handle_updated_at()
**MCP:** supabase
**Expert Domains:** supabase

## Phase 2: Supporting Tables and RLS Policies
**Goal:** Create listing_drafts and search_suggestions tables, and establish RLS policies on all listing-related tables
**Verify:** `pnpm build`

### Task 2.1: Create listing_drafts table
Append to the migration file. Create the `listing_drafts` table with: id (UUID PK DEFAULT gen_random_uuid()), seller_id (UUID NOT NULL FK -> members ON DELETE CASCADE), shop_id (UUID FK -> shops ON DELETE CASCADE), data (JSONB NOT NULL DEFAULT '{}'), current_step (INTEGER NOT NULL DEFAULT 1), expires_at (TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'), created_at (TIMESTAMPTZ DEFAULT NOW()), updated_at (TIMESTAMPTZ DEFAULT NOW()). Add a unique constraint on (seller_id, shop_id) so each seller has at most one draft per context (member listing vs shop listing). Add an updated_at trigger. Enable RLS. Create policies: sellers can CRUD their own drafts, shop members can CRUD drafts for their shops.

**Files:** `supabase/migrations/20260321100000_listings_schema.sql` (append)
**AC:**
- listing_drafts table exists with all specified columns
- Unique constraint on (seller_id, shop_id) with NULLS NOT DISTINCT
- RLS enabled with SELECT/INSERT/UPDATE/DELETE policies
- updated_at trigger using handle_updated_at()
**MCP:** supabase
**Expert Domains:** supabase

### Task 2.2: Create search_suggestions table
Append to the migration file. Create the `search_suggestions` table with: id (UUID PK DEFAULT gen_random_uuid()), term (TEXT NOT NULL UNIQUE), popularity (INTEGER NOT NULL DEFAULT 0), category (listing_category), created_at (TIMESTAMPTZ DEFAULT NOW()). Add a GIN trigram index on term. Enable RLS with a public SELECT policy (everyone can read suggestions) and restrict writes to service_role only (no authenticated INSERT/UPDATE/DELETE policies).

**Files:** `supabase/migrations/20260321100000_listings_schema.sql` (append)
**AC:**
- search_suggestions table exists with all specified columns
- GIN trigram index on term
- RLS enabled, SELECT open to anon+authenticated, no INSERT/UPDATE/DELETE for non-service-role
**MCP:** supabase
**Expert Domains:** supabase

### Task 2.3: Create RLS policies for listings and listing_photos
Append to the migration file. Enable RLS on listings (it was inherited from products but policies were dropped). Create new policies for `listings`: SELECT allows everyone to see active/reserved listings (status IN ('active','reserved')) plus owners see all their own; INSERT/UPDATE/DELETE restricted to the seller_id owner or shop_members of the listing's shop_id. Create new policies for `listing_photos`: SELECT mirrors listings visibility (join to parent listing); INSERT/UPDATE/DELETE restricted to listing owner or shop members. Reference the renamed table and column names (listings.seller_id, listings.shop_id, listing_photos.listing_id).

**Files:** `supabase/migrations/20260321100000_listings_schema.sql` (append)
**AC:**
- RLS enabled on both listings and listing_photos
- Listings SELECT: anon+authenticated see rows where status IN ('active','reserved') OR seller_id = auth.uid() OR user is shop_member of listing's shop
- Listings INSERT/UPDATE/DELETE: authenticated, seller_id = auth.uid() OR shop_member check
- listing_photos policies mirror ownership through parent listing join
- Soft-deleted listings (deleted_at IS NOT NULL) excluded from public SELECT
**MCP:** supabase
**Expert Domains:** supabase

## Phase 3: Apply Migration and Regenerate Types
**Goal:** Apply the migration to the linked Supabase project and regenerate TypeScript types so the codebase reflects the new schema
**Verify:** `pnpm build` (expect downstream type errors in product feature code — that is acceptable per ticket scope)

### Task 3.1: Apply the migration via Supabase MCP
Use the Supabase MCP `apply_migration` tool to apply the complete migration file to the linked project. Verify the migration succeeded by listing tables and confirming `listings`, `listing_photos`, `listing_drafts`, and `search_suggestions` all exist. Verify the four enums exist. Verify that `products` and `product_images` tables no longer exist (they were renamed, not dropped).

**Files:** `supabase/migrations/20260321100000_listings_schema.sql` (read-only, already written)
**AC:**
- Migration applies without errors
- Tables listings, listing_photos, listing_drafts, search_suggestions confirmed via list_tables
- Tables products, product_images no longer exist
- Four enums (listing_category, listing_condition, listing_status, shipping_paid_by) exist
**MCP:** supabase
**Expert Domains:** supabase

### Task 3.2: Regenerate TypeScript database types
Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. Verify the generated file contains: `listings` table (not `products`), `listing_photos` table (not `product_images`), `listing_drafts` table, `search_suggestions` table, and all four enums in the `Enums` section. Run `pnpm build` to confirm the build completes (type errors in product feature code are expected and acceptable — they will be addressed in a follow-up ticket).

**Files:** `src/types/database.ts` (regenerated)
**AC:**
- `pnpm db:types` succeeds
- database.ts contains listings, listing_photos, listing_drafts, search_suggestions table types
- database.ts contains listing_category, listing_condition, listing_status, shipping_paid_by enum types
- database.ts no longer references products or product_images
- `pnpm build` runs (exit code 0 or type errors only in src/features/products/ files — not a blocker)
**Expert Domains:** supabase, nextjs
