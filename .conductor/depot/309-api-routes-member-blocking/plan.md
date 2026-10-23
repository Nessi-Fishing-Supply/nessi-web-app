# Implementation Plan: #309 — Messaging — API routes for member blocking

## Overview

2 phases, 6 total tasks
Estimated scope: small

## Phase 1: Types and Services

**Goal:** Create the block types in the messaging domain, plus server and client service functions for blocking and unblocking members.
**Verify:** `pnpm build`

### Task 1.1: Create block types for the messaging domain

Define `MemberBlock` and `MemberBlockInsert` types derived from the `member_blocks` database table. The blocks feature at `src/features/blocks/types/block.ts` already defines `MemberBlock` as a Row type -- this file in the messaging domain should follow the same pattern and add the `Insert` type. Use the `Database['public']['Tables']['member_blocks']` type from `src/types/database.ts` (Row has `id`, `blocker_id`, `blocked_id`, `created_at`; Insert makes `id` and `created_at` optional).
**Files:** `src/features/messaging/types/block.ts`
**AC:** File exports `MemberBlock` (Row) and `MemberBlockInsert` (Insert) types derived from the database schema. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.2: Create server-side block services

Implement `blockMemberServer`, `unblockMemberServer`, `isBlockedServer`, and `getBlockedMembersServer` in the messaging services directory. Follow the exact patterns from `src/features/watchlist/services/watchlist-server.ts` (uses `createClient` from `@/libs/supabase/server`, catches `23505` for duplicates on insert) and `src/features/blocks/services/block-server.ts` (delete with `.select()` returning `{ success: boolean }`). Specifically: `blockMemberServer(blockerId, blockedId)` validates `blockerId !== blockedId` before inserting, catches `23505` and returns the existing row (matching `addWatcherServer` pattern). `unblockMemberServer` deletes by composite key and returns `{ success: false }` if no row was deleted (matching `removeWatcherServer` and `blocks/block-server.ts` `unblockMemberServer`). `isBlockedServer` uses `.maybeSingle()` (matching `blocks/block-server.ts` `isBlockedByServer`). `getBlockedMembersServer` selects all blocks for a blocker ordered by `created_at DESC`.
**Files:** `src/features/messaging/services/blocks-server.ts`
**AC:** All four functions are exported, use `createClient` from `@/libs/supabase/server`, self-block throws an error, duplicate insert returns existing row instead of throwing. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.3: Create client-side block services

Implement `blockMember` and `unblockMember` fetch wrappers. Follow the pattern from `src/features/messaging/services/offers.ts` and `src/features/watchlist/services/watchlist.ts` -- use `post` and `del` from `@/libs/fetch`. `blockMember(memberId)` calls `POST /api/members/block` with `{ memberId }` body. `unblockMember(memberId)` calls `DELETE /api/members/block/{memberId}` (path param, not query string -- per the ticket constraint).
**Files:** `src/features/messaging/services/blocks.ts`
**AC:** Both functions are exported. `blockMember` uses `post` with body `{ memberId }`. `unblockMember` uses `del` with the member ID in the URL path. Import types from `src/features/messaging/types/block.ts`. `pnpm typecheck` passes.
**Expert Domains:** nextjs

## Phase 2: API Routes and Documentation

**Goal:** Create the POST and DELETE API route handlers and update the messaging barrel export and CLAUDE.md.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 2.1: Create POST route handler for blocking a member

Create the POST handler at `src/app/api/members/block/route.ts`. Follow the exact auth pattern from `src/app/api/offers/route.ts`: `createClient` + `getUser()` for auth (401 if no user), parse body for `memberId` (400 if missing), call `blockMemberServer(user.id, memberId)`. Return 201 on success. For self-block (`blockerId === blockedId`), catch the error and return 400. For duplicate (`23505` -- already handled in the service layer returning existing), detect the "already blocked" case and return 409 with `{ error: 'Already blocked' }`. Use `AUTH_CACHE_HEADERS` from `@/libs/api-headers` on all responses. Add a description comment above the handler: `// Block a member to prevent them from messaging you`.
**Files:** `src/app/api/members/block/route.ts`
**AC:** POST with `{ memberId }` returns 201 with the block row. POST with own userId returns 400. POST for already-blocked member returns 409. POST without auth returns 401. Description comment present above handler.
**Expert Domains:** nextjs, supabase

### Task 2.2: Create DELETE route handler for unblocking a member

Create the DELETE handler at `src/app/api/members/block/[member_id]/route.ts`. Follow the pattern from `src/app/api/offers/[id]/route.ts` for dynamic route params (`params: Promise<{ member_id: string }>` with `await params`). Auth check with 401. Call `unblockMemberServer(user.id, member_id)`. If `success: false`, return 404 with `{ error: 'Block not found' }` (matching the pattern from `src/app/api/blocks/route.ts` DELETE handler). On success return 200 with `{ success: true }`. Use `AUTH_CACHE_HEADERS`. Add description comment: `// Unblock a member to allow them to message you again`.
**Files:** `src/app/api/members/block/[member_id]/route.ts`
**AC:** DELETE removes the block and returns 200. DELETE for non-blocked member returns 404. DELETE without auth returns 401. Dynamic param uses `await params` pattern. Description comment present above handler.
**Expert Domains:** nextjs, supabase

### Task 2.3: Update messaging barrel export

Add block type exports and client service exports to `src/features/messaging/index.ts`. Follow the existing grouping pattern: type exports use `export type { ... } from` and service exports use `export { ... } from`. Add `MemberBlock` and `MemberBlockInsert` type exports from `@/features/messaging/types/block`. Add `blockMember` and `unblockMember` exports from `@/features/messaging/services/blocks`. Server services are NOT exported from the barrel (matching the convention documented in CLAUDE.md -- server services are imported directly by API routes).
**Files:** `src/features/messaging/index.ts`
**AC:** `MemberBlock`, `MemberBlockInsert`, `blockMember`, and `unblockMember` are importable from `@/features/messaging`. Server services are not exported from the barrel.
**Expert Domains:** nextjs

### Task 2.4: Update messaging CLAUDE.md with blocks documentation

Add a "Blocks" section to `src/features/messaging/CLAUDE.md` documenting the new types, server services, client services, and API routes. Follow the existing documentation format used for the Offers section (table format for types, services, routes). Document the `member_blocks` table reference (point to `src/features/blocks/CLAUDE.md` for the full schema). Add the new files to the directory structure tree. Update the public API section to include the new block exports.
**Files:** `src/features/messaging/CLAUDE.md`
**AC:** CLAUDE.md includes a Blocks section with types table, server services table, client services table, API routes table, and updated directory structure. References `src/features/blocks/CLAUDE.md` for full schema details.
