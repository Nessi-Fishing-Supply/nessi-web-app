# Implementation Plan: #51 — In-app notification center

## Overview

4 phases, 18 total tasks
Estimated scope: large

## Phase 1: Foundation — Types, Services, and API Routes

**Goal:** Create the notifications feature domain with types, server/client services, and API routes so that notifications can be created, listed, and managed via HTTP
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create notification types

Define the TypeScript types for the notifications table and related domain concepts. Since the database table will be provisioned separately, define manual types that mirror the expected schema. Include `Notification` (row type), `NotificationInsert` (insert type), `NotificationType` (union of all notification type strings from the ticket), and `NotificationWithMeta` (enriched type with computed fields like relative timestamp). Follow the messaging feature pattern where types derive from `Database['public']['Tables']` but for now define standalone interfaces until `pnpm db:types` regenerates.

**Files:** `src/features/notifications/types/notification.ts`
**AC:** All notification types from the ticket are represented (`new_message`, `offer_received`, `offer_accepted`, `offer_declined`, `offer_expired`, `item_sold`, `order_shipped`, `order_delivered`, `review_received`, `price_drop`, `listing_watched`); types export cleanly; `pnpm typecheck` passes
**Expert Domains:** supabase

### Task 1.2: Create server-side notification services

Create the server service file following the `messaging-server.ts` pattern. Uses `createClient` from `@/libs/supabase/server`. Implement: `createNotificationServer(userId, type, { title, body, data, link })` for inserting a notification row, `getNotificationsServer(userId, limit, offset)` for paginated retrieval (newest first), `markAsReadServer(notificationId, userId)` for marking a single notification read (scoped to owner), `markAllAsReadServer(userId)` for marking all as read, and `getUnreadCountServer(userId)` for counting unread notifications. The `createNotificationServer` function should also enforce the 100-notification cap per user by deleting excess rows after insert (similar to the `recently_viewed` cap pattern but at the application layer since the DB trigger may not exist yet).

**Files:** `src/features/notifications/services/notifications-server.ts`
**AC:** All five server functions are implemented; each uses the Supabase server client with cookie-based auth; the 100-row cap logic deletes oldest rows when exceeded; functions throw descriptive errors on failure
**Expert Domains:** supabase

### Task 1.3: Create client-side notification services

Create thin `fetch` wrappers following the `messaging.ts` pattern. Use `get`, `patch` from `@/libs/fetch`. Implement: `getNotifications(limit?, offset?)` calling `GET /api/notifications`, `markAsRead(notificationId)` calling `PATCH /api/notifications/{id}/read`, `markAllAsRead()` calling `PATCH /api/notifications/read-all`, and `getUnreadCount()` calling `GET /api/notifications/unread-count`.

**Files:** `src/features/notifications/services/notifications.ts`
**AC:** All four client functions are implemented; return types match the server function outputs; uses `@/libs/fetch` helpers consistently
**Expert Domains:** nextjs

### Task 1.4: Create notification API routes

Create four API route files following the messaging API pattern. Each handler must have a description comment above the export, use `createClient` from `@/libs/supabase/server` for auth, return `AUTH_CACHE_HEADERS`, and follow the same error handling pattern (401 for unauth, structured error JSON, try/catch with console.error).

Routes:

- `GET /api/notifications` — list notifications with optional `limit` (default 20, max 100) and `offset` (default 0) query params
- `GET /api/notifications/unread-count` — return `{ count: number }`
- `PATCH /api/notifications/[id]/read` — mark single notification as read (verify ownership)
- `PATCH /api/notifications/read-all` — mark all notifications as read for the authenticated user

**Files:** `src/app/api/notifications/route.ts`, `src/app/api/notifications/unread-count/route.ts`, `src/app/api/notifications/[id]/read/route.ts`, `src/app/api/notifications/read-all/route.ts`
**AC:** All four routes return correct status codes (200/401/404/500); ownership checks prevent cross-user access on single-read; description comments present on all handlers; `pnpm build` passes
**Expert Domains:** nextjs, supabase

### Task 1.5: Create barrel export and feature CLAUDE.md

Create the barrel export file following the messaging `index.ts` pattern — export all types and client services (not server services). Create a `CLAUDE.md` documenting the feature architecture, types, services, hooks, and directory structure following the messaging CLAUDE.md as a template.

**Files:** `src/features/notifications/index.ts`, `src/features/notifications/CLAUDE.md`
**AC:** Barrel exports all public types and client service functions; CLAUDE.md covers the full feature surface area; `pnpm build` passes

## Phase 2: Tanstack Query Hooks

**Goal:** Create the Tanstack Query hooks that power the UI layer with data fetching, polling, and mutations
**Verify:** `pnpm build && pnpm typecheck`

### Task 2.1: Create useNotifications query hook

Create a paginated query hook following the `useThreads` pattern. Query key: `['notifications']`. Calls `getNotifications(limit, offset)`. Accept optional `limit` parameter (default 20). Do not use infinite query for MVP — simple query with manual "load more" offset tracking is sufficient.

