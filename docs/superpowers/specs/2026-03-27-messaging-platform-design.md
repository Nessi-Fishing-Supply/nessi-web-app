# Messaging Platform — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Issue:** TBD (base messaging ticket to be created)

## Overview

A rich messaging platform for Nessi with four thread types, contextual message nodes, automated text safety filtering, and an offer negotiation system. Messages flow naturally as chat but the system injects structured UI (listing cards, offer cards, custom order requests) based on context.

## Thread Types

| Type             | Initiated from                                          | Pinned context                      | Unique constraint                         | Statuses                                           |
| ---------------- | ------------------------------------------------------- | ----------------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `inquiry`        | "Message Seller" on listing page                        | Listing card                        | One per buyer-seller-listing combo        | active, archived                                   |
| `direct`         | "Message" on member/shop profile                        | Member profile card in header       | One per member pair                       | active, archived                                   |
| `offer`          | "Make an Offer" on listing or nudge from inquiry thread | Listing card + offer status/actions | One active offer per buyer-seller-listing | pending, accepted, declined, countered, expired    |
| `custom_request` | "Request Custom Build" on shop page                     | Custom request details              | One per requester-shop-request            | Schema reserved only — full lifecycle out of scope |

### Thread Behaviors

- `inquiry` and `direct` are long-lived — users return to the same thread over time
- `offer` threads spin up as distinct threads with their own lifecycle
- `custom_request` thread type is defined in the schema but not implemented in this feature
- Thread list is filterable by type via horizontal tabs
- Each type feeds different dashboard metrics and notification channels

## User Experience

### Inbox (Thread List)

- **Layout:** Horizontal tabs at top — All | Inquiries | Offers | Custom Requests | Direct
- **Thread rows:** Avatar, member name, type badge (colored pill), message preview, timestamp
- **Unread indicators:** Blue dot on unread threads, unread count badges on tabs
- **Sort:** By `last_message_at` DESC (most recent activity first)
- **Mobile-first:** Tabs scroll horizontally, full-width thread rows

### Thread Detail View

- **Collapsible header:** Pinned context shows at top, collapses to slim bar on scroll
  - `inquiry`: Listing card (image, title, price, status) — links to listing page
  - `offer`: Listing card + offer amount + status pill + Accept/Counter/Decline action buttons
  - `custom_request`: Shop name + request summary + status pill + action buttons
  - `direct`: Member name + avatar — links to profile
- **Messages:** Standard chat bubble layout (sender right, receiver left)
- **Contextual nodes:** Listing cards, offer cards, system messages rendered inline as special message types
- **Compose bar:** Text input + send button + `+` action menu
  - Action menu contents are context-dependent (thread type + user role)
  - Available actions: "Make an Offer" (inquiry threads, buyer only), "Share a Listing"
  - Smart nudges fire from text content analysis (regex detects price negotiation → suggests "Make an Offer")

### Messaging Permissions

| Thread type      | Who can initiate         | Restrictions                                                       |
| ---------------- | ------------------------ | ------------------------------------------------------------------ |
| `inquiry`        | Any authenticated member | Must be about an active listing. Cannot inquire about own listing. |
| `direct`         | Any authenticated member | Open — any member can DM any other member.                         |
| `offer`          | Any authenticated member | Listing must be active. Cannot offer on own listing.               |
| `custom_request` | Any authenticated member | Target must be a shop (not individual member).                     |

## Data Model

### Tables

```sql
-- Thread container
message_threads
  id              uuid PK DEFAULT gen_random_uuid()
  type            thread_type ENUM (inquiry, direct, offer, custom_request)
  status          thread_status ENUM (active, archived, closed)
  listing_id      uuid FK → listings (nullable, set for inquiry/offer)
  shop_id         uuid FK → shops (nullable, set for custom_request)
  created_by      uuid FK → members NOT NULL
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()
  last_message_at timestamptz (denormalized for sort)
  last_message_preview text (denormalized for thread list)

-- Thread membership and per-user state
message_thread_participants
  id              uuid PK DEFAULT gen_random_uuid()
  thread_id       uuid FK → message_threads ON DELETE CASCADE
  member_id       uuid FK → members ON DELETE CASCADE
  role            participant_role ENUM (buyer, seller, initiator, recipient)
  unread_count    integer DEFAULT 0 (denormalized)
  is_blocked      boolean DEFAULT false (participant-level block)
  joined_at       timestamptz DEFAULT now()
  last_read_at    timestamptz
  UNIQUE(thread_id, member_id)

-- Individual messages
messages
  id              uuid PK DEFAULT gen_random_uuid()
  thread_id       uuid FK → message_threads ON DELETE CASCADE
  sender_id       uuid FK → members ON DELETE CASCADE
  content         text (nullable — null for system/node messages)
  type            message_type ENUM (text, system, offer_node, custom_request_node, listing_node, nudge)
  metadata        jsonb (offer details, listing snapshot, nudge config)
  is_filtered     boolean DEFAULT false (true if content was redacted by safety layer)
  original_content text (nullable — pre-filter content for admin review)
  created_at      timestamptz DEFAULT now()
  edited_at       timestamptz (nullable)

-- Offer lifecycle (dedicated table, referenced by offer_node messages)
offers
  id              uuid PK DEFAULT gen_random_uuid()
  thread_id       uuid FK → message_threads ON DELETE CASCADE
  listing_id      uuid FK → listings ON DELETE CASCADE
  buyer_id        uuid FK → members ON DELETE CASCADE
  seller_id       uuid FK → members ON DELETE CASCADE
  amount_cents    integer NOT NULL
  status          offer_status ENUM (pending, accepted, declined, countered, expired)
  expires_at      timestamptz NOT NULL
  parent_offer_id uuid FK → offers (nullable — set when this is a counter)
  created_at      timestamptz DEFAULT now()
  updated_at      timestamptz DEFAULT now()

-- User-level blocking (separate from messaging)
member_blocks
  id              uuid PK DEFAULT gen_random_uuid()
  blocker_id      uuid FK → members ON DELETE CASCADE
  blocked_id      uuid FK → members ON DELETE CASCADE
  created_at      timestamptz DEFAULT now()
  UNIQUE(blocker_id, blocked_id)
```

