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

## Architecture

- **types/report.ts** — Database-derived types: `Report` (Row), `ReportInsert`, `ReportReason`, `ReportTargetType`, `ReportStatus`, `ReportFormData`, `DuplicateCheckParams`
- **constants/reasons.ts** — `REPORT_REASONS` (7 entries with value/label/description), `REPORT_TARGET_TYPES` (4 entries with value/label)
- **validations/report.ts** — Yup schema validating: `target_type` (oneOf 4 types), `target_id` (UUID), `reason` (oneOf 7 reasons), `description` (optional, max 1000 chars)
- **services/report-server.ts** — Server-side Supabase queries: `createReportServer` (inserts report, catches 23505 unique constraint for duplicates), `getExistingReportServer` (returns report or null via `maybeSingle()`)
- **services/report.ts** — Client-side fetch wrappers: `submitReport` (POST /api/reports), `checkDuplicateReport` (GET /api/reports/check)

## API Routes

| Method | Route                | Handler                   | Status Codes    | Description                                              |
| ------ | -------------------- | ------------------------- | --------------- | -------------------------------------------------------- |
| POST   | `/api/reports`       | `createReportServer`      | 201/400/401/409 | Create a report (409 on duplicate per unique constraint) |
| GET    | `/api/reports/check` | `getExistingReportServer` | 200/400/401     | Check if user already reported a target (`{ exists }`)   |

## Key Patterns

- **Server client** — Uses `@/libs/supabase/server` (not admin client), matching addresses and listings patterns
- **Client services** — Thin `@/libs/fetch` wrappers calling `/api/reports/*` routes
- **Duplicate detection** — Postgres unique constraint `(reporter_id, target_type, target_id)` enforced at DB level; server service catches error code `23505` and surfaces as 409

## Migration

`supabase/migrations/20260326000000_create_reports.sql`

## Future Work

- Report submission UI (modal with reason picker + optional description)
- Tanstack Query hooks for report submission and duplicate checking
- Admin dashboard for reviewing reports (bypasses RLS)
- Report count badges on listings/members/shops
- Automated moderation triggers (e.g., auto-hide after N reports)
