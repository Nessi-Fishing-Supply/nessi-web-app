# Review Findings: #180

## Preflight

All 6 checks pass (typecheck, lint, stylelint, prettier, tests, build).

## Code Review

### [W] Stale path reference in Stripe module CLAUDE.md

- **File:** `src/libs/stripe/CLAUDE.md` line 24
- **Issue:** References webhook handler at `src/app/api/stripe/webhook/route.ts` but actual path is `src/app/api/webhooks/stripe/route.ts`
- **Fix:** Update the path

### [W] Race condition in deduplication — insertWebhookEvent can fail on duplicate key

- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Issue:** If Stripe delivers the same event twice concurrently, both pass the dedup check and one fails on unique constraint, returning 500 instead of 200
- **Fix:** Wrap insertWebhookEvent in try/catch that treats unique constraint errors as successful dedup (return 200)

### [W] markEventProcessed/markEventFailed silently succeed on zero-row updates

- **File:** `src/features/webhooks/services/event-logger.ts`
- **Issue:** Low risk — the event was just inserted moments before. Defensive logging would help.
- **Fix:** Defer — low priority, no immediate impact

### [I] WebhookEventUpdate type exported but unused

- Available for future use, no action needed.

### [I] No explicit `export const runtime = 'nodejs'` declaration

- Node.js is the default, no action needed.