**Files:** `src/features/notifications/hooks/use-notifications.ts`
**AC:** Hook returns `{ data, isLoading, isError, refetch }`; query key is `['notifications']`; disabled when `enabled` is false; `pnpm typecheck` passes
**Expert Domains:** state-management

### Task 2.2: Create useUnreadNotificationCount query hook

Create a polling query hook following the `useUnreadCount` pattern from messaging. Query key: `['notifications', 'unread-count']`. Calls `getUnreadCount()`. Set `refetchInterval: 30_000` (30 seconds as specified in the ticket). Accept an `enabled` parameter (default true) so it can be disabled for unauthenticated users.

**Files:** `src/features/notifications/hooks/use-unread-notification-count.ts`
**AC:** Hook polls every 30 seconds; disabled when `enabled` is false; returns `{ data: { count: number } }`; query key is `['notifications', 'unread-count']`
**Expert Domains:** state-management

### Task 2.3: Create useMarkNotificationRead mutation hook

Create a mutation hook following the `useMarkRead` pattern from messaging. Calls `markAsRead(notificationId)`. On success, invalidate `['notifications']` and `['notifications', 'unread-count']`. Implement optimistic update: set `is_read` to true on the notification in the cache immediately, and decrement the unread count by 1.

**Files:** `src/features/notifications/hooks/use-mark-notification-read.ts`
**AC:** Mutation optimistically updates the notification's `is_read` in cache; invalidates both query keys on settle; reverts on error
**Expert Domains:** state-management

### Task 2.4: Create useMarkAllNotificationsRead mutation hook

Create a mutation hook for the "mark all as read" action. Calls `markAllAsRead()`. On success, invalidate `['notifications']` and `['notifications', 'unread-count']`. Implement optimistic update: set all cached notifications' `is_read` to true and set unread count to 0.

**Files:** `src/features/notifications/hooks/use-mark-all-notifications-read.ts`
**AC:** Mutation optimistically marks all notifications as read in cache and sets count to 0; invalidates both query keys on settle; reverts on error
**Expert Domains:** state-management

### Task 2.5: Export hooks from barrel

Add all four hooks to the barrel export at `src/features/notifications/index.ts`.

**Files:** `src/features/notifications/index.ts`
**AC:** All hooks are exported from the barrel; `pnpm build` passes

## Phase 3: UI Components — Bell Icon, Dropdown, and Notification Feed

**Goal:** Build the notification center UI: bell icon with unread badge in the navbar, dropdown panel with notification list, and notification item rendering
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 3.1: Create notification icon mapping utility

Create a utility that maps each `NotificationType` to its corresponding icon and color class. Follow the pattern established in the existing `NotificationRow` component at `src/components/indicators/notification-row/` which already maps `sale`, `offer`, `message`, `price-drop`, and `review` types to icons. Extend the mapping to cover all 11 notification types from the ticket. Use `react-icons/hi` icons consistently with the rest of the codebase.

**Files:** `src/features/notifications/utils/notification-config.ts`
**AC:** Every `NotificationType` has an icon component and color class mapping; no missing types; exports a `getNotificationConfig(type)` function
**Expert Domains:** scss

### Task 3.2: Create NotificationItem component

Create a notification list item component that renders a single notification. This is a feature-scoped component (not shared) since it is tightly coupled to the notification domain. It should render: type-specific icon in a colored circle (from Task 3.1 config), title (bold if unread), body preview (single line, truncated), relative timestamp using the `formatTimestamp` function from the existing `NotificationRow` component (extract or duplicate the utility), and an unread dot indicator. The entire row is clickable — clicking navigates to the notification's `link` and marks it as read. Use `useMarkNotificationRead` internally. Follow mobile-first SCSS patterns and ensure 44x44px minimum tap targets.

**Reuses:** `src/components/indicators/notification-row/` (reference for layout pattern and timestamp formatting)
**Files:** `src/features/notifications/components/notification-item/index.tsx`, `src/features/notifications/components/notification-item/notification-item.module.scss`
**AC:** Renders all notification fields; clicking navigates to `link` via `useRouter` and calls `markAsRead`; unread notifications have visual distinction (background + dot); `aria-label` includes notification type, title, and read state; minimum 44px tap target
**Expert Domains:** scss, nextjs

### Task 3.3: Create NotificationPanel component

Create the notification dropdown panel that displays the list of notifications. On desktop, this renders as a positioned dropdown below the bell icon (similar to the existing `Dropdown` component pattern but with a scrollable list). On mobile, this renders as a full-page overlay (similar to `SearchOverlay`). Include: a header with "Notifications" title and "Mark all as read" link (uses `useMarkAllNotificationsRead`), a scrollable list of `NotificationItem` components, an empty state ("You're all caught up!" with a checkmark icon), and a loading skeleton state. Use `useNotifications` for data. The panel must be lazy loaded (dynamic import) to avoid adding weight to the navbar bundle.

