# Implementation Plan: #198 — reports table, enums, and RLS policies

## Overview

2 phases, 3 total tasks
Estimated scope: small

## Phase 1: Database Migration

**Goal:** Create the report_reason, report_target_type, and report_status enums, the reports table with all columns and constraints, indexes, and RLS policies restricting INSERT/SELECT to own rows.
**Verify:** `pnpm build`

### Task 1.1: Create reports migration with enums, table, constraints, indexes, and RLS policies

Write a single SQL migration file that:

1. Creates three enums: `report_reason` (spam, prohibited_item, counterfeit, inappropriate_content, off_platform_transaction, harassment, other), `report_target_type` (listing, member, shop, message), and `report_status` (pending, reviewed, resolved, dismissed).
2. Creates the `reports` table with columns: `id` (UUID PK, default gen_random_uuid()), `reporter_id` (UUID NOT NULL, FK to auth.users ON DELETE CASCADE), `target_type` (report_target_type NOT NULL), `target_id` (UUID NOT NULL, no FK — polymorphic), `reason` (report_reason NOT NULL), `description` (TEXT nullable), `status` (report_status NOT NULL DEFAULT 'pending'), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).
3. Adds a UNIQUE constraint on (reporter_id, target_type, target_id) to prevent duplicate reports.
4. Creates indexes on reporter_id and on (target_type, target_id) for query performance.
5. Enables RLS and creates two policies: INSERT allowing authenticated users to insert rows where reporter_id matches auth.uid(), and SELECT allowing authenticated users to read only their own rows (reporter_id = auth.uid()).

Follow the established migration file naming convention (timestamped prefix, sectioned comments) matching patterns in existing migrations like `20260325000000_create_shop_invites.sql` and `20260324000000_create_recently_viewed.sql`. Apply via Supabase MCP.

**Files:** `supabase/migrations/20260326000000_create_reports.sql`
**AC:** Migration applies successfully. The reports table exists with all three enums, the unique constraint on (reporter_id, target_type, target_id), RLS enabled, and INSERT/SELECT policies scoped to authenticated users' own rows.
**MCP:** supabase
**Expert Domains:** supabase

## Phase 2: Type Generation

**Goal:** Regenerate the TypeScript database types so the new reports table and enums are available to application code, and the build still passes.
**Verify:** `pnpm build`

### Task 2.1: Regenerate Supabase TypeScript types

Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated schema. Verify the output includes the `reports` table (Row, Insert, Update types) and the three new enums (`report_reason`, `report_target_type`, `report_status`) in the Enums section.

**Files:** `src/types/database.ts`
**AC:** `src/types/database.ts` contains the `reports` table definition with correct column types, and all three enums appear in both the union-type Enums block and the array-literal Enums block. `pnpm build` passes.
**Expert Domains:** supabase

### Task 2.2: Create reports feature CLAUDE.md

Create the `src/features/reports/` directory with a `CLAUDE.md` documenting the reports domain: purpose (user-generated content/behavior reports), database schema (reports table, three enums), RLS policy summary (own-rows only for INSERT/SELECT), and notes on the polymorphic target_id pattern (no FK constraint, resolved at application layer). This establishes the feature directory for future report-related services, hooks, and components.

**Files:** `src/features/reports/CLAUDE.md`
**AC:** The file exists, accurately describes the reports table schema, enums, RLS policies, and the polymorphic target pattern. The directory is ready for future feature code.
**Expert Domains:** supabase
