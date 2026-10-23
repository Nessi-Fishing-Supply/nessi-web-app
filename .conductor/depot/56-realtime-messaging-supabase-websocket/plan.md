# Implementation Plan: #56 — Real-time messaging — Supabase Realtime WebSocket for instant messages and notifications

## Overview

5 phases, 24 total tasks
Estimated scope: large

## Phase 1: Database Schema Changes & Realtime Foundation

**Goal:** Enable Supabase Realtime on messaging/notification tables, add the realtime utility library, and create the API route for heartbeat updates
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Enable Supabase Realtime on messages and notifications tables

Add the `messages` and `notifications` tables to the Supabase Realtime publication so that Postgres changes are broadcast over WebSocket. The `message_thread_participants` table should also be added so unread count changes propagate. Verify that RLS policies on these tables will filter Realtime events correctly (Supabase Realtime respects RLS for Postgres Changes).
**MCP:** supabase
**Files:** Supabase SQL migration (applied via MCP)
**AC:** `messages`, `notifications`, and `message_thread_participants` tables are in the `supabase_realtime` publication. RLS policies remain intact and filter events to authorized users only.
**Expert Domains:** supabase

### Task 1.2: Create Supabase Realtime utility library

Create a shared utility module that provides helper functions for subscribing to Postgres Changes channels with automatic cleanup, exponential backoff reconnection, and typed channel creation. This centralizes all Realtime boilerplate so individual hooks stay lean. The module should export a `subscribeToTable` helper that accepts table name, filter, event type, and callback, returning an unsubscribe function. Also export a `createBroadcastChannel` helper for ephemeral events (typing indicators).
**Files:** `src/libs/supabase/realtime.ts`
**AC:** Module exports `subscribeToTable` and `createBroadcastChannel` functions. Both return cleanup functions. `subscribeToTable` accepts generic type parameter for the row payload. Reconnection uses exponential backoff (1s, 2s, 4s, 8s, max 30s). `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 1.3: Create heartbeat API route for online status

Create an API route that updates the current user's `last_seen_at` column in the `members` table. The `last_seen_at` column already exists in the schema. This route will be called by the client-side heartbeat hook every 60 seconds.
**Files:** `src/app/api/members/heartbeat/route.ts`
**AC:** `PATCH /api/members/heartbeat` updates `members.last_seen_at` to `now()` for the authenticated user. Returns 401 if unauthenticated, 200 on success. Has a description comment above the export.
**Expert Domains:** supabase, nextjs

### Task 1.4: Add browser notification preference to notification_preferences JSONB

Extend the `NotificationPreferences` type interface to include a `browser` section with a `push_notifications` boolean. Update the `parsePreferences` function in the notifications account component to handle the new section with a default of `false`. Add a "Browser notifications" toggle to the account notification settings UI.
**Files:** `src/features/members/components/account/notifications/index.tsx`
**AC:** The notification preferences component renders a "Browser notifications" toggle under a new "Browser" heading. Toggle saves `notification_preferences.browser.push_notifications` to the member record. Defaults to `false` when not present. Existing email toggles continue to work.
**Expert Domains:** nextjs

### Task 1.5: Regenerate Supabase database types

Run `pnpm db:types` to regenerate `src/types/database.ts` after any schema changes from Task 1.1. This ensures TypeScript types match the updated database schema.
**Files:** `src/types/database.ts`
**AC:** `pnpm db:types` completes without errors. `pnpm typecheck` passes.
**Expert Domains:** supabase

## Phase 2: Core Realtime Hooks

**Goal:** Build the Tanstack Query-integrated hooks for real-time message subscriptions, notification subscriptions, typing indicators, and online status heartbeat
**Verify:** `pnpm build && pnpm typecheck`

### Task 2.1: Create use-realtime-messages hook

Create a hook that subscribes to Postgres Changes on the `messages` table filtered by `thread_id`. When a new message INSERT arrives, prepend it to the `useMessages` infinite query cache (same pattern as the optimistic update in `use-send-message.ts` but for remote messages). When the incoming message's `sender_id` matches the current user, skip the cache update (already handled by optimistic update). Use `subscribeToTable` from the realtime utility. Clean up subscription on unmount.
**Files:** `src/features/messaging/hooks/use-realtime-messages.ts`
**AC:** Hook accepts `threadId` and `currentUserId`. Subscribes to `messages` table changes filtered by `thread_id = threadId`. New messages from other users appear in the query cache immediately. Subscription unsubscribes on unmount or when `threadId` changes. Does not duplicate messages already added via optimistic update.
**Expert Domains:** supabase, state-management

### Task 2.2: Create use-realtime-notifications hook

Create a hook that subscribes to Postgres Changes on the `notifications` table filtered by `user_id`. On INSERT events, invalidate the `['notifications']` and `['notifications', 'unread-count']` query keys so the notification panel and badge refresh. Also trigger a browser Notification API call if the user has granted permission and has the `browser.push_notifications` preference enabled.
**Files:** `src/features/notifications/hooks/use-realtime-notifications.ts`
**AC:** Hook accepts `userId` and `enabled` boolean. Subscribes to `notifications` table filtered by `user_id = userId`. New notification INSERTs invalidate notification query caches. Browser Notification API fires if permission is granted and preference is enabled. Subscription cleans up on unmount. Gracefully handles denied Notification API permission.
**Expert Domains:** supabase, state-management

### Task 2.3: Create use-typing-indicator hook

Create a hook that uses Supabase Broadcast (ephemeral, not persisted) to send and receive typing events within a thread. The hook should expose `startTyping()` and `isTyping` (boolean indicating the other party is typing). Typing events include `userId` and `threadId`. The "is typing" state should auto-clear after 3 seconds of no typing events (debounce). Use `createBroadcastChannel` from the realtime utility.
**Files:** `src/features/messaging/hooks/use-typing-indicator.ts`
**AC:** Hook accepts `threadId` and `currentUserId`. Exposes `startTyping()` function and `isOtherTyping` boolean. Calling `startTyping()` broadcasts a typing event. Receiving a typing event from a different user sets `isOtherTyping` to true. `isOtherTyping` resets to false after 3 seconds of no events. Channel cleans up on unmount.
**Expert Domains:** supabase, state-management

### Task 2.4: Create use-online-status hook

Create a hook that sends a heartbeat to `PATCH /api/members/heartbeat` every 60 seconds to keep the current user's `last_seen_at` fresh. Also export a pure utility function `isOnline(lastSeenAt: string | null): boolean` that returns true if `last_seen_at` is within the last 5 minutes. This function will be used by UI components to show the green dot.
**Files:** `src/features/messaging/hooks/use-online-status.ts`
**AC:** Hook accepts `enabled` boolean. When enabled, calls the heartbeat API every 60 seconds using `setInterval`. Cleans up interval on unmount. `isOnline` utility function returns true if the given timestamp is within 5 minutes of now, false otherwise (including null). `pnpm typecheck` passes.
**Expert Domains:** supabase, state-management

### Task 2.5: Create use-realtime-unread-count hook

Create a hook that subscribes to Postgres Changes on `message_thread_participants` filtered by `member_id` for the current user. When an UPDATE event changes `unread_count`, invalidate the `['messages', 'unread-count']` and `['messages', 'threads']` query keys. This replaces the 60-second polling in `use-unread-count.ts` for real-time nav badge updates.
**Files:** `src/features/messaging/hooks/use-realtime-unread-count.ts`
**AC:** Hook accepts `userId` and `enabled`. Subscribes to `message_thread_participants` filtered by `member_id = userId`. On UPDATE events, invalidates unread count and thread list query caches. Subscription cleans up on unmount.
**Expert Domains:** supabase, state-management

## Phase 3: Messaging UI Integration

**Goal:** Wire realtime hooks into existing messaging components — messages appear instantly, typing indicators show, read receipts display, online status dots appear, and polling artifacts are removed
**Verify:** `pnpm build && pnpm typecheck`

### Task 3.1: Integrate realtime messages into thread detail page

Wire `useRealtimeMessages` into `ThreadDetailPage`. Pass the current `threadId` and `user.id`. This makes incoming messages appear instantly. Also auto-scroll to bottom when a new realtime message arrives (check if user is already near the bottom before scrolling, to avoid disrupting scroll-back reading).
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
**AC:** New messages from the other participant appear in the thread without page refresh. Auto-scrolls to new message only when the user is within 100px of the bottom. Existing optimistic send behavior still works correctly. No duplicate messages appear.
**Expert Domains:** nextjs, state-management

### Task 3.2: Add typing indicator to compose bar and thread view

Wire `useTypingIndicator` into `ComposeBar` — call `startTyping()` on each keystroke in the textarea (debounced). Display a typing indicator below the message list when `isOtherTyping` is true. The indicator should show "{Name} is typing..." with a subtle animated dots animation. Add the visual indicator as a new element in the thread detail page, positioned between the message area and compose bar.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/features/messaging/components/typing-indicator/index.tsx`, `src/features/messaging/components/typing-indicator/typing-indicator.module.scss`, `src/features/messaging/components/compose-bar/index.tsx`
**AC:** Typing in the compose bar broadcasts typing events to the other participant. When the other participant is typing, a "{Name} is typing..." indicator appears with animated dots. Indicator disappears 3 seconds after the last typing event. The indicator has `aria-live="polite"` and `role="status"` for accessibility.
**Expert Domains:** nextjs, scss

