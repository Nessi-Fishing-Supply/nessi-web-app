# Flags Feature

## Purpose

User-generated content and behavior flags. Allows authenticated users to flag listings, members, shops, or messages for review by the platform. The UI says "Report this..." but the codebase uses "flags" to avoid ambiguity with data reports.

## Database Schema

### Table: `flags`

| Column      | Type             | Constraints                                        |
| ----------- | ---------------- | -------------------------------------------------- |
| id          | UUID             | PK, default `gen_random_uuid()`                    |
| reporter_id | UUID             | NOT NULL, FK -> `auth.users(id)` ON DELETE CASCADE |
| target_type | flag_target_type | NOT NULL                                           |
| target_id   | UUID             | NOT NULL (polymorphic -- no FK constraint)         |
| reason      | flag_reason      | NOT NULL                                           |
| description | TEXT             | Nullable -- optional user-provided details         |
| status      | flag_status      | NOT NULL, default `'pending'`                      |
| created_at  | TIMESTAMPTZ      | NOT NULL, default `NOW()`                          |

**Unique constraint:** `(reporter_id, target_type, target_id)` -- one flag per user per target.

### Enums

- **flag_reason:** `spam`, `prohibited_item`, `counterfeit`, `inappropriate_content`, `off_platform_transaction`, `harassment`, `other`
- **flag_target_type:** `listing`, `member`, `shop`, `message`
- **flag_status:** `pending`, `reviewed`, `resolved`, `dismissed`

### Indexes

- `flags_reporter_id_idx` -- for querying a user's flags
- `flags_target_type_target_id_idx` -- for querying all flags on a target

### RLS Policies

| Policy                                   | Operation | Rule                       |
| ---------------------------------------- | --------- | -------------------------- |
| Authenticated users can insert own flags | INSERT    | `reporter_id = auth.uid()` |
| Authenticated users can view own flags   | SELECT    | `reporter_id = auth.uid()` |

No UPDATE or DELETE policies -- users cannot modify or retract flags. Admin operations bypass RLS via the admin client.

## Polymorphic Target Pattern

`target_id` is a UUID that references different tables depending on `target_type`:

| target_type | Referenced table |
| ----------- | ---------------- |
| listing     | `listings.id`    |
| member      | `members.id`     |
| shop        | `shops.id`       |
| message     | (future table)   |

There is intentionally **no FK constraint** on `target_id`. The application layer resolves the target based on `target_type`. This means:

- Deleting a target (e.g., a listing) does NOT cascade-delete its flags -- flags persist for moderation history
- The application must validate that `target_id` exists for the given `target_type` before inserting

## Architecture

