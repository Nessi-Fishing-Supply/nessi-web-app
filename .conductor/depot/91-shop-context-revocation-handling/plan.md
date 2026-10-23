# Implementation Plan: #91 — Shop Context Revocation Handling

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Foundation — Custom Error Class and Context Store Enhancement

**Goal:** Create a typed error class that preserves HTTP status codes and extend the context store to cache the active shop name for toast messages.
**Verify:** `pnpm build`

### Task 1.1: Create FetchError class that preserves HTTP status codes

The fetch wrapper at `src/libs/fetch.ts` currently throws a generic `Error` on non-ok responses, discarding the HTTP status code. Create a custom `FetchError` class that extends `Error` and includes a `status` property. Update the `request()` function in `src/libs/fetch.ts` to throw `FetchError` instead of `Error`, preserving the response status code. This is the foundation for detecting 403s downstream.
**Files:** `src/libs/fetch-error.ts` (create), `src/libs/fetch.ts` (modify)
**AC:** `FetchError` class exists with `status: number` and `message: string` properties; all non-ok responses from the fetch wrapper throw `FetchError` with the correct HTTP status code; existing error message extraction logic is preserved; `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.2: Add shopName cache to context store

The context store currently stores `{ type: 'shop'; shopId: string }` but not the shop name. When a 403 triggers context revocation, the toast needs to display the shop name, but the shop data query will already be failing. Add an optional `shopName` field to the `ActiveContext` shop variant and update `switchToShop` to accept a `shopName` parameter. Update the navbar's context switch buttons to pass the shop name when calling `switchToShop`. Update the context feature CLAUDE.md to document the new field.
**Files:** `src/features/context/stores/context-store.ts` (modify), `src/components/navigation/navbar/index.tsx` (modify), `src/features/context/CLAUDE.md` (modify)
**AC:** `ActiveContext` shop variant includes `shopName?: string`; `switchToShop(shopId, shopName?)` accepts optional shop name; navbar passes `shop.shop_name` when switching to a shop; persisted context includes the shop name; `pnpm typecheck` passes.
**Reuses:** `src/components/navigation/navbar/` (modify existing)
**Expert Domains:** state-management

## Phase 2: Core — 403 Interception and Auto-Switch Logic

**Goal:** Wire up 403 detection in the Tanstack Query global error handler that triggers context revocation when in shop context, switches to member, and shows a toast notification.
**Verify:** `pnpm build`

### Task 2.1: Create context revocation handler utility

Create a utility function `handleContextRevocation()` in `src/features/context/utils/handle-context-revocation.ts` that encapsulates the revocation logic: (1) reads the current context store state, (2) if `activeContext.type === 'shop'`, calls `switchToMember()`, (3) returns the shop name (from `activeContext.shopName` or fallback `'this shop'`) so the caller can show a toast. This function operates outside React (reads Zustand store directly via `getState()`), making it callable from both the query client error handler and the fetch wrapper.
**Files:** `src/features/context/utils/handle-context-revocation.ts` (create)
**AC:** Function returns `{ revoked: true; shopName: string }` when in shop context, or `{ revoked: false }` when in member context; calls `switchToMember()` only when in shop context; reads store state via `useContextStore.getState()` (no React dependency); `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 2.2: Create ContextRevocationListener component

Create a React component `ContextRevocationListener` that subscribes to a lightweight event emitter (or uses a Zustand-based signal) to bridge the gap between the non-React 403 handler and the React toast system. When a revocation event fires, the component calls `useToast().showToast()` with the appropriate error message and uses `useRouter().push('/dashboard')` to redirect. Place this component inside `src/features/context/components/context-revocation-listener.tsx` and render it in `src/libs/providers.tsx` (inside ToastProvider so it has access to `useToast`).
**Files:** `src/features/context/components/context-revocation-listener.tsx` (create), `src/libs/providers.tsx` (modify)
**AC:** Component renders no visible UI; when a revocation event is dispatched, it shows a toast with type `'error'`, message `'Access Revoked'`, and description `'You no longer have access to [shop name]'`; it navigates to `/dashboard`; component is rendered inside `ToastProvider` in `providers.tsx`; `pnpm build` passes.
**Reuses:** `src/components/indicators/toast/context` (useToast hook)
**Expert Domains:** state-management, nextjs

