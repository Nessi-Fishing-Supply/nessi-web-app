# Shop Messaging Context — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Author:** Kyle Holloway + Claude

## Summary

Add shop-aware messaging so that threads related to shop listings and shop pages are routed to a shared shop inbox, separate from the member's personal inbox. Shop team members with messaging permission can all see and respond to shop threads. The buyer sees the shop identity (name, avatar), not the individual team member.

## Current State

- `message_thread_participants` tracks participants by `member_id` only — no concept of shop identity
- `message_threads` has a `shop_id` column (used for custom requests) but participants don't reference it
- All messaging API routes ignore the `X-Nessi-Context` header
- Notifications always route to the individual member, never the shop team
- No shop dashboard messages route exists
- The context switching infrastructure (`X-Nessi-Context` header, Zustand store, shop permissions, route guards) is fully built and used by listings, settings, and roles

## Design

### Data Model

**New enum:**

```sql
CREATE TYPE participant_context_type AS ENUM ('member', 'shop');
```

**Alter `message_thread_participants`:**

```sql
ALTER TABLE message_thread_participants
  ADD COLUMN context_type participant_context_type NOT NULL DEFAULT 'member',
  ADD COLUMN context_id UUID NOT NULL;

-- Backfill existing rows: all current participants are member context
UPDATE message_thread_participants SET context_id = member_id WHERE context_id IS NULL;

-- Replace unique constraint
ALTER TABLE message_thread_participants
  DROP CONSTRAINT message_thread_participants_thread_member_unique;

ALTER TABLE message_thread_participants
  ADD CONSTRAINT message_thread_participants_thread_context_unique
  UNIQUE (thread_id, context_type, context_id);
```

Column semantics:

- `member_id` — always the real human user (for auth, block checks, notification delivery). Never null.
- `context_type` — `'member'` or `'shop'`. Determines which identity this participant represents.
- `context_id` — the `member_id` (when `context_type='member'`) or `shop_id` (when `context_type='shop'`). Used for inbox filtering and display name resolution.

For shop participants, `member_id` is set to the user who created the thread or the shop owner. It's used for auth verification and as a fallback — the actual inbox visibility is determined by `context_type='shop' AND context_id={shopId}`, and any shop member with messaging permission can access it.

**Display name resolution:**

- `context_type='member'` → join `members` table on `context_id` for `first_name`, `last_name`, `avatar_url`
- `context_type='shop'` → join `shops` table on `context_id` for `name`, `avatar_url`

**RLS policy updates:**

- Member inbox: `WHERE context_type='member' AND member_id = auth.uid()`
- Shop inbox: `WHERE context_type='shop' AND context_id = {shopId}` — API layer verifies the authenticated user is a shop member with messaging permission via `requireShopPermission`

### Thread Creation

When a buyer initiates a thread on a shop listing:

- Buyer participant: `context_type='member'`, `context_id={buyer_member_id}`, `member_id={buyer_member_id}`
- Seller participant: `context_type='shop'`, `context_id={shop_id}`, `member_id={listing.seller_id}` (the listing owner, used as auth fallback)
- Thread's `shop_id` is set to the shop that owns the listing

When a member initiates a direct message to another member:

- Both participants: `context_type='member'`, `context_id={their_member_id}`
- No change from current behavior

**Duplicate detection update:** The existing inquiry duplicate check uses `(listing_id, buyer_member_id)`. This stays the same — a buyer can only have one inquiry thread per listing regardless of which shop member responds.

### API Layer Changes

**Thread list — `GET /api/messaging/threads`:**

- Read `X-Nessi-Context` header
- Member context (`'member'`): filter `WHERE context_type='member' AND member_id=auth.uid()`
- Shop context (`'shop:{shopId}'`): validate user is shop member with messaging permission via `requireShopPermission`, then filter `WHERE context_type='shop' AND context_id={shopId}`
- Response shape unchanged — `ThreadWithParticipants[]`

**Thread detail — `GET /api/messaging/threads/{id}`:**

- Verify participant access based on context:
  - Member context: user's `member_id` must be a participant with `context_type='member'`
  - Shop context: thread must have a participant with `context_type='shop' AND context_id={shopId}`, and user must be a shop member with messaging permission

**Send message — `POST /api/messaging/threads/{id}/messages`:**

- Same context-based participant verification as thread detail
- For shop context: verify sender has messaging permission on the shop
- Sender identity in the message: `sender_id` remains the `member_id` of the actual human (for audit trail). The UI resolves display identity from the participant's `context_type`/`context_id`.

**Create thread — `POST /api/messaging/threads`:**

