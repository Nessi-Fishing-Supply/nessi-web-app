# Implementation Plan: #310 — Messaging — Tanstack Query hooks

## Overview

3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Query Hooks (read operations)

**Goal:** Create all read-only Tanstack Query hooks for threads, messages, and unread count
**Verify:** `pnpm build`

### Task 1.1: Create the hooks directory and `use-threads` hook

Create `src/features/messaging/hooks/use-threads.ts`. This hook wraps `getThreads(type?)` from the client service with `useQuery`. The query key is `['messages', 'threads', type]` and it is always enabled (returns all threads when no type is provided). Follow the `useFollowing(targetType?)` pattern from `src/features/follows/hooks/use-following.ts` which also has an optional filter parameter in the query key.
**Files:** `src/features/messaging/hooks/use-threads.ts`
**AC:** `useThreads()` returns `{ data: ThreadWithParticipants[], isLoading, isError }`. `useThreads('inquiry')` passes `'inquiry'` to `getThreads` and includes it in the query key for independent caching.
**Expert Domains:** state-management

### Task 1.2: Create `use-thread` hook for single thread fetching

Create `src/features/messaging/hooks/use-thread.ts`. This hook wraps `getThread(threadId)` with `useQuery`. The query key is `['messages', 'threads', threadId]` and it is enabled only when `threadId` is truthy. Follow the `useWatchStatus(listingId)` pattern from `src/features/watchlist/hooks/use-watch-status.ts` which uses `enabled: !!param` and non-null assertion on `queryFn`.
**Files:** `src/features/messaging/hooks/use-thread.ts`
**AC:** `useThread(threadId)` returns `{ data: ThreadWithParticipants, isLoading }`. Query is disabled when `threadId` is `undefined` or empty string.
**Expert Domains:** state-management

### Task 1.3: Create `use-messages` infinite query hook

Create `src/features/messaging/hooks/use-messages.ts`. This hook wraps `getMessages(threadId, cursor?)` with `useInfiniteQuery` for cursor-based pagination. The query key is `['messages', 'threads', threadId, 'messages']`. Use `initialPageParam: undefined` (no cursor on first page) and `getNextPageParam: (lastPage) => lastPage.nextCursor`. Enabled only when `threadId` is truthy. Reference the existing `useInfiniteQuery` pattern in `src/features/listings/hooks/use-listings-infinite.ts` but adapt for cursor-based pagination (the client service `getMessages` returns `{ messages: MessageWithSender[], nextCursor: string | null }`).
**Files:** `src/features/messaging/hooks/use-messages.ts`
**AC:** `useMessages(threadId)` returns `{ data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading }`. `hasNextPage` is `true` when `nextCursor` is not null. Query is disabled when `threadId` is falsy.
**Expert Domains:** state-management

### Task 1.4: Create `use-unread-count` polling hook

Create `src/features/messaging/hooks/use-unread-count.ts`. This hook wraps `getUnreadCount()` with `useQuery`. The query key is `['messages', 'unread-count']`. Set `refetchInterval: 60_000` to poll every 60 seconds for unread badge updates. Always enabled for authenticated users. Follow the simple `useWatchlist()` pattern but add the `refetchInterval` option.
**Files:** `src/features/messaging/hooks/use-unread-count.ts`
**AC:** `useUnreadCount()` returns `{ data: { count: number }, isLoading }`. The query re-fetches every 60 seconds automatically.
**Expert Domains:** state-management

## Phase 2: Mutation Hooks (write operations with optimistic updates)

**Goal:** Create all mutation hooks for sending messages, creating threads, and marking threads read
**Verify:** `pnpm build`

### Task 2.1: Create `use-send-message` mutation with optimistic update

