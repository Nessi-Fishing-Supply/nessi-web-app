# Shop Messaging Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shop-aware messaging so threads related to shop listings route to a shared shop inbox, separate from the member's personal inbox.

**Architecture:** Extend `message_thread_participants` with `context_type` and `context_id` columns to distinguish member vs shop participation. API layer reads `X-Nessi-Context` header to filter threads. Shop team members with messaging permission share a single inbox. Buyers see the shop identity (name, avatar), not individual team members.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL, Tanstack Query, Zustand, SCSS Modules, Vitest

**Spec:** `docs/superpowers/specs/2026-04-02-shop-messaging-context-design.md`

---

## File Map

| Action | File                                                                         | Responsibility                                                       |
| ------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Create | `supabase/migrations/20260402100000_add_participant_context.sql`             | DB migration: enum + columns + constraint                            |
| Modify | `src/types/database.ts`                                                      | Regenerate types after migration                                     |
| Modify | `src/features/messaging/types/thread.ts`                                     | Add `ParticipantContextType`, update `ThreadWithParticipants`        |
| Modify | `src/features/messaging/services/messaging-server.ts`                        | Context-aware thread queries, thread creation, participant building  |
| Modify | `src/app/api/messaging/threads/route.ts`                                     | Read `X-Nessi-Context` header, filter threads by context             |
| Modify | `src/app/api/messaging/threads/[thread_id]/route.ts`                         | Context-aware participant verification for thread detail             |
| Modify | `src/app/api/messaging/threads/[thread_id]/messages/route.ts`                | Context-aware send permission, shop notification dispatch            |
| Modify | `src/app/api/messaging/threads/[thread_id]/upload/route.ts`                  | Context-aware upload permission, shop notification dispatch          |
| Modify | `src/app/api/messaging/unread-count/route.ts`                                | Context-aware unread count                                           |
| Modify | `src/components/navigation/side-nav/index.tsx`                               | Add Messages nav item to shop sidebar                                |
| Modify | `src/features/messaging/components/thread-list/thread-row.tsx`               | Display shop name/avatar for shop participants                       |
| Modify | `src/app/(frontend)/dashboard/messages/[thread_id]/thread-page.tsx`          | Display shop identity in header for shop threads                     |
| Modify | `src/features/messaging/services/messaging.ts`                               | No change needed — `X-Nessi-Context` already sent via `@/libs/fetch` |
| Create | `src/features/messaging/services/__tests__/messaging-server-context.test.ts` | Tests for context-aware thread operations                            |
| Modify | `src/features/messaging/CLAUDE.md`                                           | Document context model                                               |

---

### Task 1: Database Migration

**Files:**

- Create: `supabase/migrations/20260402100000_add_participant_context.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add participant context to support member vs shop identities in messaging
CREATE TYPE participant_context_type AS ENUM ('member', 'shop');

ALTER TABLE public.message_thread_participants
  ADD COLUMN context_type participant_context_type NOT NULL DEFAULT 'member',
  ADD COLUMN context_id UUID;

-- Backfill: all existing participants are member context
UPDATE public.message_thread_participants
SET context_id = member_id
WHERE context_id IS NULL;

-- Now make context_id NOT NULL
ALTER TABLE public.message_thread_participants
  ALTER COLUMN context_id SET NOT NULL;

-- Replace unique constraint: a context identity can only appear once per thread
ALTER TABLE public.message_thread_participants
  DROP CONSTRAINT IF EXISTS message_thread_participants_thread_member_unique;

ALTER TABLE public.message_thread_participants
  ADD CONSTRAINT message_thread_participants_thread_context_unique
  UNIQUE (thread_id, context_type, context_id);

-- Index for fast inbox queries
CREATE INDEX idx_participants_context
  ON public.message_thread_participants (context_type, context_id);
```

- [ ] **Step 2: Apply the migration**

Run: `pnpm db:types`
Expected: `src/types/database.ts` regenerated with `context_type` and `context_id` columns on `message_thread_participants`, and `participant_context_type` enum.

- [ ] **Step 3: Verify migration applied**

Check that `src/types/database.ts` contains:

