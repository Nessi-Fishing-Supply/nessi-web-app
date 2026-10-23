# Implementation Plan: #307 — Messaging API Routes

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Important Notes

**URL path discrepancy:** The issue body references `src/app/api/messages/threads/` but the client services in `src/features/messaging/services/messaging.ts` use `/api/messaging/threads` and the CLAUDE.md directory structure shows `src/app/api/messaging/`. This plan follows the client services and CLAUDE.md (i.e., `src/app/api/messaging/`).

**HTTP method discrepancy:** The issue says POST for archive, but the client service uses `patch()`. This plan follows the client service (PATCH).

**Duplicate thread signaling:** `createThreadServer` currently returns an existing thread silently on duplicate detection (inquiry or direct). To support the 409 response requirement, the server service signature needs a small extension to return an `{ existing: boolean }` flag alongside the thread data. This is addressed in Task 1.1.

## Phase 1: Core Thread Routes

**Goal:** Create the thread list, thread creation, and thread detail API routes, plus extend `createThreadServer` to signal duplicates.
**Verify:** `pnpm build`

### Task 1.1: Extend createThreadServer to signal duplicate threads

Update `createThreadServer` to return `{ thread: ThreadWithParticipants; existing: boolean }` instead of just `ThreadWithParticipants`. When the function detects a duplicate inquiry or direct thread and returns the existing one, it sets `existing: true`. When it creates a new thread, it sets `existing: false`. This is a non-breaking internal change since the function is only imported by API route handlers (not exported from the barrel). Also export the `CreateThreadResult` type from the types file.
**Files:** `src/features/messaging/services/messaging-server.ts`, `src/features/messaging/types/thread.ts`
**AC:** `createThreadServer` returns `{ thread, existing: true }` for duplicate inquiry/direct threads and `{ thread, existing: false }` for newly created threads. The return type is `CreateThreadResult`. Existing unit tests (if any) still pass.
**Expert Domains:** supabase

### Task 1.2: Create GET and POST handlers for /api/messaging/threads

Create `src/app/api/messaging/threads/route.ts` with two handlers. The GET handler authenticates, extracts the optional `?type=` query param (validates against thread type enum), calls `getThreadsServer(userId, type?)`, and returns the thread list. The POST handler authenticates, reads `{ type, participantIds, roles, listingId?, shopId? }` from the body, calls `createThreadServer`, and returns 201 for new threads or 409 with the existing thread for duplicates. Both handlers use `AUTH_CACHE_HEADERS` and follow the project's try/catch + `NextResponse.json` error pattern.
**Files:** `src/app/api/messaging/threads/route.ts`
**AC:** GET `/api/messaging/threads` returns 200 with `ThreadWithParticipants[]`; GET with `?type=inquiry` filters by type; returns 401 if unauthenticated. POST returns 201 with new thread or 409 with existing thread for duplicates; returns 401 if unauthenticated; returns 400 if required fields are missing.
**Expert Domains:** nextjs, supabase

### Task 1.3: Create GET handler for /api/messaging/threads/[thread_id]

Create `src/app/api/messaging/threads/[thread_id]/route.ts` with a GET handler. Uses Next.js 16 async params pattern (`{ params }: { params: Promise<{ thread_id: string }> }`). Authenticates, calls `getThreadByIdServer(userId, threadId)`, returns the thread or 404 if the user is not a participant.
**Files:** `src/app/api/messaging/threads/[thread_id]/route.ts`
**AC:** GET returns 200 with `ThreadWithParticipants` when user is a participant; returns 404 when user is not a participant or thread does not exist; returns 401 if unauthenticated.
**Expert Domains:** nextjs, supabase

## Phase 2: Message Routes with Safety Filter

**Goal:** Create the message list and message send routes, integrating the safety filter and block check on message creation.
**Verify:** `pnpm build`

### Task 2.1: Create GET handler for /api/messaging/threads/[thread_id]/messages