**Files:** `src/features/notifications/components/notification-panel/index.tsx`, `src/features/notifications/components/notification-panel/notification-panel.module.scss`
**AC:** Desktop renders as positioned dropdown (max-height with scroll); mobile renders as full-page overlay; "Mark all as read" button calls the mutation and is disabled when no unread notifications exist; empty state displays when notifications array is empty; loading state shows skeleton placeholders; panel has `role="dialog"` with `aria-label`; focus trap on mobile; close on Escape key
**Expert Domains:** scss, state-management

### Task 3.4: Create NotificationBell component

Create the bell icon button component that sits in the navbar. Renders a bell icon (`HiOutlineBell` from `react-icons/hi`) with an unread count badge (red circle, max "9+"). Uses `useUnreadNotificationCount` for the badge number. Clicking toggles the `NotificationPanel` visibility. The panel is loaded via `React.lazy` / `next/dynamic` to keep the navbar bundle lean. Follow the exact badge styling pattern from the existing `.unreadBadge` class in `navbar.module.scss` (already used for the messages icon). Scoped styles go in the component's own module.

**Files:** `src/features/notifications/components/notification-bell/index.tsx`, `src/features/notifications/components/notification-bell/notification-bell.module.scss`
**AC:** Bell icon renders with `aria-label` that includes unread count (e.g., "Notifications, 3 unread"); badge shows unread count, capped at "9+" for 10 or more; badge hidden when count is 0; clicking toggles the notification panel; panel is lazy loaded via `next/dynamic`; `aria-expanded` reflects panel state; click outside closes panel
**Expert Domains:** nextjs, scss

### Task 3.5: Integrate NotificationBell into Navbar

Add the `NotificationBell` component to the existing navbar, positioned between the messages icon and the user avatar/dropdown (matching the ticket's specification). Only render for authenticated users (same guard as the messages icon). Import `NotificationBell` directly from its component path. The bell icon should use the same icon size class (`.icon`) as the messages icon for visual consistency.

**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** Bell icon visible in navbar for authenticated users only; positioned between messages icon and user menu; hidden for unauthenticated users; no visual regression to existing navbar elements; `pnpm build` passes
**Expert Domains:** nextjs

## Phase 4: Messaging Integration and Polish

**Goal:** Wire up `new_message` notification creation in the messaging API route and handle edge cases
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 4.1: Create the notification dispatcher utility

Create a utility function `dispatchNotification` that wraps `createNotificationServer` with fire-and-forget semantics (matching the email notification pattern in the messages route). This utility dynamically imports the server service to avoid loading notification modules on every request. It should accept `userId`, `type`, `title`, `body`, `data` (JSONB), and `link`, and silently catch all errors (notifications must never break the parent operation). This is the function other API routes will call to create notifications as a side effect.

**Files:** `src/features/notifications/utils/dispatch-notification.ts`
**AC:** Function dynamically imports `createNotificationServer`; wraps in try/catch that logs errors but never throws; accepts all notification fields; can be called with `void dispatchNotification(...)` pattern
**Expert Domains:** supabase, nextjs

### Task 4.2: Integrate new_message notification into messaging API route

Update the existing `POST /api/messaging/threads/[thread_id]/messages/route.ts` to dispatch a `new_message` notification to each recipient (other participants) when a message is sent. Add this in the existing fire-and-forget block alongside the email notification logic. The notification's `link` should point to `/messages/{thread_id}`. The `title` should be the sender's name, and the `body` should be a truncated message preview (first 100 characters). Use the `dispatchNotification` utility from Task 4.1. Only dispatch for `text` type messages (not system, nudge, or node messages).

**Files:** `src/app/api/messaging/threads/[thread_id]/messages/route.ts`
**AC:** `new_message` notification is created for each non-sender participant; only fires for `text` type messages; notification includes sender name as title, truncated preview as body, and `/messages/{thread_id}` as link; fire-and-forget — never blocks the message response; no regression to existing email notification logic
**Expert Domains:** supabase, nextjs

### Task 4.3: Add notification link to the navbar account dropdown

Add a "Notifications" link to the account dropdown menu in the navbar, positioned after "Messages" and before "Watchlist". Use `HiOutlineBell` icon to match the bell icon in the navbar. Link to `/dashboard/notifications` (the eventual full-page notifications view — for now this route does not need to exist; the link prepares for future expansion).

**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** "Notifications" dropdown item appears for authenticated users between Messages and Watchlist; uses bell icon; links to `/dashboard/notifications`; `pnpm build` passes

### Task 4.4: Update CLAUDE.md and finalize exports

Update the notifications feature `CLAUDE.md` with the final directory structure, all components, hooks, utils, and integration points. Ensure all public types, services, hooks, and utils are properly exported from the barrel. Add the notifications feature to the root `CLAUDE.md` key directories table.

**Files:** `src/features/notifications/CLAUDE.md`, `src/features/notifications/index.ts`, `CLAUDE.md`
**AC:** CLAUDE.md reflects the complete feature surface; barrel exports are complete; root CLAUDE.md lists the notifications feature in the Key Directories section; `pnpm build` passes