- Read `X-Nessi-Context` header to determine the creator's context
- If creating an inquiry on a shop listing: auto-set seller participant to `context_type='shop'`
- If creating a direct message: both participants are `context_type='member'`

### Notification Routing

**Shop thread notifications:**
When a message is sent in a shop thread (participant has `context_type='shop'`):

1. Look up all members of the shop with messaging permission (`shop_members` + `shop_roles` where `messaging >= 'view'`)
2. Dispatch in-app notification to each shop member: `dispatchNotification({ userId: shopMember.member_id, type: 'new_message', title: senderName, body: preview, link: '/dashboard/messages/{thread_id}' })`
3. Send email to each shop member (respecting their notification preferences): subject includes shop name, e.g., "New message for Tight Lines Tackle Co."

**Member thread notifications:**
No change from current behavior — dispatch to the individual `member_id`.

**Email template updates:**

- New message email: add context line "Message received by {shop_name}" or "Message received by {member_name}" depending on the thread participant context
- Offer emails: same pattern — "Offer received on {listing_title} for {shop_name}"

### UI Changes

**Shop dashboard sidebar:**

- Add "Messages" nav item to the shop dashboard sidebar (currently missing)
- Same position as in the member sidebar
- Badge shows shop unread count

**Messages page (`/dashboard/messages`):**

- Already works for member context — no route change needed
- When in shop context, the same route renders shop threads (API filters by context)
- Thread list, thread detail, compose bar all work identically — only the data differs

**Thread header and participant display:**

- When the other participant has `context_type='shop'`: show shop name and shop avatar (joined from `shops` table)
- When the other participant has `context_type='member'`: show member name and member avatar (existing behavior)
- "View profile" link: points to `/shop/{slug}` for shop context, `/member/{slug}` for member context

**Context bar (listing + offer reference):**

- No change — already shows listing info from the thread's `listing_id`

### Types

**Updated TypeScript types:**

```typescript
// In src/features/messaging/types/thread.ts
type ParticipantContextType = 'member' | 'shop';

// ThreadWithParticipants.participants[] gains:
interface ThreadParticipantWithContext {
  // existing fields
  member_id: string;
  role: ParticipantRole;
  unread_count: number;
  joined_at: string;
  last_read_at: string | null;
  // new fields
  context_type: ParticipantContextType;
  context_id: string;
  // resolved display info (populated by server)
  member: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    slug?: string;
  };
  // new: shop display info (populated when context_type='shop')
  shop?: {
    id: string;
    name: string;
    avatar_url: string | null;
    slug?: string;
  };
}
```

The UI reads `participant.context_type` to decide whether to display `participant.member` or `participant.shop` info.

### Unread Count

**Member context:** Sum of `unread_count` across participant rows where `context_type='member' AND member_id=auth.uid()`

**Shop context:** Sum of `unread_count` across participant rows where `context_type='shop' AND context_id={shopId}`. Since multiple shop members share the inbox, `unread_count` is per-participant-row, not per-shop-member. When any shop member reads a thread, mark it read for the shop participant row (all shop members see it as read).

### Mark Read Behavior

- Member threads: same as current — resets `unread_count` on the member's participant row
- Shop threads: resets `unread_count` on the shop participant row. Since it's one row shared across all shop members, marking read for one marks read for all. This matches the shared inbox model — if one team member handles it, it's handled.

## Out of Scope (Follow-up Tickets)

### Cross-context notification badges

When a member is in member context and their shop receives a message, show an unread badge on the shop card in the context switcher dropdown. Implementation: query shop unread counts for all shops the user is a member of, display as badge on the shop cards in the avatar menu. This is a UI-only addition once the core data model is in place.

### Per-member notification preferences for shops

Let individual shop members configure whether they receive email/in-app notifications for shop messages. Extends the existing `notification_preferences` pattern to include a `shop_messages` key scoped per shop.

### Shop-to-shop messaging

Allow shops to message other shops directly (wholesale inquiries, collaborations). Requires both participants to be `context_type='shop'`. Not needed for launch.

## Migration Strategy

- Clean break: no migration of existing threads. All current participant rows get `context_type='member'`, `context_id=member_id` via the column defaults.
- New threads created after this feature use the correct context model.
- Existing threads remain in member inboxes and work as before.

## Testing Strategy

- Unit tests: `createThreadServer` with shop context, participant filtering by context, display name resolution
- Integration tests: thread list filtering returns only member threads in member context and only shop threads in shop context
- E2E: create inquiry on shop listing → thread appears in shop inbox → shop member responds → buyer sees shop identity → notification dispatched to all shop members with permission
