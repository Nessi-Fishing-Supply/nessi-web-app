# Blocks Feature

## Overview

Blocked members management and enforcement. Two responsibilities:

1. **Management** — lets authenticated users view and unblock members they have previously blocked (account settings UI)
2. **Enforcement** — prevents blocked users from viewing the blocker's profiles, shops, listings, and purchasing their items (server-side checks)

Blocking itself is triggered from messaging/profiles; this feature owns the management view (list + unblock) and all enforcement logic.

## Architecture

- **types/block.ts** — Database-derived types: `MemberBlock` (Row), `BlockedMemberItem` (denormalized with resolved name, avatar, and slug for display)
- **services/block-server.ts** — Server-side Supabase queries (uses `@/libs/supabase/server`): `isBlockedByServer` (enforcement check), `getBlockedMembersServer` (lists all blocks for the authenticated user, joins members to resolve name/avatar/slug), `unblockMemberServer` (removes a block row by `blocked_id`)
- **services/block.ts** — Client-side fetch wrappers: `getBlockedMembers` (GET `/api/blocks`), `unblockMember` (DELETE `/api/blocks?blocked_id={uuid}`)
- **hooks/use-blocked-members.ts** — `useBlockedMembers()`: query key `['blocks', userId]`, fetches the list of blocked members for the authenticated user. `useUnblockMember()`: mutation that removes a member from the block list with optimistic cache removal; rolls back on error

## Block Enforcement

### `isBlockedByServer(viewerId, ownerId)`

Shared server-side utility that checks whether `ownerId` (the content owner / blocker) has blocked `viewerId` (the viewer / blocked party).

**Signature:** `isBlockedByServer(viewerId: string | null, ownerId: string): Promise<boolean>`

**Short-circuit cases (returns `false`):**

- `viewerId` is `null` or `undefined` (unauthenticated visitor)
- `viewerId === ownerId` (self-view)

**Query:** `member_blocks WHERE blocker_id = ownerId AND blocked_id = viewerId` using `.maybeSingle()`. Returns `true` if a row exists.