Create `src/features/messaging/hooks/use-send-message.ts`. This mutation calls `sendMessage(threadId, content)` from the client service. Implement optimistic updates following the `useWatchToggle` pattern from `src/features/watchlist/hooks/use-watch-toggle.ts`: in `onMutate`, cancel in-flight queries for the messages key, snapshot the previous cache, and prepend a temporary `MessageWithSender` to the infinite query pages. On error, revert to the snapshot and call the optional `onError` callback. On settle, invalidate both `['messages', 'threads', threadId, 'messages']` and `['messages', 'threads']` (so the thread list preview updates). The hook accepts `{ threadId, onSuccess?, onError? }` options.
**Files:** `src/features/messaging/hooks/use-send-message.ts`
**AC:** Mutation prepends an optimistic message to the first page of the infinite query cache before the server responds. On server error, the optimistic message is removed and `onError` callback fires. On success, both thread list and messages caches are invalidated.
**Expert Domains:** state-management

### Task 2.2: Create `use-create-thread` mutation

Create `src/features/messaging/hooks/use-create-thread.ts`. This mutation calls `createThread(params)` from the client service. No optimistic update needed (thread creation navigates to the new thread). On success, invalidate `['messages', 'threads']` and call the optional `onSuccess` callback with the new thread. Handle 409 (duplicate thread) as success per the constraint: `FetchError` with status 409 should route to `onSuccess` rather than `onError`, following the same pattern as `useWatchToggle`. The hook accepts `{ onSuccess?, onError? }` options.
**Files:** `src/features/messaging/hooks/use-create-thread.ts`
**AC:** Mutation invalidates thread list on success. 409 response is treated as success (calls `onSuccess`, not `onError`). `onSuccess` receives the new `ThreadWithParticipants`.
**Expert Domains:** state-management

### Task 2.3: Create `use-mark-read` mutation with optimistic update

Create `src/features/messaging/hooks/use-mark-read.ts`. This mutation calls `markThreadRead(threadId)` from the client service. Implement optimistic update: in `onMutate`, set the target thread's `my_unread_count` to 0 in the `['messages', 'threads']` cache (iterate the cached thread list and update the matching thread). On error, revert to the snapshot. On settle, invalidate both `['messages', 'threads']` and `['messages', 'unread-count']` so the nav badge updates. The hook returns a mutation where `mutate` accepts a `threadId` string.
**Files:** `src/features/messaging/hooks/use-mark-read.ts`
**AC:** Mutation optimistically sets `my_unread_count` to 0 for the target thread in the thread list cache. On settle, invalidates both thread list and unread count queries.
**Expert Domains:** state-management

## Phase 3: Barrel Export and Verification

**Goal:** Export all hooks from the barrel file and verify the full build passes
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check`

### Task 3.1: Export all hooks from the messaging barrel file

Update `src/features/messaging/index.ts` to add named exports for all 7 hooks: `useThreads`, `useThread`, `useMessages`, `useSendMessage`, `useCreateThread`, `useMarkRead`, `useUnreadCount`. Follow the barrel export pattern in `src/features/watchlist/index.ts` which exports hooks as named function exports alongside existing type and service exports.
**Files:** `src/features/messaging/index.ts`
**AC:** All 7 hooks are importable via `import { useThreads, useThread, useMessages, useSendMessage, useCreateThread, useMarkRead, useUnreadCount } from '@/features/messaging'`. Existing type and service exports are preserved.
**Expert Domains:** state-management

### Task 3.2: Update the messaging CLAUDE.md hooks section

Update the hooks section of `src/features/messaging/CLAUDE.md` to reflect the actual implementation: correct query keys (using `['messages', ...]` prefix), accurate hook signatures, and usage examples. The current CLAUDE.md has placeholder query keys (`['messaging', ...]`) that differ from the ticket spec (`['messages', ...]`). Update the directory structure section to remove the "Phase 2" comment on the hooks directory.
**Files:** `src/features/messaging/CLAUDE.md`
**AC:** CLAUDE.md hooks section documents all 7 hooks with correct query keys, signatures, and usage examples. Directory structure shows actual hook filenames without phase comments.

### Task 3.3: Run full verification suite

Run `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check` to verify all hooks compile, lint cleanly, pass type checking, and meet formatting standards. Fix any issues that arise.
**Files:** All hook files in `src/features/messaging/hooks/`
**AC:** All four commands pass with zero errors.