- **types/flag.ts** -- Database-derived types: `Flag` (Row), `FlagInsert`, `FlagReason`, `FlagTargetType`, `FlagStatus`, `FlagFormData`, `DuplicateCheckParams`
- **constants/reasons.ts** -- `FLAG_REASONS` (7 entries with value/label/description), `FLAG_TARGET_TYPES` (4 entries with value/label)
- **validations/flag.ts** -- Yup schema validating: `target_type` (oneOf 4 types), `target_id` (UUID), `reason` (oneOf 7 reasons), `description` (optional, max 1000 chars)
- **services/flag-server.ts** -- Server-side Supabase queries: `createFlagServer` (inserts flag, catches 23505 unique constraint for duplicates), `getExistingFlagServer` (returns flag or null via `maybeSingle()`)
- **services/flag.ts** -- Client-side fetch wrappers: `submitFlag` (POST /api/flags), `checkDuplicateFlag` (GET /api/flags/check)
- **hooks/use-flags.ts** -- Tanstack Query hooks: `useCheckDuplicateFlag(target_type, target_id)` (query, key: `['flags', 'check', target_type, target_id]`, enabled guard), `useSubmitFlag({ onSuccess, onDuplicate, onError })` (mutation, 409 detection via `FetchError.status`, invalidates `['flags', 'check']`)
- **hooks/use-flag-target.ts** -- Convenience hook: `useFlagTarget({ target_type, target_id })` -- composes duplicate pre-check + open/close state; `openFlagSheet()` shows toast if already reported, otherwise opens the sheet
- **components/flag-bottom-sheet/** -- `FlagBottomSheet` component: wraps `BottomSheet` primitive, 7-reason radio list (from `FLAG_REASONS`), optional description textarea (required for "Other", max 1000 chars with live counter), submit button with loading state, toast feedback on success/duplicate/error, form resets on close

## API Routes

| Method | Route              | Handler                 | Status Codes    | Description                                            |
| ------ | ------------------ | ----------------------- | --------------- | ------------------------------------------------------ |
| POST   | `/api/flags`       | `createFlagServer`      | 201/400/401/409 | Create a flag (409 on duplicate per unique constraint) |
| GET    | `/api/flags/check` | `getExistingFlagServer` | 200/400/401     | Check if user already flagged a target (`{ exists }`)  |

## Public API

Consuming features (listings, members, shops) import from the barrel export:

```ts
import { FlagBottomSheet, FlagTrigger, useFlagTarget } from '@/features/flags';
```

### FlagTrigger

Reusable client component that renders a flag button + FlagBottomSheet. Handles auth gating, self-entity hiding, and duplicate pre-check.

| Prop          | Type           | Description                                |
| ------------- | -------------- | ------------------------------------------ |
| currentUserId | string \| null | Authenticated user ID (null = hidden)      |
| isOwnEntity   | boolean        | Whether viewing own entity (true = hidden) |
| targetType    | FlagTargetType | What is being flagged                      |
| targetId      | string         | UUID of the target entity                  |

**Integrated on:** listing detail page, member profile page, shop profile page.

### FlagBottomSheet

| Prop       | Type           | Description                    |
| ---------- | -------------- | ------------------------------ |
| isOpen     | boolean        | Controls sheet visibility      |
| onClose    | () => void     | Called when sheet should close |
| targetType | FlagTargetType | What is being flagged          |
| targetId   | string         | UUID of the target entity      |

### useFlagTarget

```ts
const { openFlagSheet, isOpen, close, isDuplicate, isChecking } = useFlagTarget({
  target_type: 'listing',
  target_id: listingId,
});
```

- Pre-fetches duplicate check on mount (query enabled when params provided)
- `openFlagSheet()` -- shows "Already reported" toast if duplicate exists, otherwise opens the sheet
- Pass `isOpen` and `close` to `FlagBottomSheet` props

### Duplicate Pre-Check Flow

1. `useFlagTarget` enables `useCheckDuplicateFlag` query on mount (pre-fetch)
2. User taps "Report" -> `openFlagSheet()` checks cached query result instantly
3. If duplicate exists -> toast, no sheet. If not -> sheet opens.
4. If user submits and gets 409 (race condition) -> `useSubmitFlag` shows duplicate toast

## Key Patterns

- **Server client** -- Uses `@/libs/supabase/server` (not admin client), matching addresses and listings patterns
- **Client services** -- Thin `@/libs/fetch` wrappers calling `/api/flags/*` routes
- **Duplicate detection** -- Postgres unique constraint `(reporter_id, target_type, target_id)` enforced at DB level; server service catches error code `23505` and surfaces as 409
- **Radio list** -- Follows `ConditionSelector` pattern: visually hidden native radio inputs with custom styled circles, `fieldset`/`legend` for a11y
- **409 error routing** -- `useSubmitFlag` checks `error instanceof FetchError && error.status === 409` to route to `onDuplicate` callback, matching the shops feature pattern
- **Form reset on close** -- State (selectedReason, description) resets when sheet closes, preventing stale data on reopen

## Migrations

- `supabase/migrations/20260326000000_create_reports.sql` -- original table creation (as "reports")
- `supabase/migrations/20260326100000_rename_reports_to_flags.sql` -- rename to "flags"

## Future Work

- Admin dashboard for reviewing flags (bypasses RLS)
- Flag count badges on listings/members/shops
- Automated moderation triggers (e.g., auto-hide after N flags)
