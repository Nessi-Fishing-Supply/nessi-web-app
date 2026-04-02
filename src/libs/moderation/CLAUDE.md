# Moderation Module

Centralized text moderation for all user-generated content. Lives in `src/libs/moderation/` — shared infrastructure, not a feature domain.

## Module Boundary

`src/libs/moderation/` must **not** import from `src/features/`. It is consumed by API routes in `src/app/api/` and may be used by any server-side code.

## API

### `scanText(content, context): TextScanResult`

Pure function — no side effects, no DB calls. Runs the content through four checks in order:

1. **block** — matches a word in `EXPLICIT_BLOCKLIST` (whole-word, case-insensitive). Returns `action: 'block'`, `filteredContent: null`.
2. **redact** — detects PII (phone, email, street address, credit card via Luhn). Returns `action: 'redact'`, `filteredContent` with `[removed]` substitutions.
3. **nudge_off_platform** — detects attempts to move the transaction outside Nessi (e.g., "PayPal", "text me"). Returns `action: 'nudge_off_platform'`.
4. **nudge_negotiation** — detects informal price negotiation (e.g., "would you take $X"). Returns `action: 'nudge_negotiation'`.
5. **pass** — no match. Returns `action: 'pass'`, `filteredContent` is the original string.

`context` is one of `'listing' | 'member' | 'shop' | 'message'` and is passed through to the result for caller use.

### `logModerationFlag(params): Promise<void>`

Server-side only. Inserts a row into `moderation_flags` using the admin client. Fire-and-forget — errors are swallowed and logged to console. Only called for `block` and `redact` actions (not nudges).

## Database Schema

### `moderation_flags` table

| Column             | Type        | Constraints                                    |
| ------------------ | ----------- | ---------------------------------------------- |
| `id`               | UUID        | PK, `gen_random_uuid()`                        |
| `member_id`        | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`   |
| `context`          | TEXT        | NOT NULL — `'listing'`, `'member'`, `'shop'`, `'message'` |
| `action`           | TEXT        | NOT NULL — `'block'` or `'redact'`             |
| `original_content` | TEXT        | NOT NULL                                       |
| `filtered_content` | TEXT        | NULL — post-redaction content when applicable  |
| `source_id`        | UUID        | NULL — ID of the source record (listing, message, etc.) |
| `created_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                      |

RLS: insert via service role only (admin client). No user-facing reads.

## Integration Points

| Route | Context | block | redact | nudge |
| ----- | ------- | ----- | ------ | ----- |
| `POST /api/listings` / `PATCH /api/listings/[id]` | `'listing'` | 400 error, reject save | save redacted content, log flag | treated as `pass` — content saved as-is |
| `PATCH /api/members/[id]` | `'member'` | 400 error | save redacted content, log flag | treated as `pass` |
| `PATCH /api/shops/[id]` | `'shop'` | 400 error | save redacted content, log flag | treated as `pass` |
| `POST /api/messaging/threads/[id]/messages` | `'message'` | 400 error, message not sent | save redacted content, log flag | insert a system nudge message into the thread, still deliver the user's message |

### Nudge behavior in messaging

When `action` is `nudge_off_platform` or `nudge_negotiation`, the API route inserts a system message (type `'system'`) into the thread with `NUDGE_OFF_PLATFORM` or `NUDGE_NEGOTIATION` as the content. The user's original message is still persisted.

## Constants

- `EXPLICIT_BLOCKLIST` — array of slur strings checked against word boundaries
- `NUDGE_OFF_PLATFORM` — user-facing string for off-platform nudge system messages
- `NUDGE_NEGOTIATION` — user-facing string for negotiation nudge system messages