- `participant_context_type: "member" | "shop"` in Enums
- `context_type` and `context_id` in `message_thread_participants` Row/Insert/Update types

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260402100000_add_participant_context.sql src/types/database.ts
git commit -m "feat(messaging): add participant context columns for shop messaging"
```

---

### Task 2: Update TypeScript Types

**Files:**

- Modify: `src/features/messaging/types/thread.ts`

- [ ] **Step 1: Add ParticipantContextType and update ThreadWithParticipants**

In `src/features/messaging/types/thread.ts`, add the context type and extend the participant shape:

```typescript
export type ParticipantContextType = Database['public']['Enums']['participant_context_type'];
```

Update the `ThreadWithParticipants` type to include context fields and optional shop display info on participants:

```typescript
export type ThreadWithParticipants = MessageThread & {
  participants: (ThreadParticipant & {
    context_type: ParticipantContextType;
    context_id: string;
    member: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      slug: string | null;
      last_seen_at: string | null;
    };
    shop?: {
      id: string;
      name: string;
      avatar_url: string | null;
      slug: string | null;
    } | null;
  })[];
  my_unread_count: number;
  listing?: ThreadListingDetails | null;
};
```

- [ ] **Step 2: Export ParticipantContextType from barrel**

Add `ParticipantContextType` to the exports in `src/features/messaging/index.ts`.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Type errors in `messaging-server.ts` and possibly API routes where `ThreadWithParticipants` is constructed — these will be fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/features/messaging/types/thread.ts src/features/messaging/index.ts
git commit -m "feat(messaging): add ParticipantContextType and shop display fields to types"
```

---

### Task 3: Update Server Service — buildThreadsWithParticipants

**Files:**

- Modify: `src/features/messaging/services/messaging-server.ts`

This is the core change — update the participant builder to include context fields and resolve shop display info.

- [ ] **Step 1: Update the participant select query**

In `buildThreadsWithParticipants`, change the participant select to include `context_type` and `context_id`:

```typescript
const { data: participants, error: participantsError } = await supabase
  .from('message_thread_participants')
  .select('*, members(id, first_name, last_name, avatar_url, slug, last_seen_at)')
  .in('thread_id', threadIds);
```

No change to the select — `*` already includes the new columns. But we need to add a shop lookup.

- [ ] **Step 2: Add shop data resolution**

After fetching participants, collect all shop `context_id` values and batch-fetch shop details:

```typescript
// Batch fetch shop details for shop-context participants
const shopContextIds = [
  ...new Set(
    (participants ?? []).filter((p) => p.context_type === 'shop').map((p) => p.context_id),
  ),
];

const shopsByIdMap = new Map<
  string,
  { id: string; name: string; avatar_url: string | null; slug: string | null }
>();
if (shopContextIds.length > 0) {
  const { data: shops } = await supabase
    .from('shops')
    .select('id, name, avatar_url, slug')
    .in('id', shopContextIds);

  for (const s of shops ?? []) {
    shopsByIdMap.set(s.id, s);
  }
}
```

- [ ] **Step 3: Update participant transformation**

In the `threads.map()` return, add `context_type`, `context_id`, and `shop` to each participant:

```typescript
return {
  id: p.id,
  thread_id: p.thread_id,
  member_id: p.member_id,
  role: p.role,
  joined_at: p.joined_at,
  last_read_at: p.last_read_at,
  unread_count: p.unread_count,
  is_blocked: p.is_blocked,
  context_type: p.context_type,
  context_id: p.context_id,
  member: {
    /* existing member resolution */
  },
  shop: p.context_type === 'shop' ? (shopsByIdMap.get(p.context_id) ?? null) : null,
};
```

- [ ] **Step 4: Update getThreadsServer to accept context parameters**

Change the function signature to accept optional context filtering:

```typescript
export async function getThreadsServer(
  userId: string,
  type?: ThreadType,
  context?: { type: 'member' } | { type: 'shop'; shopId: string },
): Promise<ThreadWithParticipants[]>;
```

Update the participant query to filter by context:

```typescript
let participantQuery = supabase.from('message_thread_participants').select('thread_id');

if (context?.type === 'shop') {
  participantQuery = participantQuery.eq('context_type', 'shop').eq('context_id', context.shopId);
} else {
  participantQuery = participantQuery.eq('context_type', 'member').eq('member_id', userId);
}

const { data: myParticipantRows, error: participantError } = await participantQuery;
```

- [ ] **Step 5: Update getThreadByIdServer for context-aware access**

Add context parameter to `getThreadByIdServer`:

