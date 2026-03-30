# Blocks Feature

## Overview

Blocked members management — lets authenticated users view and unblock members they have previously blocked. Surfaces in account settings so users have full control over who can interact with them. Blocking itself is triggered from messaging/profiles; this feature owns only the management view (list + unblock).

## Architecture

- **types/block.ts** — Database-derived types: `MemberBlock` (Row), `BlockedMemberItem` (denormalized with resolved name, avatar, and slug for display)
- **services/block-server.ts** — Server-side Supabase queries (uses `@/libs/supabase/server`): `getBlockedMembersServer` (lists all blocks for the authenticated user, joins members to resolve name/avatar/slug), `deleteMemberBlockServer` (removes a block row by `blocked_id`)
- **services/block.ts** — Client-side fetch wrappers: `getBlockedMembers` (GET `/api/blocks`), `unblockMember` (DELETE `/api/blocks?blocked_id={uuid}`)
- **hooks/use-blocked-members.ts** — `useBlockedMembers()`: query key `['blocks']`, fetches the list of blocked members for the authenticated user
- **hooks/use-unblock-member.ts** — `useUnblockMember()`: mutation that removes a member from the block list with optimistic cache removal; rolls back on error

## Database Schema

### `member_blocks` table

| Column       | Type        | Notes                                        |
| ------------ | ----------- | -------------------------------------------- |
| `id`         | uuid        | Primary key, `gen_random_uuid()`             |
| `blocker_id` | uuid        | FK → members.id (ON DELETE CASCADE), NOT NULL |
| `blocked_id` | uuid        | FK → members.id (ON DELETE CASCADE), NOT NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT `now()`                    |

**Constraints:** `UNIQUE (blocker_id, blocked_id)` — prevents duplicate blocks.

**RLS Policies:**

| Policy                  | Operation | Rule                                     |
| ----------------------- | --------- | ---------------------------------------- |
| Users can view own blocks | SELECT  | `USING (blocker_id = auth.uid())`        |
| Users can insert own blocks | INSERT | `WITH CHECK (blocker_id = auth.uid())`  |
| Users can delete own blocks | DELETE | `USING (blocker_id = auth.uid())`       |

## API Routes

| Method | Route                             | Auth Required | Status Codes        | Description                                                  |
| ------ | --------------------------------- | ------------- | ------------------- | ------------------------------------------------------------ |
| GET    | `/api/blocks`                     | Yes           | 200/401/500         | List all members blocked by the authenticated user           |
| DELETE | `/api/blocks?blocked_id={uuid}`   | Yes           | 200/400/401/404/500 | Unblock a member (blocked_id via query param, 404 if not found) |

## Hooks

| Hook                   | Query Key   | Purpose                              | Optimistic                                    |
| ---------------------- | ----------- | ------------------------------------ | --------------------------------------------- |
| `useBlockedMembers()`  | `['blocks']` | List all blocked members            | —                                             |
| `useUnblockMember()`   | mutation    | Remove a member from the block list  | Yes — removes from cache, rollback on error   |

**Query key convention:** `['blocks']` is implicitly user-scoped (API route uses auth session). All mutations invalidate this key in `onSettled`.

## Components

### BlockedMemberCard

Displays a single blocked member in the `/dashboard/blocked` list. Self-contained: manages its own unblock mutation via `useUnblockMember` internally, with toast feedback on success/error.

**Props:**

| Prop    | Type                 | Required | Description                          |
| ------- | -------------------- | -------- | ------------------------------------ |
| `item`  | `BlockedMemberItem`  | Yes      | The blocked member with resolved display data |

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
- **No admin client** — Blocks are scoped to the authenticated user via RLS. No elevated permissions are needed.
- **Resolved display data** — `getBlockedMembersServer` joins the `members` table to resolve `name` (first_name + last_name), `avatar_url`, and `slug` server-side. This avoids N+1 lookups in the component layer.

## Directory Structure

```
src/features/blocks/
├── CLAUDE.md
├── types/
│   └── block.ts                      # MemberBlock, BlockedMemberItem
├── services/
│   ├── block-server.ts               # Server-side Supabase queries
│   └── block.ts                      # Client-side fetch wrappers
├── hooks/
│   ├── use-blocked-members.ts        # Query: list of blocked members
│   └── use-unblock-member.ts         # Mutation: unblock with optimistic removal
└── components/
    └── blocked-member-card/
        ├── index.tsx                  # BlockedMemberCard component (use client)
        └── blocked-member-card.module.scss

src/app/api/blocks/
└── route.ts                          # GET (list blocked), DELETE (unblock)
```