### Task 2.3: Add 403 detection to the fetch wrapper

Modify the `request()` function in `src/libs/fetch.ts` to detect 403 responses when the active context is a shop. Before throwing the `FetchError`, check: if `res.status === 403` and `useContextStore.getState().activeContext.type === 'shop'`, call `handleContextRevocation()` and dispatch the revocation event (so the listener component shows the toast). The `FetchError` is still thrown so the calling code's error handling works normally. This ensures ANY fetch call (not just Tanstack Query) triggers revocation on 403 in shop context.
**Files:** `src/libs/fetch.ts` (modify)
**AC:** When a 403 response is received while `activeContext.type === 'shop'`, context switches to member and a revocation event is dispatched before the error is thrown; when a 403 is received while `activeContext.type === 'member'`, no revocation occurs and the error is thrown normally; non-403 errors are unaffected; `pnpm typecheck` passes.
**Expert Domains:** state-management, nextjs

### Task 2.4: Add global onError to Tanstack Query for 403 handling

Update `src/libs/query-client.ts` to add a global `queryCache` `onError` callback on the `QueryClient`. This callback checks if the error is a `FetchError` with `status === 403` and the active context is a shop. If so, it calls `handleContextRevocation()` and dispatches the revocation event. This provides a safety net for any queries that might use direct Supabase calls (which bypass the fetch wrapper) and return 403-like errors. The fetch wrapper already handles its own 403s, so include a deduplication guard (e.g., a timestamp check) to avoid double-firing the toast within a short window.
**Files:** `src/libs/query-client.ts` (modify)
**AC:** `QueryClient` is configured with a `queryCache` `onError` callback; callback detects `FetchError` with status 403 in shop context; deduplication prevents multiple toasts within 2 seconds; member-context 403s are ignored; `pnpm typecheck` passes.
**Expert Domains:** state-management, nextjs

## Phase 3: Polish — Query Invalidation, Edge Cases, and Documentation

**Goal:** Ensure the dashboard re-renders with member-scoped data after revocation and handle edge cases cleanly.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 3.1: Invalidate shop-scoped queries on context revocation

When context switches from shop to member, stale shop-scoped data may remain in the Tanstack Query cache. Update the revocation handler to invalidate all queries after switching context, so dashboard components refetch with member-scoped data. Use `getQueryClient().invalidateQueries()` to broadly invalidate, since the `X-Nessi-Context` header will now send `member` on refetch. Also remove/cancel any in-flight shop-scoped queries to prevent additional 403 errors from triggering duplicate revocation events.
**Files:** `src/features/context/utils/handle-context-revocation.ts` (modify)
**AC:** After context revocation, `queryClient.invalidateQueries()` is called to refetch all active queries; `queryClient.cancelQueries()` is called first to cancel in-flight requests; dashboard components re-render with member-scoped data after revocation; no cascade of 403 errors from stale in-flight shop queries.
**Expert Domains:** state-management, nextjs

### Task 3.2: Update context feature CLAUDE.md with revocation documentation

Document the full revocation flow in the context feature CLAUDE.md: the FetchError class, the 403 detection in the fetch wrapper, the revocation handler utility, the listener component, the Tanstack Query global onError, and the deduplication mechanism. Include the event flow diagram and list all files involved.
**Files:** `src/features/context/CLAUDE.md` (modify)
**AC:** CLAUDE.md documents the revocation flow end-to-end; lists all new files created; describes the event flow from 403 response to toast display; documents the deduplication mechanism; documents the query invalidation behavior.
