# Implementation Plan: #304 — Messaging scaffold with types, server services, and client services

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Types and barrel export

**Goal:** Define all messaging TypeScript types derived from the database schema and set up the barrel export
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create thread types

Define thread-related types derived from `Database['public']['Tables']` and `Database['public']['Enums']`. `MessageThread` is the Row type from `message_threads`. `MessageThreadInsert` omits auto-generated fields (`id`, `created_at`, `updated_at`, `last_message_at`, `last_message_preview`). `ThreadType` and `ThreadStatus` are enum aliases. `ThreadParticipant` is the Row type from `message_thread_participants`. `ParticipantRole` is the enum alias. `ThreadWithParticipants` is the enriched type combining a thread with its participants array, where each participant includes `member_id`, `role`, `unread_count`, `first_name`, `last_name`, and `avatar_url` from the members table, plus a top-level `my_unread_count` field for the current user's unread count.

**Files:** `src/features/messaging/types/thread.ts`
**AC:** File exports `MessageThread`, `MessageThreadInsert`, `ThreadType`, `ThreadStatus`, `ThreadParticipant`, `ParticipantRole`, `ThreadWithParticipants` — all derived from `Database` types (no manual column definitions). `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.2: Create message types

Define message-related types derived from the database schema. `Message` is the Row type from `messages`. `MessageInsert` omits auto-generated fields (`id`, `created_at`, `edited_at`, `is_filtered`, `original_content`). `MessageType` is the enum alias. `MessageWithSender` is the enriched type combining a message with sender info (`sender_id`, `first_name`, `last_name`, `avatar_url`).

**Files:** `src/features/messaging/types/message.ts`
**AC:** File exports `Message`, `MessageInsert`, `MessageType`, `MessageWithSender` — all derived from `Database` types. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.3: Create barrel export and update CLAUDE.md

Create the barrel `index.ts` that re-exports all types from `types/thread.ts` and `types/message.ts`. Update `src/features/messaging/CLAUDE.md` to document the full feature architecture: types, server services, client services, existing components, utils, and directory structure. Follow the format of `src/features/watchlist/CLAUDE.md` and `src/features/follows/CLAUDE.md`.

**Files:** `src/features/messaging/index.ts`, `src/features/messaging/CLAUDE.md`
**AC:** Barrel exports all type aliases from both type files. CLAUDE.md documents types, services (signatures and descriptions), existing components, utils, and directory structure. `pnpm build` passes.
**Expert Domains:** nextjs

## Phase 2: Server and client services

**Goal:** Implement the server-side Supabase query functions and client-side fetch wrapper functions for the messaging data layer
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 2.1: Create server services

Implement `messaging-server.ts` with 8 functions using `createClient` from `@/libs/supabase/server`. Follow the patterns from `src/features/watchlist/services/watchlist-server.ts` and `src/features/follows/services/follow-server.ts`: each function creates a Supabase client, runs the query, checks for errors, and throws descriptive `Error` messages on failure.

Functions:

- `getThreadsServer(userId)` — Select threads where the user is a participant via join to `message_thread_participants`, include participant info (member names, avatars, roles, unread counts) and order by `last_message_at DESC`. Return `ThreadWithParticipants[]`.
- `getThreadByIdServer(userId, threadId)` — Select a single thread by ID, verify user is a participant, include participant info. Return `ThreadWithParticipants`.
- `createThreadServer(userId, data)` — Insert a new `message_threads` row and the initial `message_thread_participants` rows. Accept thread type, optional listing_id/shop_id, and participant member IDs with roles. Return the created `ThreadWithParticipants`.
- `getMessagesServer(userId, threadId, options?)` — Select messages for a thread with sender info (first_name, last_name, avatar_url via join to members). Support cursor-based pagination (before cursor, limit). Verify the user is a participant. Return `MessageWithSender[]`.
- `createMessageServer(userId, threadId, content, type?)` — Insert a message row. Verify sender is a participant. Update `message_threads.last_message_at` and `last_message_preview`. Increment `unread_count` for other participants. Return `MessageWithSender`.
- `markThreadReadServer(userId, threadId)` — Update `message_thread_participants.last_read_at` to now and reset `unread_count` to 0 for the current user in this thread. Return `{ success: boolean }`.
- `archiveThreadServer(userId, threadId)` — Update `message_threads.status` to `'archived'` where the user is a participant. Return `{ success: boolean }`.
- `getUnreadCountServer(userId)` — Sum `unread_count` from `message_thread_participants` for the user across all active threads. Return `{ count: number }`.

**Files:** `src/features/messaging/services/messaging-server.ts`
**AC:** All 8 functions are exported with correct TypeScript signatures. Each uses `createClient` from `@/libs/supabase/server`. Error handling follows the throw-on-error pattern from watchlist/follows services. `pnpm typecheck` passes.
**Expert Domains:** supabase, nextjs

### Task 2.2: Create client services

Implement `messaging.ts` as thin fetch wrappers using `get`, `post`, `patch`, `del` from `@/libs/fetch`. Follow the pattern from `src/features/watchlist/services/watchlist.ts` and `src/features/follows/services/follow.ts`: each function is an exported arrow function that calls the appropriate HTTP method with typed return.

Functions:

- `getThreads()` — `GET /api/messaging/threads` returns `ThreadWithParticipants[]`
- `getThread(threadId)` — `GET /api/messaging/threads/{threadId}` returns `ThreadWithParticipants`
- `createThread(data)` — `POST /api/messaging/threads` returns `ThreadWithParticipants`
- `getMessages(threadId, cursor?)` — `GET /api/messaging/threads/{threadId}/messages` with optional `?before=` cursor param, returns `MessageWithSender[]`
- `sendMessage(threadId, content, type?)` — `POST /api/messaging/threads/{threadId}/messages` returns `MessageWithSender`
- `markThreadRead(threadId)` — `PATCH /api/messaging/threads/{threadId}/read` returns `{ success: boolean }`
- `archiveThread(threadId)` — `PATCH /api/messaging/threads/{threadId}/archive` returns `{ success: boolean }`
- `getUnreadCount()` — `GET /api/messaging/unread-count` returns `{ count: number }`

Update the barrel export `index.ts` to also re-export the client service functions (not the server services — those are server-only). Update CLAUDE.md with the final service signatures.

**Files:** `src/features/messaging/services/messaging.ts`, `src/features/messaging/index.ts`, `src/features/messaging/CLAUDE.md`
**AC:** All 8 client functions are exported. Each uses the correct HTTP method from `@/libs/fetch`. Barrel export includes all types and client service functions. `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check` all pass.
**Expert Domains:** nextjs