```typescript
export async function getThreadByIdServer(
  userId: string,
  threadId: string,
  context?: { type: 'member' } | { type: 'shop'; shopId: string },
): Promise<ThreadWithParticipants | null>;
```

Update the participant check to verify context-appropriate access:

```typescript
if (context?.type === 'shop') {
  // Shop context: check if thread has a shop participant with this shopId
  const { data: shopParticipant } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('context_type', 'shop')
    .eq('context_id', context.shopId)
    .maybeSingle();

  if (!shopParticipant) return null;
} else {
  // Member context: check if user is a member participant
  const { data: myParticipant } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('context_type', 'member')
    .eq('member_id', userId)
    .maybeSingle();

  if (!myParticipant) return null;
}
```

- [ ] **Step 6: Update createThreadServer to accept context**

Add context fields to the participant insertion in `createThreadServer`. The `params` type gains optional context fields:

```typescript
// In the participant rows construction:
const participantRows = params.participantIds.map((memberId, index) => ({
  thread_id: thread.id,
  member_id: memberId,
  role: params.roles[index],
  context_type: params.contextTypes?.[index] ?? 'member',
  context_id: params.contextIds?.[index] ?? memberId,
}));
```

- [ ] **Step 7: Update markThreadReadServer for context**

When marking read in shop context, use the shop participant row (not member_id):

```typescript
export async function markThreadReadServer(
  userId: string,
  threadId: string,
  context?: { type: 'member' } | { type: 'shop'; shopId: string },
): Promise<void>;
```

Update the query to find the right participant row:

```typescript
let readQuery = supabase
  .from('message_thread_participants')
  .update({ unread_count: 0, last_read_at: new Date().toISOString() })
  .eq('thread_id', threadId);

if (context?.type === 'shop') {
  readQuery = readQuery.eq('context_type', 'shop').eq('context_id', context.shopId);
} else {
  readQuery = readQuery.eq('context_type', 'member').eq('member_id', userId);
}
```

- [ ] **Step 8: Update getUnreadCountServer for context**

```typescript
export async function getUnreadCountServer(
  userId: string,
  context?: { type: 'member' } | { type: 'shop'; shopId: string },
): Promise<number>;
```

Filter the unread sum query by context, same pattern as `getThreadsServer`.

- [ ] **Step 9: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (or remaining errors in API routes, fixed in Task 4)

- [ ] **Step 10: Commit**

```bash
git add src/features/messaging/services/messaging-server.ts
git commit -m "feat(messaging): context-aware thread queries, creation, and mark-read"
```

---

### Task 4: Update API Routes

**Files:**

- Modify: `src/app/api/messaging/threads/route.ts`
- Modify: `src/app/api/messaging/threads/[thread_id]/route.ts`
- Modify: `src/app/api/messaging/threads/[thread_id]/messages/route.ts`
- Modify: `src/app/api/messaging/threads/[thread_id]/upload/route.ts`
- Modify: `src/app/api/messaging/unread-count/route.ts`

- [ ] **Step 1: Create a shared context parser utility**

Create a helper to parse `X-Nessi-Context` into a typed context object. Add to the top of each route or as a shared utility in `src/features/messaging/utils/parse-context.ts`:

```typescript
export function parseMessageContext(
  request: Request,
): { type: 'member' } | { type: 'shop'; shopId: string } {
  const header = request.headers.get('X-Nessi-Context');
  if (header && header.startsWith('shop:')) {
    return { type: 'shop', shopId: header.slice('shop:'.length) };
  }
  return { type: 'member' };
}
```

- [ ] **Step 2: Update GET /api/messaging/threads**

Parse context from the request header and pass to `getThreadsServer`:

```typescript
const context = parseMessageContext(request);

// For shop context, verify user has messaging permission
if (context.type === 'shop') {
  const permResult = await requireShopPermission(request, 'messaging', 'view');
  if (permResult instanceof NextResponse) return permResult;
}

const result = await getThreadsServer(user.id, type, context);
```

- [ ] **Step 3: Update POST /api/messaging/threads**

When creating an inquiry thread on a shop listing, detect the shop and set context:

