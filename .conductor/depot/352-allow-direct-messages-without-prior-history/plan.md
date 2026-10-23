# Implementation Plan: #352 — fix(messaging): allow direct messages between any members without prior transaction history

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Root Cause Analysis

The bug is in `src/app/api/messaging/threads/route.ts` lines 121-132. When creating a `direct` thread without a `listingId`, the POST handler calls `hasTransactionHistoryServer(user.id, otherParticipantId)` and returns a **403** if it returns `false`. This explicitly blocks direct messaging between members who have no prior transaction history.

The `hasTransactionHistoryServer` function itself (in `messaging-server.ts` lines 651-665) is also flawed — it checks whether _both_ members have `total_transactions > 0` on their member records, not whether they have transacted _with each other_. But the real fix is simpler: this gate should not exist at all. The product intent is that any authenticated member can DM any other member.

Additionally, the `MessageButton` component (lines 32-38) catches the 403 and displays a toast saying "Direct messaging requires a prior transaction with this user" — this error-handling path should be removed since the 403 will no longer occur for this reason.

**Files involved:**

- `src/app/api/messaging/threads/route.ts` — the transaction history gate (lines 121-132) must be removed
- `src/features/messaging/services/messaging-server.ts` — `hasTransactionHistoryServer` function becomes dead code
- `src/features/messaging/components/message-button/index.tsx` — the 403 toast for "prior transaction" becomes dead code

**Not affected (already correct):**

- `createThreadServer` in `messaging-server.ts` — the direct thread duplicate detection (lines 314-362) works correctly and does not gate on transactions
- Block enforcement on message sending (`src/app/api/messaging/threads/[thread_id]/messages/route.ts` lines 121-143) is already implemented correctly
- Thread listing in `getThreadsServer` already filters out threads with members who have blocked the user

**Missing (should be added):**

- The POST thread creation route has no block check — a member could create a direct thread with someone who blocked them. Block enforcement only exists on the message-sending route. A block check should be added to thread creation to prevent this.

## Phase 1: Remove transaction history gate and add block check to thread creation

**Goal:** Remove the transaction history requirement from direct thread creation and add block enforcement so blocked members cannot initiate threads
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 1.1: Remove transaction history gate from POST /api/messaging/threads

Remove the `hasTransactionHistoryServer` call and the surrounding `if` block (lines 121-132) in the POST handler. Remove the `hasTransactionHistoryServer` import from line 9. This is the primary fix — after this change, any authenticated member can create a direct thread with any other member.
**Files:** `src/app/api/messaging/threads/route.ts`
**AC:** POST to `/api/messaging/threads` with `type: 'direct'` succeeds (201 or 409) for any two authenticated members regardless of transaction history; the `hasTransactionHistoryServer` import is removed from this file
**Expert Domains:** nextjs, supabase

### Task 1.2: Add block check to thread creation POST handler

Add a block check before thread creation in the POST handler. After participant validation and before calling `createThreadServer`, query `member_blocks` to check if either member has blocked the other. Return 403 with message "You cannot message this user" if a block exists in either direction. This ensures blocked members cannot initiate threads (currently only message-sending is block-gated).
**Files:** `src/app/api/messaging/threads/route.ts`
**AC:** POST to `/api/messaging/threads` returns 403 when a block relationship exists between the authenticated user and the target participant (in either direction: blocker or blocked); non-blocked members can create threads normally
**Expert Domains:** nextjs, supabase

### Task 1.3: Remove hasTransactionHistoryServer function from messaging-server.ts

Delete the `hasTransactionHistoryServer` function (lines 651-665) from the server service since it is now dead code with no remaining callers. Verify no other files import it.
**Files:** `src/features/messaging/services/messaging-server.ts`
**AC:** `hasTransactionHistoryServer` no longer exists in the codebase; no import references remain; `pnpm build` passes
**Expert Domains:** supabase

## Phase 2: Clean up client-side error handling

**Goal:** Remove the transaction-gate-specific error handling from the MessageButton component since that 403 path no longer exists
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 2.1: Remove transaction-specific 403 handling from MessageButton

In `src/features/messaging/components/message-button/index.tsx`, remove the special-case handling for `FetchError` with status 403 that displays "Direct messaging requires a prior transaction with this user" (lines 32-38). Replace it with a generic error path or merge it into the existing generic error toast. The `FetchError` import can be removed if no other 403 handling remains. Note: keep the generic error toast for other failure cases.
**Files:** `src/features/messaging/components/message-button/index.tsx`
**AC:** The MessageButton no longer shows a toast mentioning "prior transaction"; generic errors still display a toast; the `FetchError` import is removed if unused; `pnpm build` passes
**Expert Domains:** nextjs, state-management
