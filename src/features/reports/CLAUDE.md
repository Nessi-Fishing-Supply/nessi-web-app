# Reports Feature

## Purpose

User-generated content and behavior reports. Allows authenticated users to flag listings, members, shops, or messages for review by the platform.

## Database Schema

### Table: `reports`

| Column      | Type               | Constraints                                       |
| ----------- | ------------------ | ------------------------------------------------- |
| id          | UUID               | PK, default `gen_random_uuid()`                   |
| reporter_id | UUID               | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| target_type | report_target_type | NOT NULL                                          |
| target_id   | UUID               | NOT NULL (polymorphic — no FK constraint)         |
| reason      | report_reason      | NOT NULL                                          |
| description | TEXT               | Nullable — optional user-provided details         |
| status      | report_status      | NOT NULL, default `'pending'`                     |
| created_at  | TIMESTAMPTZ        | NOT NULL, default `NOW()`                         |

**Unique constraint:** `(reporter_id, target_type, target_id)` — one report per user per target.

### Enums

- **report_reason:** `spam`, `prohibited_item`, `counterfeit`, `inappropriate_content`, `off_platform_transaction`, `harassment`, `other`
- **report_target_type:** `listing`, `member`, `shop`, `message`
- **report_status:** `pending`, `reviewed`, `resolved`, `dismissed`

### Indexes

- `reports_reporter_id_idx` — for querying a user's reports
- `reports_target_type_target_id_idx` — for querying all reports on a target

### RLS Policies

| Policy                                     | Operation | Rule                       |
| ------------------------------------------ | --------- | -------------------------- |
| Authenticated users can insert own reports | INSERT    | `reporter_id = auth.uid()` |
| Authenticated users can view own reports   | SELECT    | `reporter_id = auth.uid()` |

No UPDATE or DELETE policies — users cannot modify or retract reports. Admin operations bypass RLS via the admin client.

## Polymorphic Target Pattern

`target_id` is a UUID that references different tables depending on `target_type`:

| target_type | Referenced table |
| ----------- | ---------------- |
| listing     | `listings.id`    |
| member      | `members.id`     |
| shop        | `shops.id`       |
| message     | (future table)   |

There is intentionally **no FK constraint** on `target_id`. The application layer resolves the target based on `target_type`. This means:

- Deleting a target (e.g., a listing) does NOT cascade-delete its reports — reports persist for moderation history
- The application must validate that `target_id` exists for the given `target_type` before inserting

## Migration

`supabase/migrations/20260326000000_create_reports.sql`

## Future Work

- Report submission UI (modal with reason picker + optional description)
- Admin dashboard for reviewing reports (bypasses RLS)
- Report count badges on listings/members/shops
- Automated moderation triggers (e.g., auto-hide after N reports)
