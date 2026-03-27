# Follows Feature

Part of #155 (social/follows parent feature).

## Purpose

Allows authenticated members to follow other members and shops. Drives social discovery and activity feeds. Follower counts are denormalized onto `members` and `shops` rows via a database trigger for fast display without joins.

## Database Schema

### `follows` table

| Column        | Type        | Constraints                                                 |
| ------------- | ----------- | ----------------------------------------------------------- |
| `id`          | UUID        | PK, `gen_random_uuid()`                                     |
| `follower_id` | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`                |
| `target_type` | TEXT        | NOT NULL, CHECK IN (`'member'`, `'shop'`)                   |
| `target_id`   | UUID        | NOT NULL, polymorphic (no FK — references members or shops) |
| `created_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                                   |

**Constraints:**

- `UNIQUE (follower_id, target_type, target_id)` — prevents duplicate follows
- `CHECK NOT (target_type = 'member' AND follower_id = target_id)` — prevents self-follows (following your own shop is allowed)

**Indexes:**

- `follows_follower_id_idx` on `follower_id`
- `follows_target_type_target_id_idx` on `(target_type, target_id)`

### Polymorphic Target Pattern

`target_type` + `target_id` is a polymorphic reference — `target_id` points to either `members.id` or `shops.id` depending on `target_type`. This avoids separate follow tables for each entity type. The same pattern is used by `flags`.

The application layer must validate that `target_id` exists for the given `target_type` before inserting, since there is no FK constraint.

### Denormalized `follower_count`

Both `members` and `shops` have a `follower_count INTEGER NOT NULL DEFAULT 0` column maintained by the `update_follower_count()` database trigger:

- **INSERT** on `follows` → increments the target's `follower_count`
- **DELETE** on `follows` → decrements the target's `follower_count` (clamped to 0 via `GREATEST`)

The trigger is `SECURITY DEFINER` to bypass RLS when updating the count.

### RLS Policies

| Policy                           | Operation | Roles               | Rule                                    |
| -------------------------------- | --------- | ------------------- | --------------------------------------- |
| Follows are viewable by everyone | SELECT    | authenticated, anon | `USING (true)`                          |
| Users can insert own follows     | INSERT    | authenticated       | `WITH CHECK (follower_id = auth.uid())` |
| Users can delete own follows     | DELETE    | authenticated       | `USING (follower_id = auth.uid())`      |

## Architecture

- **types/follow.ts** — Database-derived types: `Follow` (Row), `FollowInsert`, `FollowTargetType` (`'member' | 'shop'`), `FollowStatus` (`{ is_following: boolean }`), `FollowerCount` (`{ count: number }`), `FollowingItem` (denormalized follow with `name` and `avatar_url`)
- **services/follow-server.ts** — Server-side Supabase queries (uses `@/libs/supabase/server`): `createFollowServer` (inserts follow, catches `23505` for duplicates, blocks self-follow), `deleteFollowServer` (deletes by composite match, returns `{ success: boolean }`), `getFollowStatusServer` (returns `{ is_following }` via `maybeSingle()`), `getFollowerCountServer` (reads denormalized `follower_count` from `members` or `shops` table), `getFollowingServer` (fetches all follows for a member, resolves names/avatars via separate member/shop queries, optional `targetType` filter)
- **services/follow.ts** — Client-side fetch wrappers: `followTarget` (POST `/api/follows`), `unfollowTarget` (DELETE `/api/follows?target_type=&target_id=`), `getFollowStatus` (GET `/api/follows/status`), `getFollowerCount` (GET `/api/follows/count`), `getFollowing` (GET `/api/follows/following`)
- **hooks/use-follow-status.ts** — `useFollowStatus(targetType, targetId)`: query key `['follows', 'status', targetType, targetId]`, enabled guard on both params
- **hooks/use-follower-count.ts** — `useFollowerCount(targetType, targetId)`: query key `['follows', 'count', targetType, targetId]`, enabled guard on both params
- **hooks/use-following.ts** — `useFollowing(targetType?)`: query key `['follows', 'following', targetType]`, optional filter; always enabled (returns all follows when no type given)
- **hooks/use-follow-toggle.ts** — `useFollowToggle({ targetType, targetId, onSuccess?, onError? })`: mutation that follows or unfollows based on current state, with optimistic updates to both status and count caches; rolls back both on error; 409/404 responses treated as success (idempotent); invalidates status, count, and following queries on settle

## API Routes