### Indexes

- `message_threads`: (type), (listing_id), (shop_id), (last_message_at DESC)
- `message_thread_participants`: (member_id, thread_id), (member_id) for "my threads" queries
- `messages`: (thread_id, created_at), (sender_id)
- `offers`: (listing_id, buyer_id, status), (thread_id), (status, expires_at) for expiry cron
- `member_blocks`: (blocker_id), (blocked_id)

### Unique Constraints (Application Layer)

- `inquiry`: One thread per (buyer, seller, listing) — enforced on thread creation
- `direct`: One thread per member pair — enforced on thread creation (order-independent)
- `offer`: One active (pending) offer per (buyer, seller, listing) — creating new offer expires previous pending one

### RLS Policies

- **message_threads**: Participants can SELECT their own threads (via join to participants table)
- **message_thread_participants**: Members can SELECT/UPDATE their own rows (for last_read_at, unread_count)
- **messages**: Participants can SELECT messages in their threads; authenticated users can INSERT into threads they participate in
- **offers**: Buyer and seller can SELECT; only buyer can INSERT; only seller can UPDATE status (accept/decline/counter)
- **member_blocks**: Users can INSERT/DELETE/SELECT their own blocks

### Denormalized Fields & Triggers

- `message_threads.last_message_at` + `last_message_preview`: Updated by trigger on messages INSERT
- `message_thread_participants.unread_count`: Incremented by trigger on messages INSERT (for all participants except sender), decremented when `last_read_at` is updated
- `offers.status` transitions: Application-layer validation (e.g., can only accept a pending offer)

## Safety & Moderation

### Automated Text Filtering (Server-Side)

Every outbound message passes through a filter before storage:

1. **PII detection** (regex patterns):
   - Phone numbers (various formats)
   - Email addresses
   - Street addresses (number + street name patterns)
   - Credit card numbers (Luhn-validated digit sequences)
   - Social security numbers

2. **Explicit language filter:**
   - Keyword blocklist for slurs and explicit content
   - Configurable severity levels

3. **Off-platform dealing detection:**
   - Patterns like "text me at", "email me", "PayPal me", "Venmo", "CashApp", "meet up"
   - Triggers a `nudge` message: "It looks like you're trying to arrange payment outside Nessi. For your protection, all transactions should go through the platform."

4. **Price negotiation detection:**
   - Patterns like "would you take $X", "I'll give you $X", "lowest you'll go"
   - Triggers a `nudge` message: "Want to make this official? Create an offer so the seller can accept, counter, or decline."

### Filter Behavior

- **PII**: Content is redacted (replaced with `[removed]`). `is_filtered = true`, `original_content` stores pre-filter text for admin review. Message is still delivered with redacted content.
- **Explicit language**: Message is blocked entirely. Sender sees error: "This message contains content that violates our community guidelines."
- **Off-platform / negotiation nudges**: Message is delivered as-is. A `nudge` type system message is inserted after it.

### User-Level Controls

- **Block member**: Prevents blocked member from sending new messages or initiating new threads. Existing threads with blocked member are hidden from thread list.
- **Flag message**: Ties into existing flags system. Flags a specific message for admin review.
- **Flag thread**: Flags entire thread for admin review.

## Offer System

### Offer Lifecycle

```
buyer creates offer → PENDING
  ├── seller accepts → ACCEPTED → buyer has 4 hours to checkout
  │     └── 4 hours pass without checkout → EXPIRED
  ├── seller declines → DECLINED
  ├── seller counters → COUNTERED (creates new offer from seller)
  │     └── buyer accepts counter → ACCEPTED
  │     └── buyer declines counter → DECLINED
  │     └── buyer counters again → COUNTERED (cycle continues)
  └── 24 hours pass → EXPIRED (cron job)
```

