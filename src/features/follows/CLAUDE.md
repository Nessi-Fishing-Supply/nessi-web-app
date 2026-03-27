# Follows Feature

Part of #155 (social/follows parent feature).

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

`target_type` + `target_id` is a polymorphic reference — `target_id` points to either `members.id` or `shops.id` depending on `target_type`. This avoids separate follow tables for each entity type. The same pattern is used by `reports`.

### Denormalized `follower_count`

Both `members` and `shops` have a `follower_count INTEGER NOT NULL DEFAULT 0` column maintained by the `update_follower_count()` database trigger:

- **INSERT** on `follows` → increments the target's `follower_count`
- **DELETE** on `follows` → decrements the target's `follower_count`

The trigger is `SECURITY DEFINER` to bypass RLS when updating the count.

### RLS Policies

| Policy                           | Operation | Roles               | Rule                                    |
| -------------------------------- | --------- | ------------------- | --------------------------------------- |
| Follows are viewable by everyone | SELECT    | authenticated, anon | `USING (true)`                          |
| Users can insert own follows     | INSERT    | authenticated       | `WITH CHECK (follower_id = auth.uid())` |
| Users can delete own follows     | DELETE    | authenticated       | `USING (follower_id = auth.uid())`      |

## Directory Structure

```
src/features/follows/
├── CLAUDE.md          # This file
├── types/             # Follow types (future)
├── services/          # Supabase queries (future)
├── hooks/             # Tanstack Query hooks (future)
└── components/        # Follow button, follower list (future)
```

## Migration

`supabase/migrations/20260326200000_create_follows.sql`