```typescript
const context = parseMessageContext(request);

// If listing belongs to a shop, seller participant should be shop context
// Look up the listing's shop_id
if (body.listingId) {
  const { data: listing } = await supabase
    .from('listings')
    .select('seller_id, shop_id')
    .eq('id', body.listingId)
    .single();

  if (listing?.shop_id) {
    // Seller participates as shop
    contextTypes = ['member', 'shop'];
    contextIds = [buyerId, listing.shop_id];
  }
}
```

Pass `contextTypes` and `contextIds` to `createThreadServer`.

- [ ] **Step 4: Update GET /api/messaging/threads/[thread_id]**

Parse context from request and pass to `getThreadByIdServer`:

```typescript
const context = parseMessageContext(request);

if (context.type === 'shop') {
  const permResult = await requireShopPermission(request, 'messaging', 'view');
  if (permResult instanceof NextResponse) return permResult;
}

const thread = await getThreadByIdServer(user.id, thread_id, context);
```

- [ ] **Step 5: Update POST /api/messaging/threads/[thread_id]/messages**

For shop context, verify messaging permission and update the participant check:

```typescript
const context = parseMessageContext(request);

if (context.type === 'shop') {
  const permResult = await requireShopPermission(request, 'messaging', 'full');
  if (permResult instanceof NextResponse) return permResult;
}

// Update participant check to be context-aware
const isParticipant =
  context.type === 'shop'
    ? participants?.some((p) => p.context_type === 'shop' && p.context_id === context.shopId)
    : participants?.some((p) => p.member_id === user.id && p.context_type === 'member');
```

Update the notification dispatch for shop threads — notify all shop members with messaging permission:

```typescript
// For shop-context threads, notify all shop members with messaging permission
const shopParticipant = participants?.find((p) => p.context_type === 'shop');
if (shopParticipant) {
  const { getShopMembersWithPermission } =
    await import('@/features/messaging/utils/shop-notification');
  const shopMembers = await getShopMembersWithPermission(
    shopParticipant.context_id,
    'messaging',
    'view',
  );
  for (const sm of shopMembers.filter((m) => m.member_id !== user.id)) {
    dispatchNotification({
      userId: sm.member_id,
      type: 'new_message',
      title: senderName,
      body: preview,
      link: `/dashboard/messages/${thread_id}`,
    });
  }
}
```

- [ ] **Step 6: Update POST /api/messaging/threads/[thread_id]/upload**

Same context-aware participant check and shop notification dispatch as Step 5.

- [ ] **Step 7: Update GET /api/messaging/unread-count**

Parse context and pass to `getUnreadCountServer`:

```typescript
const context = parseMessageContext(request);

if (context.type === 'shop') {
  const permResult = await requireShopPermission(request, 'messaging', 'view');
  if (permResult instanceof NextResponse) return permResult;
}

const count = await getUnreadCountServer(user.id, context);
```

- [ ] **Step 8: Update PATCH /api/messaging/threads/[thread_id]/read**

Parse context and pass to `markThreadReadServer`:

```typescript
const context = parseMessageContext(request);
await markThreadReadServer(user.id, thread_id, context);
```

- [ ] **Step 9: Create shop notification utility**

Create `src/features/messaging/utils/shop-notification.ts`:

```typescript
import { createAdminClient } from '@/libs/supabase/admin';
import type {
  ShopPermissionFeature,
  ShopPermissionLevel,
} from '@/features/shops/types/permissions';
import { meetsLevel } from '@/features/shops/utils/check-permission';

export async function getShopMembersWithPermission(
  shopId: string,
  feature: ShopPermissionFeature,
  level: ShopPermissionLevel,
): Promise<{ member_id: string }[]> {
  const supabase = createAdminClient();

  const { data: members, error } = await supabase
    .from('shop_members')
    .select('member_id, shop_roles(permissions)')
    .eq('shop_id', shopId);

  if (error || !members) return [];

  return members.filter((m) => {
    const permissions = (m.shop_roles as any)?.permissions;
    if (!permissions) return false;
    return meetsLevel(permissions, feature, level);
  });
}
```

