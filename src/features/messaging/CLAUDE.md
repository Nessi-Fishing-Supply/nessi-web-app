# Messaging Feature

Real-time messaging between buyers and sellers. Supports inquiry threads on listings, direct member-to-member messages, offer negotiations, and custom gear requests. Messages pass through a safety filter before delivery.

## Overview

A buyer initiates a thread (typically on a listing) and exchanges messages with the seller. Threads are typed (`inquiry`, `direct`, `offer`, `custom_request`) and each has a status (`active`, `archived`, `closed`). Each thread has two or more participants with roles (`buyer`/`seller` or `initiator`/`recipient`). Messages within a thread can be plain text, system events, or structured nodes (offer, custom request, listing preview, nudge).

The safety filter (`utils/safety-filter.ts`) intercepts outgoing message content before persistence, blocking explicit language, redacting PII, and nudging users who attempt off-platform dealing or price negotiation outside the offer flow.

## Database Schema

### `message_threads` table

| Column                 | Type        | Constraints                                         |
| ---------------------- | ----------- | --------------------------------------------------- |
| `id`                   | UUID        | PK, `gen_random_uuid()`                             |
| `thread_type`          | ENUM        | NOT NULL — `thread_type` enum                       |
| `status`               | ENUM        | NOT NULL, DEFAULT `'active'` — `thread_status` enum |
| `listing_id`           | UUID        | NULL, FK `listings(id) ON DELETE SET NULL`          |
| `last_message_at`      | TIMESTAMPTZ | NULL — updated on each new message                  |
| `last_message_preview` | TEXT        | NULL — truncated preview of the last message        |
| `created_at`           | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                           |
| `updated_at`           | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                           |

### `message_thread_participants` table

