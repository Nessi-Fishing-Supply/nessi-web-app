# Notifications Feature

## Overview

In-app notification center — bell icon in the navbar with unread count badge, activity feed of recent events, mark-as-read functionality. Notifications are created server-side by other features (messaging, offers, orders, watchlist) as fire-and-forget side effects.

## Database Schema

### `notifications` table

| Column     | Type        | Default           | Notes                              |
| ---------- | ----------- | ----------------- | ---------------------------------- |
| id         | UUID        | gen_random_uuid() | PK                                 |
| user_id    | UUID        |                   | FK → auth.users, ON DELETE CASCADE |
| type       | TEXT        |                   | NOT NULL, one of NotificationType  |
| title      | TEXT        |                   | Nullable                           |
| body       | TEXT        |                   | Nullable                           |
| data       | JSONB       |                   | Nullable, arbitrary metadata       |
| link       | TEXT        |                   | Nullable, navigation target        |
| is_read    | BOOLEAN     | false             |                                    |
| created_at | TIMESTAMPTZ | NOW()             |                                    |

**RLS:** Users can only SELECT/UPDATE their own notifications. INSERT via admin client (cross-user notification creation).

**Index:** `(user_id, is_read, created_at)` for efficient unread count and paginated listing.

**Cap:** 100 notifications per user, enforced in `createNotificationServer` (prunes oldest on insert).

## Notification Types

| Type              | Trigger                         | Link Target              |
| ----------------- | ------------------------------- | ------------------------ |
| `new_message`     | Message sent in thread          | `/messages/{thread_id}`  |
| `offer_received`  | Buyer submits offer             | `/messages/{thread_id}`  |
| `offer_accepted`  | Seller accepts offer            | `/messages/{thread_id}`  |
| `offer_declined`  | Seller declines offer           | `/messages/{thread_id}`  |
| `offer_expired`   | Offer TTL expires               | `/messages/{thread_id}`  |
| `item_sold`       | Listing purchased               | `/dashboard/orders/{id}` |
| `order_shipped`   | Order marked shipped            | `/dashboard/orders/{id}` |
| `order_delivered` | Order marked delivered          | `/dashboard/orders/{id}` |
| `review_received` | Review left on profile          | `/dashboard/reviews`     |
| `price_drop`      | Watched listing price decreased | `/listings/{slug}`       |
| `listing_watched` | Someone watched your listing    | `/dashboard/listings`    |

## Architecture

### Types (`types/notification.ts`)

- `NotificationType` — string union of all 11 notification types
- `Notification` — row type (standalone, not derived from database.ts until migration runs)
- `NotificationInsert` — insert type (omits id, is_read, created_at)
- `NotificationsResponse` — `{ notifications: Notification[], total: number }`

### Server Services (`services/notifications-server.ts`)

- `createNotificationServer(userId, type, payload)` — insert + 100-cap pruning (uses admin client)
- `getNotificationsServer(userId, limit, offset)` — paginated list, newest first
- `markAsReadServer(notificationId, userId)` — single mark-read with ownership check
- `markAllAsReadServer(userId)` — bulk mark-read
- `getUnreadCountServer(userId)` — count of unread notifications

### Client Services (`services/notifications.ts`)

Thin fetch wrappers using `@/libs/fetch` helpers:

- `getNotifications(limit?, offset?)` → `GET /api/notifications`
- `getUnreadCount()` → `GET /api/notifications/unread-count`
- `markAsRead(notificationId)` → `PATCH /api/notifications/{id}/read`
- `markAllAsRead()` → `PATCH /api/notifications/read-all`

### API Routes (`src/app/api/notifications/`)

| Route                             | Method | Purpose                |
| --------------------------------- | ------ | ---------------------- |
| `/api/notifications`              | GET    | List with pagination   |
| `/api/notifications/unread-count` | GET    | Unread count for badge |
| `/api/notifications/[id]/read`    | PATCH  | Mark single as read    |
| `/api/notifications/read-all`     | PATCH  | Mark all as read       |

### Hooks (`hooks/`)

- `useNotifications(limit?)` — paginated query, key: `['notifications']`
- `useUnreadNotificationCount(enabled?)` — query, key: `['notifications', 'unread-count']`; no polling — driven by `useRealtimeNotifications`
- `useRealtimeNotifications(userId)` — Supabase Realtime subscription on the `notifications` table; invalidates `['notifications']` and `['notifications', 'unread-count']` on INSERT/UPDATE for the current user
- `useMarkNotificationRead()` — optimistic mutation
- `useMarkAllNotificationsRead()` — optimistic mutation

### Components (`components/`)

- `notification-bell/` — Bell icon button with unread badge, toggles panel
- `notification-panel/` — Dropdown (desktop) / full-page (mobile) activity feed
- `notification-item/` — Single notification row with icon, text, timestamp, unread dot

### Utils (`utils/`)

- `notification-config.ts` — Maps NotificationType → icon + color
- `dispatch-notification.ts` — Fire-and-forget wrapper for cross-feature use
- `browser-notifications.ts` — Wrapper for the Web Notifications API; requests permission and dispatches native browser push notifications for new in-app events

## Key Patterns

- **Admin client for inserts:** Notifications are created for other users, bypassing RLS
- **Fire-and-forget dispatch:** `void dispatchNotification(...)` pattern — never blocks parent operation
- **Supabase Realtime (replaced polling):** `useRealtimeNotifications` subscribes to the `notifications` table and invalidates query keys on new events. The previous 30-second `refetchInterval` polling on `useUnreadNotificationCount` has been removed.
- **Optimistic UI:** Mark-read mutations update cache immediately, revert on error
- **100-notification cap:** Enforced at application layer in `createNotificationServer`

## Directory Structure

```
src/features/notifications/
├── CLAUDE.md
├── index.ts
├── types/
│   └── notification.ts
├── services/
│   ├── notifications-server.ts
│   └── notifications.ts
├── hooks/
│   ├── use-notifications.ts
│   ├── use-unread-notification-count.ts
│   ├── use-realtime-notifications.ts
│   ├── use-mark-notification-read.ts
│   └── use-mark-all-notifications-read.ts
├── components/
│   ├── notification-bell/
│   ├── notification-panel/
│   └── notification-item/
└── utils/
    ├── notification-config.ts
    ├── dispatch-notification.ts
    └── browser-notifications.ts
```

## Related Features

- **Messaging (#33)** — `new_message` notifications dispatched from message send route
- **Watchlist (#36)** — `price_drop` notifications (future integration)
- **Real-time (#56)** — Supabase Realtime replaced 30s polling; `useRealtimeNotifications` is the live subscription hook