| Method | Route                    | Handler                  | Auth Required | Status Codes        | Description                                                               |
| ------ | ------------------------ | ------------------------ | ------------- | ------------------- | ------------------------------------------------------------------------- |
| POST   | `/api/follows`           | `createFollowServer`     | Yes           | 201/400/401/409/500 | Follow a member or shop (409 on duplicate, 400 on self-follow)            |
| DELETE | `/api/follows`           | `deleteFollowServer`     | Yes           | 200/400/401/404/500 | Unfollow a member or shop (params via query string, 404 if not following) |
| GET    | `/api/follows/status`    | `getFollowStatusServer`  | Yes           | 200/400/401/500     | Check if the authenticated user follows a member or shop                  |
| GET    | `/api/follows/count`     | `getFollowerCountServer` | No            | 200/400/500         | Get the follower count for a member or shop (public, no auth)             |
| GET    | `/api/follows/following` | `getFollowingServer`     | Yes           | 200/400/401/500     | List members and shops the authenticated user follows                     |

## Public API

Consuming features import from the barrel export:

```ts
import {
  Follow,
  FollowInsert,
  FollowTargetType,
  FollowStatus,
  FollowerCount,
  FollowingItem,
  useFollowStatus,
  useFollowerCount,
  useFollowToggle,
  useFollowing,
} from '@/features/follows';
```

### useFollowStatus

```ts
const { data, isLoading } = useFollowStatus('member', memberId);
// data: { is_following: boolean } | undefined
```

### useFollowerCount

```ts
const { data } = useFollowerCount('shop', shopId);
// data: { count: number } | undefined
```

### useFollowToggle

```ts
const { mutate, isPending } = useFollowToggle({
  targetType: 'shop',
  targetId: shopId,
  onSuccess: () => toast('Updated'),
  onError: (error) => toast(error.message),
});

// Call with current follow state — mutation inverts it
mutate(isCurrentlyFollowing);
```

- Optimistically updates both `useFollowStatus` and `useFollowerCount` caches before the request completes
- Rolls back both caches on error
- 409 (already following) and 404 (not following) are treated as success — no error toast

### useFollowing

```ts
const { data } = useFollowing(); // all follows
const { data } = useFollowing('shop'); // only shop follows
// data: FollowingItem[] | undefined
```

`FollowingItem` shape:

```ts
{
  id: string;
  target_type: 'member' | 'shop';
  target_id: string;
  created_at: string;
  name: string; // member full name or shop_name
  avatar_url: string | null;
}
```

## Key Patterns

- **Server client** — All server services use `@/libs/supabase/server` (cookie-based auth, user JWT), not the admin client. The count endpoint does not require auth, so it omits auth headers.
- **Optimistic updates** — `useFollowToggle` implements full optimistic UI: cancels in-flight queries, snapshots previous state, updates cache immediately, reverts on error. Mirrors the pattern in addresses.
- **Polymorphic target** — `target_type` determines which table `target_id` references. `getFollowingServer` resolves member and shop details in two separate batch queries (using `.in()`) rather than N+1 individual lookups.
- **409/404 handling** — `useFollowToggle` checks `error instanceof FetchError && (error.status === 409 || error.status === 404)` and routes to `onSuccess` instead of `onError`. These are not user-facing errors — they indicate the state was already correct.
- **DELETE via query params** — The unfollow endpoint (`DELETE /api/follows`) reads `target_type` and `target_id` from `searchParams` (not the request body) because `DELETE` requests with bodies are unreliable in some clients. `unfollowTarget` in the client service builds the query string accordingly.
- **Self-follow guard** — Blocking self-follows for `target_type = 'member'` is enforced at both the DB level (CHECK constraint) and the application layer (`createFollowServer` throws before the Supabase insert).

## Directory Structure

```
src/features/follows/
├── CLAUDE.md
├── index.ts                          # Barrel export (types + hooks)
├── types/
│   └── follow.ts                     # Follow, FollowInsert, FollowTargetType, FollowStatus, FollowerCount, FollowingItem
├── services/
│   ├── follow-server.ts              # Server-side Supabase queries
│   └── follow.ts                     # Client-side fetch wrappers
└── hooks/
    ├── use-follow-status.ts          # Query: is the user following?
    ├── use-follower-count.ts         # Query: follower count for a target
    ├── use-follow-toggle.ts          # Mutation: follow/unfollow with optimistic updates
    └── use-following.ts              # Query: list of targets the user follows

src/app/api/follows/
├── route.ts                          # POST (follow), DELETE (unfollow)
├── status/
│   └── route.ts                      # GET follow status
├── count/
│   └── route.ts                      # GET follower count (public)
└── following/
    └── route.ts                      # GET following list
```

## Migration

`supabase/migrations/20260326200000_create_follows.sql`
