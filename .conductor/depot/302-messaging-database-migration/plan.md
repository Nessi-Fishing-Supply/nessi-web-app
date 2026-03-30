# Implementation Plan: #302 — Messaging Database Migration

## Overview

2 phases, 4 total tasks
Estimated scope: medium

## Phase 1: Create Migration SQL File

**Goal:** Author the complete messaging schema migration with enums, tables, indexes, RLS policies, and triggers
**Verify:** `pnpm build`

### Task 1.1: Create the messaging migration SQL file with enums and tables

Write the migration file `supabase/migrations/20260330000000_create_messaging.sql`. The file must create four enums (`thread_type`, `thread_status`, `participant_role`, `message_type`), three tables (`message_threads`, `message_thread_participants`, `messages`) with all columns, constraints, and foreign keys as specified in the issue. Follow the migration conventions established in existing files (e.g., `20260326200000_create_follows.sql`): use section headers with `-- ============================================================` comment blocks, `CREATE TABLE IF NOT EXISTS`, explicit constraint names, and `public.` schema prefix on all references.

**Files:** `supabase/migrations/20260330000000_create_messaging.sql`
**AC:**

- File exists at the specified path
- Four enums created: `thread_type` ('inquiry','direct','offer','custom_request'), `thread_status` ('active','archived','closed'), `participant_role` ('buyer','seller','initiator','recipient'), `message_type` ('text','system','offer_node','custom_request_node','listing_node','nudge')
- `message_threads` table has all 10 columns with correct types, FKs to `listings(id)` ON DELETE SET NULL, `shops(id)` ON DELETE SET NULL, `members(id)` ON DELETE CASCADE
- `message_thread_participants` table has all 8 columns with UNIQUE(thread_id, member_id), FKs to `message_threads(id)` ON DELETE CASCADE and `members(id)` ON DELETE CASCADE
- `messages` table has all 10 columns with FKs to `message_threads(id)` ON DELETE CASCADE and `members(id)` ON DELETE CASCADE
  **Expert Domains:** supabase

### Task 1.2: Add indexes, RLS policies, and triggers to the migration file

Append to the same migration file: all specified indexes, RLS policies, and trigger functions. Indexes: `message_threads` on (type), (listing_id), (shop_id), (last_message_at DESC); `message_thread_participants` on (member_id, thread_id), (member_id); `messages` on (thread_id, created_at), (sender_id). RLS: enable on all three tables; `message_threads` SELECT for participants only (subquery checking `message_thread_participants`); `message_thread_participants` SELECT/UPDATE own rows only (`member_id = auth.uid()`); `messages` SELECT for participants, INSERT where `sender_id = auth.uid()` AND sender is a participant. Triggers: `update_thread_last_message()` AFTER INSERT on messages (updates `last_message_at` and `last_message_preview` on the thread), `increment_unread_count()` AFTER INSERT on messages (increments `unread_count` for all participants except sender), `update_thread_timestamp()` BEFORE UPDATE on message_threads (sets `updated_at = now()`). All trigger functions must be `SECURITY DEFINER` with `SET search_path = public`, following the pattern in `20260327155304_watchers_and_price_drop_notifications.sql`.

**Files:** `supabase/migrations/20260330000000_create_messaging.sql`
**AC:**

- 8 indexes created with `CREATE INDEX IF NOT EXISTS` and descriptive names
- RLS enabled on all 3 tables
- 4 RLS policies created: threads SELECT (participant-only), participants SELECT (own rows), participants UPDATE (own rows), messages SELECT (participant-only), messages INSERT (sender is self and participant)
- 3 SECURITY DEFINER trigger functions created with `SET search_path = public`
- 3 triggers attached to their respective tables
- `update_thread_last_message` updates `last_message_at` to `NEW.created_at` and `last_message_preview` to `LEFT(NEW.content, 100)` on the thread
- `increment_unread_count` increments `unread_count` for all participants except the sender
- `update_thread_timestamp` sets `updated_at = now()` on BEFORE UPDATE
  **Expert Domains:** supabase

## Phase 2: Apply Migration and Regenerate Types

**Goal:** Apply the migration to the linked Supabase project, regenerate TypeScript types, and verify the full build passes
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 2.1: Apply the migration via Supabase MCP and verify tables exist

Use the Supabase MCP to apply the migration SQL against the linked project. After applying, verify all four enums and all three tables exist by listing tables. Confirm indexes and RLS policies are in place.

**Files:** `supabase/migrations/20260330000000_create_messaging.sql`
**AC:**

- Migration applies without errors
- `message_threads`, `message_thread_participants`, and `messages` tables exist in the public schema
- All indexes are present
- RLS is enabled on all three tables
  **MCP:** supabase
  **Expert Domains:** supabase

### Task 2.2: Regenerate TypeScript types and verify build passes

Run `pnpm db:types` to regenerate `src/types/database.ts` with the new messaging tables. Then run `pnpm build && pnpm lint && pnpm typecheck` to verify everything compiles cleanly. The generated types file should contain Row/Insert/Update types for `message_threads`, `message_thread_participants`, and `messages`, plus the four new enum types.

**Files:** `src/types/database.ts`
**AC:**

- `pnpm db:types` succeeds
- `src/types/database.ts` contains types for `message_threads`, `message_thread_participants`, and `messages` tables
- `src/types/database.ts` contains enum types for `thread_type`, `thread_status`, `participant_role`, `message_type`
- `pnpm build` passes
- `pnpm lint` passes
- `pnpm typecheck` passes
  **Expert Domains:** supabase, nextjs
