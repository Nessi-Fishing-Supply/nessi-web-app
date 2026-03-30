# Implementation Plan: #303 — Messaging — Database migration for offers and member_blocks tables

## Overview

2 phases, 3 total tasks
Estimated scope: small

## Phase 1: Database Migration

**Goal:** Create the offers and member_blocks tables with enums, indexes, RLS policies, and triggers via Supabase MCP
**Verify:** Migration applies cleanly via MCP

### Task 1.1: Create and apply the offers and member_blocks migration SQL

Write the migration file following the established section pattern from `20260330000000_create_messaging.sql` (enums, tables, indexes, RLS, triggers). The migration timestamp must be `20260330000001` since it depends on the messaging tables migration at `20260330000000`. Note: the issue body specifies `20260328000001` but that would sort before the messaging migration and fail on the `message_threads` FK — use `20260330000001` instead.

The migration creates:

- `offer_status` enum with 5 values (pending, accepted, declined, countered, expired)
- `offers` table with FKs to message_threads, listings, members, and self-referencing parent_offer_id
- `member_blocks` table with unique constraint and self-block prevention CHECK
- Composite and single-column indexes per the issue spec
- RLS enabled on both tables with buyer/seller policies on offers and blocker-only policies on member_blocks
- `update_offers_timestamp()` trigger function and BEFORE UPDATE trigger on offers

Apply the migration to the linked Supabase project via MCP.

**MCP:** supabase
**Files:** `supabase/migrations/20260330000001_create_offers_and_blocks.sql`
**AC:**

- Migration applies without errors
- `offer_status` enum exists with values: pending, accepted, declined, countered, expired
- `offers` table has all specified columns, FKs with correct ON DELETE behavior (CASCADE for thread/listing/buyer/seller, SET NULL for parent_offer_id)
- `member_blocks` table has unique(blocker_id, blocked_id) and CHECK(blocker_id != blocked_id)
- All 5 indexes exist (3 on offers, 2 on member_blocks)
- RLS is enabled on both tables with correct SELECT/INSERT/UPDATE/DELETE policies
- `updated_at` trigger fires on offers UPDATE

**Expert Domains:** supabase

## Phase 2: Type Generation and Verification

**Goal:** Regenerate TypeScript types from the updated schema and verify the full build passes
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 2.1: Regenerate database types

Run `pnpm db:types` to regenerate `src/types/database.ts` from the updated Supabase schema. Verify that the generated file contains type definitions for the `offers` table, `member_blocks` table, and the `offer_status` enum.

**Files:** `src/types/database.ts`
**AC:**

- `pnpm db:types` completes successfully
- `src/types/database.ts` contains `offers` table types (Row, Insert, Update) with all columns
- `src/types/database.ts` contains `member_blocks` table types (Row, Insert, Update) with all columns
- `src/types/database.ts` contains `offer_status` enum type with 5 values

**Expert Domains:** supabase

### Task 2.2: Verify build, lint, and typecheck pass

Run `pnpm build`, `pnpm lint`, and `pnpm typecheck` to confirm the new types integrate cleanly with the existing codebase. No existing code references these new tables yet, so this is a pure compatibility check.

**Files:** (none — verification only)
**AC:**

- `pnpm build` passes
- `pnpm lint` passes
- `pnpm typecheck` passes

**Expert Domains:** nextjs