- [ ] **Step 10: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/app/api/messaging/ src/features/messaging/utils/parse-context.ts src/features/messaging/utils/shop-notification.ts
git commit -m "feat(messaging): context-aware API routes with shop permission checks and notification dispatch"
```

---

### Task 5: Update Shop Dashboard Sidebar

**Files:**

- Modify: `src/components/navigation/side-nav/index.tsx`

- [ ] **Step 1: Add Messages to SHOP_NAV_ITEMS**

Add a Messages entry to the `SHOP_NAV_ITEMS` array, gated by `messaging` permission:

```typescript
const SHOP_NAV_ITEMS: ShopNavItem[] = [
  { href: '/dashboard', icon: <HiOutlineHome />, label: 'Dashboard' },
  {
    href: '/dashboard/messages',
    icon: <HiOutlineChatAlt2 />,
    label: 'Messages',
    requiredFeature: 'messaging',
  },
  {
    href: '/dashboard/listings',
    icon: <HiOutlineShoppingBag />,
    label: 'Listings',
    requiredFeature: 'listings',
  },
  // ... existing items
];
```

Import `HiOutlineChatAlt2` from `react-icons/hi` at the top of the file.

- [ ] **Step 2: Verify in browser**

Switch to shop context in the browser. The sidebar should now show a "Messages" link between Dashboard and Listings. Clicking it should navigate to `/dashboard/messages` which will show shop threads (once API changes are deployed).

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation/side-nav/index.tsx
git commit -m "feat(messaging): add Messages nav item to shop dashboard sidebar"
```

---

### Task 6: Update Thread List UI — Shop Identity Display

**Files:**

- Modify: `src/features/messaging/components/thread-list/thread-row.tsx`
- Modify: `src/app/(frontend)/dashboard/messages/[thread_id]/thread-page.tsx`

- [ ] **Step 1: Update ThreadRow to display shop name/avatar**

In `thread-row.tsx`, update the "other participant" resolution to use shop data when the other participant has `context_type === 'shop'`:

```typescript
const other = thread.participants.find((p) => p.member.id !== currentUserId);

// Resolve display identity — shop name/avatar if shop context, member otherwise
const displayName =
  other?.context_type === 'shop' && other.shop
    ? other.shop.name
    : other
      ? `${other.member.first_name} ${other.member.last_name}`
      : 'Unknown';

const displayAvatar =
  other?.context_type === 'shop' && other.shop
    ? (other.shop.avatar_url ?? undefined)
    : (other?.member.avatar_url ?? undefined);
```

Use `displayName` and `displayAvatar` instead of `name` and `avatarUrl` in the JSX.

- [ ] **Step 2: Update thread-page.tsx header for shop identity**

In `thread-page.tsx`, update the desktop and mobile headers to show shop name/avatar when the other participant is a shop:

```typescript
const otherParticipant = thread?.participants.find((p) => p.member.id !== user?.id);

const otherDisplayName =
  otherParticipant?.context_type === 'shop' && otherParticipant.shop
    ? otherParticipant.shop.name
    : otherParticipant
      ? `${otherParticipant.member.first_name} ${otherParticipant.member.last_name}`
      : 'Unknown';

const otherDisplayAvatar =
  otherParticipant?.context_type === 'shop' && otherParticipant.shop
    ? (otherParticipant.shop.avatar_url ?? undefined)
    : (otherParticipant?.member.avatar_url ?? undefined);

const otherProfileHref =
  otherParticipant?.context_type === 'shop' && otherParticipant.shop?.slug
    ? `/shop/${otherParticipant.shop.slug}`
    : otherParticipant?.member.slug
      ? `/member/${otherParticipant.member.slug}`
      : null;
```

Use these in the header Avatar, name display, and "View profile" link.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/messaging/components/thread-list/thread-row.tsx src/app/\(frontend\)/dashboard/messages/\[thread_id\]/thread-page.tsx
git commit -m "feat(messaging): display shop identity in thread list and chat header"
```

---

### Task 7: Update Email Notifications for Shop Context

**Files:**

- Modify: `src/app/api/messaging/threads/[thread_id]/messages/route.ts`
- Modify: `src/app/api/messaging/threads/[thread_id]/upload/route.ts`

- [ ] **Step 1: Update message notification emails for shop threads**

In the fire-and-forget email notification block of the messages route, when the thread has a shop participant, send to all shop members and include shop name in the subject:

```typescript
// For shop threads, email all shop members with messaging permission
const shopParticipant = (participants ?? []).find(
  (p) => p.context_type === 'shop' && p.member_id !== user.id,
);