### Offer Rules

- Minimum offer: 70% of listing price (enforced client + server)
- One active (pending) offer per buyer-seller-listing: new offer auto-expires previous pending one
- Seller can accept, decline, or counter
- Counter creates a new offer record with `parent_offer_id` pointing to the original
- Accepted offers generate a checkout URL with `?offer_id={id}&amount={amount_cents}`
- 24-hour expiry on pending offers (Vercel Cron, daily on Hobby plan)
- 4-hour checkout window after acceptance

### Offer UI

- **Make an Offer:** Bottom sheet (mobile-first) with price input pre-filled at 80% of listing price, live fee calculation
- **Offer node:** Rendered inline in thread as a card showing amount, status, expiry countdown
- **Collapsible header:** Shows offer status + Accept/Counter/Decline buttons for seller

## Notification Integration

### In-App

- Navbar bell icon shows unread message count (sum of unread_count across all threads)
- New thread activity bumps thread to top of list
- Type-specific notification text: "New offer on your listing" vs "New message from Sarah"

### Email

- New message in thread (debounced — don't email for every message, only if unread for 5+ minutes)
- Offer received / accepted / declined / countered
- Offer about to expire (2 hours before expiry)
- Respects existing `notification_preferences.community_messages` toggle

## API Routes

| Method | Route                                        | Description                                                              |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| GET    | `/api/messages/threads`                      | List user's threads (filterable by type)                                 |
| POST   | `/api/messages/threads`                      | Create new thread (type, participant, listing_id/shop_id)                |
| GET    | `/api/messages/threads/[thread_id]`          | Get thread detail with participants                                      |
| GET    | `/api/messages/threads/[thread_id]/messages` | Get messages in thread (paginated)                                       |
| POST   | `/api/messages/threads/[thread_id]/messages` | Send message (runs through safety filter)                                |
| PATCH  | `/api/messages/threads/[thread_id]/read`     | Mark thread as read (update last_read_at, reset unread_count)            |
| POST   | `/api/messages/threads/[thread_id]/archive`  | Archive thread                                                           |
| POST   | `/api/offers`                                | Create offer (validates min price, one-active rule)                      |
| GET    | `/api/offers/[id]`                           | Get offer details                                                        |
| POST   | `/api/offers/[id]/accept`                    | Seller accepts offer                                                     |
| POST   | `/api/offers/[id]/decline`                   | Seller declines offer                                                    |
| POST   | `/api/offers/[id]/counter`                   | Seller counters offer                                                    |
| POST   | `/api/members/block`                         | Block a member                                                           |
| DELETE | `/api/members/block/[member_id]`             | Unblock a member                                                         |
| GET    | `/api/cron/offers-expiry`                    | Expire pending offers past 24h + accepted offers past 4h checkout window |

## Pages

| Route                   | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `/messages`             | Inbox — thread list with tab filtering                    |
| `/messages/[thread_id]` | Thread detail — messages, compose bar, collapsible header |

## Feature Domain Structure

```
src/features/messaging/
  CLAUDE.md
  types/thread.ts, message.ts, offer.ts
  services/messaging-server.ts, messaging.ts, offers-server.ts, offers.ts
  hooks/use-threads.ts, use-messages.ts, use-send-message.ts, use-create-thread.ts
  hooks/use-offers.ts, use-create-offer.ts, use-offer-actions.ts
  hooks/use-unread-count.ts
  components/
    thread-list/ (inbox thread rows)
    thread-detail/ (message view + compose)
    message-bubble/ (text message display)
    message-node/ (contextual cards: listing, offer, system, nudge)
    compose-bar/ (input + action menu)
    offer-sheet/ (bottom sheet for making/countering offers)
    collapsible-header/ (thread context header)
  utils/
    safety-filter.ts (PII regex, keyword filter, nudge detection)
    offer-validation.ts (min price, one-active rule)
```

## Out of Scope

- Image/media attachments (separate ticket — includes moderation)
- Supabase Realtime / WebSocket live delivery (#56)
- Typing indicators, read receipts, online status (#56)
- Custom request full lifecycle (schema reserved, build later)
- Dispute/return threads (future feature)
- AI-powered moderation (future)
- Platform-wide content moderation system (separate horizontal ticket to be created)
- Browser push notifications (#56)

## Related Tickets

- **#33** — Needs rewrite. Currently describes the offer system but assumes messaging exists. Should become the offers-only ticket referencing this base messaging work.
- **#56** — Real-time enhancements. Depends on this base messaging ticket.
- **New ticket needed:** Platform-wide content moderation (text + image scanning across listings, profiles, shops, messages)
- **New ticket needed:** Image support in messaging (with moderation)
