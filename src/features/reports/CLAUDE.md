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
- **hooks/use-reports.ts** — Tanstack Query hooks: `useCheckDuplicateReport(target_type, target_id)` (query, key: `['reports', 'check', target_type, target_id]`, enabled guard), `useSubmitReport({ onSuccess, onDuplicate, onError })` (mutation, 409 detection via `FetchError.status`, invalidates `['reports', 'check']`)
- **hooks/use-report-target.ts** — Convenience hook: `useReportTarget({ target_type, target_id })` — composes duplicate pre-check + open/close state; `openReportSheet()` shows toast if already reported, otherwise opens the sheet
- **components/report-bottom-sheet/** — `ReportBottomSheet` component: wraps `BottomSheet` primitive, 7-reason radio list (from `REPORT_REASONS`), optional description textarea (required for "Other", max 1000 chars with live counter), submit button with loading state, toast feedback on success/duplicate/error, form resets on close

## API Routes

| Method | Route                | Handler                   | Status Codes    | Description                                              |
| ------ | -------------------- | ------------------------- | --------------- | -------------------------------------------------------- |
| POST   | `/api/reports`       | `createReportServer`      | 201/400/401/409 | Create a report (409 on duplicate per unique constraint) |
| GET    | `/api/reports/check` | `getExistingReportServer` | 200/400/401     | Check if user already reported a target (`{ exists }`)   |

## Public API

Consuming features (listings, members, shops) import from the barrel export:

```ts
import { ReportBottomSheet, ReportTrigger, useReportTarget } from '@/features/reports';
```

### ReportBottomSheet

| Prop       | Type             | Description                    |
| ---------- | ---------------- | ------------------------------ |
| isOpen     | boolean          | Controls sheet visibility      |
| onClose    | () => void       | Called when sheet should close |
| targetType | ReportTargetType | What is being reported         |
| targetId   | string           | UUID of the target entity      |

### ReportTrigger

Reusable client component that renders a flag button + ReportBottomSheet. Handles auth gating, self-entity hiding, and duplicate pre-check.

| Prop          | Type             | Description                                |
| ------------- | ---------------- | ------------------------------------------ |
| currentUserId | string \| null   | Authenticated user ID (null = hidden)      |
| isOwnEntity   | boolean          | Whether viewing own entity (true = hidden) |
| targetType    | ReportTargetType | What is being reported                     |
| targetId      | string           | UUID of the target entity                  |

**Integrated on:** listing detail page, member profile page, shop profile page.

### useReportTarget

```ts
const { openReportSheet, isOpen, close, isDuplicate, isChecking } = useReportTarget({
  target_type: 'listing',
  target_id: listingId,
});
```

- Pre-fetches duplicate check on mount (query enabled when params provided)
- `openReportSheet()` — shows "Already reported" toast if duplicate exists, otherwise opens the sheet
- Pass `isOpen` and `close` to `ReportBottomSheet` props

### Duplicate Pre-Check Flow

1. `useReportTarget` enables `useCheckDuplicateReport` query on mount (pre-fetch)
2. User taps "Report" → `openReportSheet()` checks cached query result instantly
3. If duplicate exists → toast, no sheet. If not → sheet opens.
4. If user submits and gets 409 (race condition) → `useSubmitReport` shows duplicate toast

## Key Patterns

- **Server client** — Uses `@/libs/supabase/server` (not admin client), matching addresses and listings patterns
- **Client services** — Thin `@/libs/fetch` wrappers calling `/api/reports/*` routes
- **Duplicate detection** — Postgres unique constraint `(reporter_id, target_type, target_id)` enforced at DB level; server service catches error code `23505` and surfaces as 409
- **Radio list** — Follows `ConditionSelector` pattern: visually hidden native radio inputs with custom styled circles, `fieldset`/`legend` for a11y
- **409 error routing** — `useSubmitReport` checks `error instanceof FetchError && error.status === 409` to route to `onDuplicate` callback, matching the shops feature pattern
- **Form reset on close** — State (selectedReason, description) resets when sheet closes, preventing stale data on reopen

## Migration

`supabase/migrations/20260326000000_create_reports.sql`

## Future Work

- Admin dashboard for reviewing reports (bypasses RLS)
- Report count badges on listings/members/shops
- Automated moderation triggers (e.g., auto-hide after N reports)