if (shopParticipant) {
  const { getShopMembersWithPermission } =
    await import('@/features/messaging/utils/shop-notification');
  const shopMembers = await getShopMembersWithPermission(
    shopParticipant.context_id,
    'messaging',
    'view',
  );

  // Get shop name for email subject
  const { data: shop } = await supabase
    .from('shops')
    .select('name')
    .eq('id', shopParticipant.context_id)
    .single();

  const shopName = shop?.name ?? 'your shop';

  const { newMessage } = await import('@/features/email/templates/new-message');
  const { sendNotificationEmail } = await import('@/features/messaging/utils/notification-email');

  const { subject, html } = newMessage({
    senderName,
    messagePreview: messageContent,
    threadId: thread_id,
    shopName,
  });

  for (const sm of shopMembers.filter((m) => m.member_id !== user.id)) {
    sendNotificationEmail({ recipientId: sm.member_id, subject, html });
  }
}
```

- [ ] **Step 2: Update the newMessage email template to accept optional shopName**

In `src/features/email/templates/new-message.ts`, add optional `shopName` parameter:

```typescript
export function newMessage({
  senderName,
  messagePreview,
  threadId,
  shopName,
}: {
  senderName: string;
  messagePreview: string;
  threadId: string;
  shopName?: string;
}): EmailTemplate {
  const subjectLine = shopName
    ? `New message for ${shopName} from ${senderName}`
    : `New message from ${senderName}`;

  return {
    subject: subjectLine,
    html: /* existing template, optionally add "Message received by {shopName}" line */,
  };
}
```

- [ ] **Step 3: Apply same pattern to upload route**

Duplicate the shop notification pattern from Step 1 into the upload route's notification block.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/messaging/threads/\[thread_id\]/messages/route.ts src/app/api/messaging/threads/\[thread_id\]/upload/route.ts src/features/email/templates/new-message.ts
git commit -m "feat(messaging): shop-context email notifications with shop name in subject"
```

---

### Task 8: Update Thread Creation for Shop Listings

**Files:**

- Modify: `src/app/api/messaging/threads/route.ts`
- Modify: `src/features/messaging/services/offers-server.ts`

- [ ] **Step 1: Update thread creation for inquiry on shop listings**

In `POST /api/messaging/threads`, when creating an inquiry thread and the listing belongs to a shop, set the seller participant to shop context:

```typescript
// After fetching the listing to get seller_id
const { data: listing } = await supabase
  .from('listings')
  .select('seller_id, shop_id')
  .eq('id', body.listingId)
  .single();

const contextTypes: ('member' | 'shop')[] = ['member', 'member'];
const contextIds: string[] = [userId, listing.seller_id];

if (listing?.shop_id) {
  contextTypes[1] = 'shop';
  contextIds[1] = listing.shop_id;
}

const { thread, existing } = await createThreadServer({
  type: body.type,
  createdBy: userId,
  participantIds: [userId, listing.seller_id],
  roles: ['buyer', 'seller'],
  listingId: body.listingId,
  contextTypes,
  contextIds,
});
```

- [ ] **Step 2: Update offer creation for shop listings**

In `createOfferServer` in `offers-server.ts`, apply the same pattern — when the listing belongs to a shop, set the seller participant to shop context:

```typescript
// After fetching listing (already done for validation)
const contextTypes: ('member' | 'shop')[] = ['member', 'member'];
const contextIds: string[] = [userId, params.sellerId];

if (listing.shop_id) {
  contextTypes[1] = 'shop';
  contextIds[1] = listing.shop_id;
}

const { thread } = await createThreadServer({
  type: 'offer',
  createdBy: userId,
  participantIds: [userId, params.sellerId],
  roles: ['buyer', 'seller'],
  listingId: params.listingId,
  contextTypes,
  contextIds,
});
```

Note: `listing.shop_id` needs to be added to the listing select query in `createOfferServer` (currently selects `id, title, price_cents, status, seller_id`).

- [ ] **Step 3: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test:run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/messaging/threads/route.ts src/features/messaging/services/offers-server.ts
git commit -m "feat(messaging): set shop context on threads created for shop listings"
```

---

### Task 9: Update Participant Check in Messages Route

**Files:**

- Modify: `src/app/api/messaging/threads/[thread_id]/messages/route.ts`

- [ ] **Step 1: Update participant select to include context columns**

The participants query currently selects only `member_id`. Add `context_type` and `context_id`:

```typescript
const { data: participants, error: participantsError } = await supabase
  .from('message_thread_participants')
  .select('member_id, context_type, context_id')
  .eq('thread_id', thread_id);