| Column         | Type        | Constraints                                          |
| -------------- | ----------- | ---------------------------------------------------- |
| `id`           | UUID        | PK, `gen_random_uuid()`                              |
| `thread_id`    | UUID        | NOT NULL, FK `message_threads(id) ON DELETE CASCADE` |
| `user_id`      | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`         |
| `role`         | ENUM        | NOT NULL — `participant_role` enum                   |
| `unread_count` | INTEGER     | NOT NULL, DEFAULT `0`                                |
| `joined_at`    | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                            |

**Constraints:**

- `UNIQUE (thread_id, user_id)` — one participant row per member per thread

### `messages` table

| Column             | Type        | Constraints                                           |
| ------------------ | ----------- | ----------------------------------------------------- |
| `id`               | UUID        | PK, `gen_random_uuid()`                               |
| `thread_id`        | UUID        | NOT NULL, FK `message_threads(id) ON DELETE CASCADE`  |
| `sender_id`        | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`          |
| `message_type`     | ENUM        | NOT NULL — `message_type` enum                        |
| `content`          | TEXT        | NULL — plain text body                                |
| `metadata`         | JSONB       | NULL — structured payload for node types              |
| `is_filtered`      | BOOLEAN     | NOT NULL, DEFAULT `false` — safety filter applied     |
| `original_content` | TEXT        | NULL — pre-filter content (PII redaction audit trail) |
| `edited_at`        | TIMESTAMPTZ | NULL                                                  |
| `created_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                             |

### Database Enums

| Enum               | Values                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `thread_type`      | `'inquiry'`, `'direct'`, `'offer'`, `'custom_request'`                                     |
| `thread_status`    | `'active'`, `'archived'`, `'closed'`                                                       |
| `participant_role` | `'buyer'`, `'seller'`, `'initiator'`, `'recipient'`                                        |
| `message_type`     | `'text'`, `'system'`, `'offer_node'`, `'custom_request_node'`, `'listing_node'`, `'nudge'` |

### RLS Policies

Participants can only see threads and messages they belong to. Insert is gated to authenticated users who are participants in the target thread.

## Types

**`src/features/messaging/types/thread.ts`**

| Type                     | Description                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `MessageThread`          | Database Row type from `message_threads` table                                                  |
| `MessageThreadInsert`    | Insert type — omits `id`, `created_at`, `updated_at`, `last_message_at`, `last_message_preview` |
| `ThreadType`             | `'inquiry' \| 'direct' \| 'offer' \| 'custom_request'`                                          |
| `ThreadStatus`           | `'active' \| 'archived' \| 'closed'`                                                            |
| `ThreadParticipant`      | Database Row type from `message_thread_participants` table                                      |
| `ParticipantRole`        | `'buyer' \| 'seller' \| 'initiator' \| 'recipient'`                                             |
| `ThreadWithParticipants` | `MessageThread` joined with participants (including member name/avatar) + `my_unread_count`     |

**`src/features/messaging/types/message.ts`**

| Type                | Description                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `Message`           | Database Row type from `messages` table                                                    |
| `MessageInsert`     | Insert type — omits `id`, `created_at`, `edited_at`, `is_filtered`, `original_content`     |
| `MessageType`       | `'text' \| 'system' \| 'offer_node' \| 'custom_request_node' \| 'listing_node' \| 'nudge'` |
| `MessageWithSender` | `Message` joined with sender `{ id, first_name, last_name, avatar_url }`                   |

## Services (Phase 2)

### Server (`src/features/messaging/services/messaging-server.ts`)

Uses `@/libs/supabase/server` (cookie-based auth, user JWT). Called by API route handlers only.

| Function               | Signature                                                             | Description                                              |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| `getThreadsServer`     | `(userId) => Promise<ThreadWithParticipants[]>`                       | List all threads where the user is a participant         |
| `getThreadByIdServer`  | `(userId, threadId) => Promise<ThreadWithParticipants>`               | Fetch a single thread; throws if user is not participant |
| `createThreadServer`   | `(params) => Promise<ThreadWithParticipants>`                         | Create thread + insert participant rows                  |
| `getMessagesServer`    | `(userId, threadId, cursor?, limit?) => Promise<MessageWithSender[]>` | Paginated messages; oldest-first within a page           |
| `createMessageServer`  | `(params) => Promise<Message>`                                        | Insert message; runs safety filter before persistence    |
| `markThreadReadServer` | `(userId, threadId) => Promise<void>`                                 | Reset `unread_count` to 0 for the user's participant row |
| `archiveThreadServer`  | `(userId, threadId) => Promise<void>`                                 | Set `thread_status = 'archived'`                         |
| `getUnreadCountServer` | `(userId) => Promise<number>`                                         | Sum of `unread_count` across all active participant rows |

### Client (`src/features/messaging/services/messaging.ts`)

Thin `fetch` wrappers using `@/libs/fetch` (`get`, `post`, `patch`). Called by Tanstack Query hooks.

| Function         | Signature                                                      | HTTP                                                        | Returns                                                         |
| ---------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `getThreads`     | `(type?: ThreadType) => Promise<ThreadWithParticipants[]>`     | `GET /api/messaging/threads`                                | `ThreadWithParticipants[]`                                      |
| `getThread`      | `(threadId: string) => Promise<ThreadWithParticipants>`        | `GET /api/messaging/threads/{threadId}`                     | `ThreadWithParticipants`                                        |
| `createThread`   | `(data: { type, participantIds, roles, listingId?, shopId? })` | `POST /api/messaging/threads`                               | `ThreadWithParticipants`                                        |
| `getMessages`    | `(threadId: string, cursor?: string)`                          | `GET /api/messaging/threads/{threadId}/messages?cursor=...` | `{ messages: MessageWithSender[]; nextCursor: string \| null }` |
| `sendMessage`    | `(threadId: string, content: string, type?: MessageType)`      | `POST /api/messaging/threads/{threadId}/messages`           | `MessageWithSender`                                             |
| `markThreadRead` | `(threadId: string) => Promise<void>`                          | `PATCH /api/messaging/threads/{threadId}/read`              | `void`                                                          |
| `archiveThread`  | `(threadId: string) => Promise<void>`                          | `PATCH /api/messaging/threads/{threadId}/archive`           | `void`                                                          |
| `getUnreadCount` | `() => Promise<{ count: number }>`                             | `GET /api/messaging/unread-count`                           | `{ count: number }`                                             |

## Hooks (Phase 2)

Tanstack Query hooks will live in `src/features/messaging/hooks/`. Expected hooks:

- `useThreads()` — query key `['messaging', 'threads']`
- `useThread(threadId)` — query key `['messaging', 'threads', threadId]`
- `useMessages(threadId)` — infinite query for paginated messages; key `['messaging', 'messages', threadId]`
- `useSendMessage({ threadId })` — mutation; optimistic insert before server confirm
- `useMarkThreadRead(threadId)` — mutation; updates unread badge immediately
- `useUnreadCount()` — query key `['messaging', 'unread']`; drives the inbox badge in navigation

## Components

### MessageThread (scaffold)

**File:** `src/features/messaging/components/message-thread/index.tsx`

Chat thread UI — renders the message list, input field, and participant header for a single thread. Full implementation in Phase 3.

### OfferBubble (scaffold)

**File:** `src/features/messaging/components/offer-bubble/index.tsx`

Inline offer display rendered inside the message thread when `message_type = 'offer_node'`. Displays offer amount, status, and accept/decline actions. Full implementation in Phase 3.

## Utils

### safety-filter.ts

**File:** `src/features/messaging/utils/safety-filter.ts`

Pure function that inspects outgoing message content before it is persisted. Processing order: **block → redact → nudge → pass**.

| Stage  | Trigger                                           | Action                                                                                                   |
| ------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Block  | Explicit/profane language patterns                | Returns `{ action: 'block' }` — message is rejected entirely                                             |
| Redact | PII patterns (phone, email, credit card via Luhn) | Returns `{ action: 'redact', filtered: '...' }` — PII replaced with `[removed]`                          |
| Nudge  | Off-platform dealing attempts, price negotiation  | Returns `{ action: 'nudge', nudgeType: '...' }` — message passes but triggers an in-thread nudge message |
| Pass   | No patterns matched                               | Returns `{ action: 'pass' }` — message is stored as-is                                                   |

Credit card detection uses Luhn validation to avoid false positives on numeric strings. Regex patterns are compiled at module level (not inside the function) for performance.

**Usage:**

```ts
import { filterMessage } from '@/features/messaging/utils/safety-filter';