Create `src/app/api/messaging/threads/[thread_id]/messages/route.ts` with a GET handler for paginated message retrieval. Authenticates, extracts `?cursor=` and `?limit=` query params (limit defaults to 50, capped at 100), calls `getMessagesServer(userId, threadId, cursor, limit)`, and returns `{ messages, nextCursor }`.
**Files:** `src/app/api/messaging/threads/[thread_id]/messages/route.ts`
**AC:** GET returns 200 with `{ messages: MessageWithSender[], nextCursor: string | null }`; respects cursor-based pagination; returns 401 if unauthenticated; returns 403 or appropriate error if user is not a thread participant (propagated from server service). Limit is clamped to 1-100 range.
**Expert Domains:** nextjs, supabase

### Task 2.2: Create POST handler for /api/messaging/threads/[thread_id]/messages with safety filter and block check

Add the POST handler to the same route file created in Task 2.1. The handler: (1) authenticates, (2) reads `{ content, type? }` from body, validates content is a non-empty string, (3) queries `message_thread_participants` to get all participant member*ids for the thread, (4) checks `member_blocks` to see if any other participant has blocked the sender -- returns 403 if blocked, (5) runs `filterMessageContent(content)` from the safety filter, (6) handles each filter action: `block` returns 422 with error message; `redact` calls `createMessageServer` with filtered content and sets `is_filtered: true` + `original_content`; `nudge*\*`calls`createMessageServer`with original content then inserts a second system nudge message via`createMessageServer`; `pass`calls`createMessageServer`with original content. Returns 201 with the`MessageWithSender`.
**Files:** `src/app/api/messaging/threads/[thread_id]/messages/route.ts`**AC:** POST with clean content returns 201 with`MessageWithSender`. POST with explicit language returns 422. POST with PII stores redacted content with `is_filtered: true`and`original_content` preserved. POST with off-platform/negotiation patterns stores original message plus inserts a nudge system message. POST when sender is blocked by a participant returns 403. Returns 401 if unauthenticated. Returns 400 if content is missing or empty.
**Expert Domains:** nextjs, supabase

## Phase 3: Utility Routes

**Goal:** Create the mark-read, archive, and unread-count utility routes.
**Verify:** `pnpm build`

### Task 3.1: Create PATCH handler for /api/messaging/threads/[thread_id]/read

Create `src/app/api/messaging/threads/[thread_id]/read/route.ts` with a PATCH handler. Authenticates, calls `markThreadReadServer(userId, threadId)`, returns `{ success: true }`. The server service already verifies participant membership and throws if not a participant.
**Files:** `src/app/api/messaging/threads/[thread_id]/read/route.ts`
**AC:** PATCH returns 200 with `{ success: true }` when user is a participant. Returns 401 if unauthenticated. Returns 403 or 404 if user is not a participant (catch the thrown error from server service).
**Expert Domains:** nextjs, supabase

### Task 3.2: Create PATCH handler for /api/messaging/threads/[thread_id]/archive

Create `src/app/api/messaging/threads/[thread_id]/archive/route.ts` with a PATCH handler. Authenticates, calls `archiveThreadServer(userId, threadId)`, returns `{ success: true }`. The server service already verifies participant membership.
**Files:** `src/app/api/messaging/threads/[thread_id]/archive/route.ts`
**AC:** PATCH returns 200 with `{ success: true }` when user is a participant. Returns 401 if unauthenticated. Returns 403 or 404 if user is not a participant.
**Expert Domains:** nextjs, supabase

### Task 3.3: Create GET handler for /api/messaging/unread-count

Create `src/app/api/messaging/unread-count/route.ts` with a GET handler. Authenticates, calls `getUnreadCountServer(userId)`, returns `{ count: number }`.
**Files:** `src/app/api/messaging/unread-count/route.ts`
**AC:** GET returns 200 with `{ count: number }` (sum of unread across active threads). Returns 401 if unauthenticated. Returns 0 for users with no threads.
**Expert Domains:** nextjs, supabase