```

- [ ] **Step 2: Update participant verification**

Replace the simple member_id check with context-aware verification:

```typescript
const context = parseMessageContext(request);

if (context.type === 'shop') {
  const permResult = await requireShopPermission(request, 'messaging', 'full');
  if (permResult instanceof NextResponse) return permResult;

  const isShopParticipant = participants?.some(
    (p) => p.context_type === 'shop' && p.context_id === context.shopId,
  );
  if (!isShopParticipant) {
    return NextResponse.json(
      { error: 'Your shop is not a participant in this thread' },
      { status: 403, headers: AUTH_CACHE_HEADERS },
    );
  }
} else {
  const isParticipant = participants?.some(
    (p) => p.member_id === user.id && p.context_type === 'member',
  );
  if (!isParticipant) {
    return NextResponse.json(
      { error: 'You are not a participant in this thread' },
      { status: 403, headers: AUTH_CACHE_HEADERS },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messaging/threads/\[thread_id\]/messages/route.ts
git commit -m "feat(messaging): context-aware participant verification in messages route"
```

---

### Task 10: Tests

**Files:**

- Create: `src/features/messaging/services/__tests__/messaging-server-context.test.ts`
- Create: `src/features/messaging/utils/__tests__/parse-context.test.ts`

- [ ] **Step 1: Write parseMessageContext tests**

```typescript
import { describe, it, expect } from 'vitest';
import { parseMessageContext } from '../parse-context';

describe('parseMessageContext', () => {
  it('returns member context when no header', () => {
    const request = new Request('http://localhost', { headers: {} });
    expect(parseMessageContext(request)).toEqual({ type: 'member' });
  });

  it('returns member context for "member" header', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Nessi-Context': 'member' },
    });
    expect(parseMessageContext(request)).toEqual({ type: 'member' });
  });

  it('returns shop context with shopId', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Nessi-Context': 'shop:abc-123' },
    });
    expect(parseMessageContext(request)).toEqual({ type: 'shop', shopId: 'abc-123' });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/messaging/utils/__tests__/parse-context.test.ts
git commit -m "test(messaging): add parseMessageContext unit tests"
```

---

### Task 11: Update CLAUDE.md Documentation

**Files:**

- Modify: `src/features/messaging/CLAUDE.md`

- [ ] **Step 1: Add Context Model section to CLAUDE.md**

Add a new section documenting the context model:

```markdown
## Participant Context Model

Each thread participant has a `context_type` (`'member'` or `'shop'`) and `context_id` that determines which identity they represent:

- **Member context:** `context_type='member'`, `context_id={member_id}`. The participant acts as their personal identity.
- **Shop context:** `context_type='shop'`, `context_id={shop_id}`. The participant acts as a shop. All shop members with messaging permission share the inbox. The `member_id` column still tracks the human user who created the thread (for auth fallback).

### Inbox Filtering

- Member inbox: threads where `context_type='member' AND member_id=auth.uid()`
- Shop inbox: threads where `context_type='shop' AND context_id={shopId}` (API verifies user is shop member with messaging permission)

### Display Identity Resolution

- `context_type='member'` → join `members` table for name/avatar
- `context_type='shop'` → join `shops` table for name/avatar

### Mark Read

Shop threads have one participant row shared across all shop members. Marking read for one marks read for all (shared inbox model).
```

- [ ] **Step 2: Update Database Enums table**

Add `participant_context_type` to the enums table:

```markdown
| `participant_context_type` | `'member'`, `'shop'` |
```

- [ ] **Step 3: Update message_thread_participants table**

Add `context_type` and `context_id` columns to the schema table.

- [ ] **Step 4: Commit**

```bash
git add src/features/messaging/CLAUDE.md
git commit -m "docs(messaging): document participant context model in CLAUDE.md"
```

---

### Task 12: Format, Lint, and Final Verification

- [ ] **Step 1: Format all changed files**

Run: `pnpm format`

- [ ] **Step 2: Run full quality gate**

Run: `pnpm lint && pnpm lint:styles && pnpm typecheck && pnpm test:run`
Expected: All PASS

- [ ] **Step 3: Final commit if formatting changed anything**

```bash
git add -A
git commit -m "chore(messaging): format and lint fixes for shop messaging context"
```