const result = filterMessage(content);
if (result.action === 'block') {
  return new Response('Message blocked', { status: 422 });
}
```

## Public API

Consuming features import from the barrel export at `src/features/messaging/index.ts`:

```ts
import type {
  MessageThread,
  MessageThreadInsert,
  ThreadType,
  ThreadStatus,
  ThreadParticipant,
  ParticipantRole,
  ThreadWithParticipants,
  Message,
  MessageInsert,
  MessageType,
  MessageWithSender,
} from '@/features/messaging';

import {
  getThreads,
  getThread,
  createThread,
  getMessages,
  sendMessage,
  markThreadRead,
  archiveThread,
  getUnreadCount,
} from '@/features/messaging';
```

Server services (`messaging-server.ts`) are **not** exported from the barrel — they are server-only and imported directly by API route handlers only:

```ts
import {
  getThreadsServer,
  getThreadByIdServer,
  // ...
} from '@/features/messaging/services/messaging-server';
```

Components are imported directly from their component paths (not exported from the barrel):

```ts
import MessageThread from '@/features/messaging/components/message-thread';
import OfferBubble from '@/features/messaging/components/offer-bubble';
```

## Directory Structure

```
src/features/messaging/
├── CLAUDE.md
├── index.ts                                       # Barrel export (types + client services)
├── types/
│   ├── thread.ts                                  # MessageThread, ThreadType, ThreadStatus, ThreadParticipant, ParticipantRole, ThreadWithParticipants
│   └── message.ts                                 # Message, MessageInsert, MessageType, MessageWithSender
├── services/                                      # Phase 2
│   ├── messaging-server.ts                        # Server-side Supabase queries (cookie auth)
│   └── messaging.ts                               # Client-side fetch wrappers
├── hooks/                                         # Phase 2
│   ├── use-threads.ts                             # Query: thread list — key: ['messaging', 'threads']
│   ├── use-thread.ts                              # Query: single thread — key: ['messaging', 'threads', threadId]
│   ├── use-messages.ts                            # Infinite query: paginated messages
│   ├── use-send-message.ts                        # Mutation: optimistic message send
│   ├── use-mark-thread-read.ts                    # Mutation: reset unread count
│   └── use-unread-count.ts                        # Query: total unread — drives nav badge
├── components/
│   ├── message-thread/                            # Chat thread UI (scaffold)
│   │   ├── index.tsx
│   │   └── message-thread.module.scss
│   └── offer-bubble/                              # Inline offer display (scaffold)
│       ├── index.tsx
│       └── offer-bubble.module.scss
└── utils/
    └── safety-filter.ts                           # Content safety: block / redact PII / nudge / pass

src/app/api/messaging/                             # Phase 2
├── threads/
│   ├── route.ts                                   # GET (list), POST (create)
│   └── [thread_id]/
│       ├── route.ts                               # GET (single thread)
│       ├── messages/
│       │   └── route.ts                           # GET (paginated), POST (send)
│       ├── read/
│       │   └── route.ts                           # PATCH (mark read)
│       └── archive/
│           └── route.ts                           # PATCH (archive)
└── unread-count/
    └── route.ts                                   # GET (total unread)
```

## Key Patterns

- Thread participants are a separate join table (`message_thread_participants`) — RLS is enforced at the participant level, not on the thread itself
- `ThreadWithParticipants` carries a `my_unread_count` field computed at query time (not stored on the thread row) so callers don't need a second lookup
- Safety filter runs **before** persistence — if `action === 'redact'`, the API stores the filtered content in `content` and the original in `original_content`, with `is_filtered = true`; this preserves an audit trail without exposing PII to the recipient
- Paginated messages use a `cursor` (last message `id`) rather than offset pagination to avoid duplicate/skipped rows during real-time updates
- Off-platform nudges and price-negotiation nudges insert a `message_type = 'nudge'` system message into the thread rather than rejecting the original message — the user's message still sends, but they see in-thread guidance

## Related Features

- `src/features/listings/` — `listing_id` FK on threads; `listing_node` message type links to a listing card
- `src/features/email/` — Unread message digest emails (Phase 3)
- `src/features/context/` — Context switching (member vs. shop identity) affects which participant role is assigned on thread creation