**RLS requirement:** Uses the `member_blocks_select_blocked` policy (`blocked_id = auth.uid()`) so the server client (operating under the viewer's JWT) can query blocks where they are the blocked party.

### Enforcement Points

| Location       | File                                        | Check                                                 | Action                                            |
| -------------- | ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Member profile | `src/app/(frontend)/member/[slug]/page.tsx` | `isBlockedByServer(currentUserId, member.id)`         | `notFound()`                                      |
| Shop page      | `src/app/(frontend)/shop/[slug]/page.tsx`   | `isBlockedByServer(currentUserId, shop.owner_id)`     | `notFound()`                                      |
| Listing detail | `src/app/(frontend)/listing/[id]/page.tsx`  | `isBlockedByServer(currentUserId, listing.seller_id)` | `notFound()`                                      |
| Add to cart    | `src/features/cart/services/cart-server.ts` | `isBlockedByServer(userId, listing.seller_id)`        | Throws `'Seller has blocked you'` → 403           |
| Validate cart  | `src/features/cart/services/cart-server.ts` | Batch `IN` query on `member_blocks`                   | Items moved to `removed` with `reason: 'blocked'` |

**Design decisions:**

- Blocked users see the same not-found page as non-existent entities — no information leakage
- `generateMetadata` also checks blocks so OG crawlers don't leak profile data
- Search results are NOT filtered — enforcement is at detail/action level only
- Block checks use `seller_id` (the member identity), not `shop_id`
- Cart validation uses a single batch query (no N+1)

### Future Enforcement Points

When messaging and offer API routes are created, add block enforcement to:

- `POST /api/messages` — check if sender is blocked by any thread participant; return 403
- `POST /api/offers` — check if `buyer_id` is blocked by `seller_id`; return 403
- `PATCH /api/offers/[id]` — check if `buyer_id` is blocked by `seller_id` at acceptance time; return 403

## Database Schema

### `member_blocks` table

| Column       | Type        | Notes                                         |
| ------------ | ----------- | --------------------------------------------- |
| `id`         | uuid        | Primary key, `gen_random_uuid()`              |
| `blocker_id` | uuid        | FK → members.id (ON DELETE CASCADE), NOT NULL |
| `blocked_id` | uuid        | FK → members.id (ON DELETE CASCADE), NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT `now()`                     |

**Constraints:** `UNIQUE (blocker_id, blocked_id)` — prevents duplicate blocks. `CHECK (blocker_id != blocked_id)` — prevents self-blocks.

**RLS Policies:**

| Policy                         | Operation | Rule                                   |
| ------------------------------ | --------- | -------------------------------------- |
| `member_blocks_select_own`     | SELECT    | `USING (blocker_id = auth.uid())`      |
| `member_blocks_select_blocked` | SELECT    | `USING (blocked_id = auth.uid())`      |
| `member_blocks_insert_own`     | INSERT    | `WITH CHECK (blocker_id = auth.uid())` |
| `member_blocks_delete_own`     | DELETE    | `USING (blocker_id = auth.uid())`      |

The `member_blocks_select_blocked` policy (added in migration `20260330100000`) enables the enforcement utility to check blocks from the blocked user's perspective using the server client (user JWT), without the admin client.

## API Routes

| Method | Route                           | Auth Required | Status Codes        | Description                                                     |
| ------ | ------------------------------- | ------------- | ------------------- | --------------------------------------------------------------- |
| GET    | `/api/blocks`                   | Yes           | 200/401/500         | List all members blocked by the authenticated user              |
| DELETE | `/api/blocks?blocked_id={uuid}` | Yes           | 200/400/401/404/500 | Unblock a member (blocked_id via query param, 404 if not found) |

## Hooks

| Hook                  | Query Key            | Purpose                             | Optimistic                                  |
| --------------------- | -------------------- | ----------------------------------- | ------------------------------------------- |
| `useBlockedMembers()` | `['blocks', userId]` | List all blocked members            | —                                           |
| `useUnblockMember()`  | mutation             | Remove a member from the block list | Yes — removes from cache, rollback on error |

**Query key convention:** `['blocks', userId]` is user-scoped via `useAuth()`. All mutations invalidate this key in `onSettled`.

## Components

### BlockedMemberCard

Displays a single blocked member in the `/dashboard/blocked` list. Self-contained: manages its own unblock mutation via `useUnblockMember` internally, with toast feedback on success/error.

**Props:**

| Prop   | Type                | Required | Description                                   |
| ------ | ------------------- | -------- | --------------------------------------------- |
| `item` | `BlockedMemberItem` | Yes      | The blocked member with resolved display data |

**Features:**

- Avatar (falls back to initials), linked name to member profile (via slug), relative block date, Unblock button
- Unblock button triggers `useUnblockMember` — optimistic cache removal, rollback on error
- Toast on success: "Unblocked — {name} has been unblocked."
- Toast on error: "Something went wrong — Please try again."
- `aria-label="Unblock {name}"` on button
- Mobile-first: stacks vertically on small screens, row layout on md+

## Key Patterns

- **Server client** — All server services use `@/libs/supabase/server` (cookie-based auth, user JWT), not the admin client. Auth is enforced at the API layer.
- **DELETE via query params** — `DELETE /api/blocks` reads `blocked_id` from `searchParams` (not the request body). This mirrors the pattern in follows (`DELETE /api/follows`).
- **Optimistic cache removal** — `useUnblockMember` cancels in-flight `['blocks']` queries, snapshots previous data, removes the item from cache immediately, and restores on error. Mirrors the optimistic delete pattern in addresses and follows.
- **No admin client** — Blocks are scoped to the authenticated user via RLS. No elevated permissions are needed. The enforcement utility uses the `member_blocks_select_blocked` RLS policy to query from the blocked user's perspective.
- **Resolved display data** — `getBlockedMembersServer` joins the `members` table to resolve `name` (first_name + last_name), `avatar_url`, and `slug` server-side. This avoids N+1 lookups in the component layer.
- **Batch block check** — `validateCartServer` collects all unique seller IDs and performs a single `IN` query on `member_blocks` to avoid N+1 queries.

## Directory Structure

```
src/features/blocks/
├── CLAUDE.md
├── index.ts                              # Barrel export (types, hooks, isBlockedByServer)
├── types/
│   └── block.ts                          # MemberBlock, BlockedMemberItem
├── services/
│   ├── block-server.ts                   # isBlockedByServer, getBlockedMembersServer, unblockMemberServer
│   └── block.ts                          # Client-side fetch wrappers
├── hooks/
│   └── use-blocked-members.ts            # Query + mutation: useBlockedMembers, useUnblockMember
└── components/
    └── blocked-member-card/
        ├── index.tsx                      # BlockedMemberCard component (use client)
        └── blocked-member-card.module.scss

src/app/api/blocks/
└── route.ts                              # GET (list blocked), DELETE (unblock)
```