### Task 3.3: Add read receipt indicator to message bubbles

Update the `MessageThread` component to show a "Read" indicator below the last sent message when the recipient has read it. Use the `last_read_at` field from `message_thread_participants` (already in the schema). The indicator should only show on the sender's last message in the thread, comparing `last_read_at` of the other participant against the message's `created_at`. Pass `otherParticipantLastReadAt` as a new prop to `MessageThread`.
**Files:** `src/features/messaging/components/message-thread/index.tsx`, `src/features/messaging/components/message-thread/message-thread.module.scss`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`
**AC:** Below the last sent message bubble, a small "Read" label appears if the other participant's `last_read_at` is after the message's `created_at`. Read indicator does not appear on received messages. Read indicator uses muted styling consistent with the timestamp. `pnpm build` passes.
**Reuses:** `src/features/messaging/components/message-thread/`
**Expert Domains:** nextjs, scss

### Task 3.4: Add online status dot to Avatar component

Extend the `Avatar` component to accept an optional `isOnline` boolean prop. When true, render a small green dot positioned at the bottom-right corner of the avatar. The dot should have a `border` matching the background for visual separation. Add the `isOnline` prop to `ThreadRow` avatars (requires passing the other participant's `last_seen_at` through) and to the thread detail page header.
**Files:** `src/components/controls/avatar/index.tsx`, `src/components/controls/avatar/avatar.module.scss`, `src/features/messaging/components/thread-list/thread-row.tsx`, `src/features/messaging/components/collapsible-header/index.tsx`
**AC:** Avatar renders a green dot when `isOnline` is true. Dot is positioned at bottom-right with a 2px white border. Thread list rows show online status for the other participant. Collapsible header shows online status for the other participant. Green dot has `aria-label="Online"` for accessibility.
**Reuses:** `src/components/controls/avatar/`
**Expert Domains:** scss, nextjs

### Task 3.5: Remove polling from messaging unread count hook

Update `use-unread-count.ts` to remove the `refetchInterval: 60_000` since real-time updates now handle this via `use-realtime-unread-count.ts`. Keep the hook's initial fetch behavior. The realtime subscription in the navbar will trigger invalidation instead of periodic polling.
**Files:** `src/features/messaging/hooks/use-unread-count.ts`
**AC:** `refetchInterval` is removed from `use-unread-count.ts`. The hook still fetches on mount. `pnpm build` passes.
**Expert Domains:** state-management

### Task 3.6: Wire realtime unread count and online status heartbeat into navbar

Integrate `useRealtimeUnreadCount` and `useOnlineStatus` (heartbeat) into the navbar component. The realtime unread count subscription should activate when the user is authenticated. The heartbeat should also activate when authenticated. This replaces the polling-based unread count with instant updates.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** Navbar activates realtime unread count subscription for authenticated users. Navbar activates heartbeat for authenticated users. Message badge updates instantly when new messages arrive (no 60-second delay). `pnpm build` passes.
**Reuses:** `src/components/navigation/navbar/`
**Expert Domains:** nextjs, state-management

## Phase 4: Notification Realtime & General DMs

**Goal:** Notifications arrive in real-time with optional browser push, and general DMs work between users with transaction history
**Verify:** `pnpm build && pnpm typecheck`

### Task 4.1: Wire realtime notifications into notification bell

Integrate `useRealtimeNotifications` into the `NotificationBell` component. When the hook fires, the unread badge count updates instantly and any open notification panel refreshes. Remove the 30-second polling from `use-unread-notification-count.ts` since realtime handles it now.
**Files:** `src/features/notifications/components/notification-bell/index.tsx`, `src/features/notifications/hooks/use-unread-notification-count.ts`
**AC:** New notifications update the bell badge count instantly without page refresh. The 30-second `refetchInterval` is removed from `use-unread-notification-count.ts`. If the notification panel is open, new notifications appear in the list. `pnpm build` passes.
**Reuses:** `src/features/notifications/components/notification-bell/`
**Expert Domains:** nextjs, state-management

### Task 4.2: Create transaction history check service function

Create a server-side service function that checks whether two users have a completed transaction between them (either as buyer and seller). This is needed to gate general DMs — only users with prior transaction history can start direct message threads without a listing context. For now, since the orders system is not yet built, implement this as a stub that checks if both users have `total_transactions > 0` as a temporary heuristic, with a TODO comment to replace with actual order table lookup once orders are implemented.
**Files:** `src/features/messaging/services/messaging-server.ts`
**AC:** New `hasTransactionHistoryServer(userIdA, userIdB)` function is exported. Returns `Promise<boolean>`. Currently uses a stub heuristic (both users have `total_transactions > 0`). Has a TODO comment for future order table integration. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 4.3: Add transaction history gate to thread creation API

Update the `POST /api/messaging/threads` route to enforce the transaction history gate for `direct` type threads that have no `listingId`. When `type === 'direct'` and `listingId` is not provided, call `hasTransactionHistoryServer` and return 403 if no history exists. Existing thread creation for inquiry/offer/direct-with-listing types remains unchanged.
**Files:** `src/app/api/messaging/threads/route.ts`
**AC:** Creating a `direct` thread without `listingId` returns 403 with a descriptive error message when the users have no transaction history. Creating a `direct` thread with `listingId` bypasses the check (existing behavior). Creating inquiry/offer threads bypasses the check. `pnpm build` passes.
**Expert Domains:** nextjs, supabase

### Task 4.4: Update MessageButton to handle transaction history gate

Update the `MessageButton` component to handle the 403 response from the thread creation API. When the server returns 403 (no transaction history), show a descriptive toast explaining that direct messages require prior transaction history. The button should still work for users with transaction history.
**Files:** `src/features/messaging/components/message-button/index.tsx`
**AC:** When thread creation returns 403, a toast appears with a message like "Direct messaging requires a prior transaction with this user." The button does not crash or show a generic error. Successful thread creation still navigates to the thread.
**Reuses:** `src/features/messaging/components/message-button/`
**Expert Domains:** nextjs

### Task 4.5: Add browser Notification API integration utility

Create a utility module that requests browser notification permission and dispatches browser notifications. The utility should check if the Notification API is available, request permission if not yet decided, and dispatch notifications with title and body. It should read the user's `notification_preferences.browser.push_notifications` preference before sending. Export `requestNotificationPermission()` and `showBrowserNotification(title, body, options?)` functions.
**Files:** `src/features/notifications/utils/browser-notifications.ts`
**AC:** `requestNotificationPermission()` returns the permission state. `showBrowserNotification()` creates a browser notification if permission is granted. Fails gracefully if Notification API is unavailable (e.g., SSR, denied permission). Does not throw. `pnpm typecheck` passes.
**Expert Domains:** nextjs

## Phase 5: Polish & Edge Cases

**Goal:** Handle connection drops, ensure subscriptions clean up properly, handle edge cases, and update documentation
**Verify:** `pnpm build && pnpm typecheck`

### Task 5.1: Add connection status indicator

Create a small, dismissable banner that appears when the Realtime WebSocket connection drops. The banner should show "Connection lost. Reconnecting..." with a subtle warning style. When the connection recovers, briefly show "Connected" then auto-dismiss. Track connection state in the realtime utility via the channel's `onClose` and subscription status callbacks.
**Files:** `src/libs/supabase/realtime.ts`, `src/features/messaging/components/connection-status/index.tsx`, `src/features/messaging/components/connection-status/connection-status.module.scss`
**AC:** When the WebSocket disconnects, a banner appears at the top of the thread view. When reconnected, the banner briefly shows "Connected" then disappears after 2 seconds. The banner has `role="status"` and `aria-live="polite"`. Does not appear during normal page load (only on connection drop after initial connect).
**Expert Domains:** supabase, scss

### Task 5.2: Add auto-scroll behavior for new realtime messages

Refine the auto-scroll logic in `ThreadDetailPage` to handle edge cases: (1) If the user has scrolled up to read history, do not auto-scroll — instead show a "New message" pill at the bottom that scrolls to latest on click. (2) If the user is at or near the bottom, auto-scroll smoothly. (3) Track the "near bottom" threshold as 150px from the bottom of the scroll container.
**Files:** `src/app/(frontend)/messages/[thread_id]/thread-detail-page.tsx`, `src/app/(frontend)/messages/[thread_id]/thread-detail-page.module.scss`
**AC:** When scrolled up and a new message arrives, a "New message" pill appears anchored to the bottom of the message area. Clicking the pill smooth-scrolls to the latest message and dismisses itself. When near the bottom (within 150px), new messages auto-scroll. Pill has appropriate `aria-label`.
**Expert Domains:** nextjs, scss

### Task 5.3: Update markThreadRead to set last_read_at

Update the `markThreadReadServer` function to also set `last_read_at` to `now()` when marking a thread as read (in addition to resetting `unread_count` to 0). The `last_read_at` column already exists on `message_thread_participants`. This enables the read receipt feature to know when the recipient last viewed the thread.
**Files:** `src/features/messaging/services/messaging-server.ts`
**AC:** `markThreadReadServer` sets both `unread_count = 0` and `last_read_at = now()` in a single update. Existing callers continue to work. `pnpm typecheck` passes.
**Expert Domains:** supabase

### Task 5.4: Update messaging and notifications CLAUDE.md documentation

Update both feature CLAUDE.md files to document the new realtime hooks, the removed polling, the typing indicator, read receipts, online status, browser notifications, and the DM transaction gate. Add the new hooks to the hooks table, new components to the components section, and new utility files to the utils section. Update the directory structure.
**Files:** `src/features/messaging/CLAUDE.md`, `src/features/notifications/CLAUDE.md`
**AC:** Both CLAUDE.md files accurately reflect the new hooks, components, utils, and behavioral changes. Removed polling is noted. New realtime subscription patterns are documented. Directory structures are updated.
