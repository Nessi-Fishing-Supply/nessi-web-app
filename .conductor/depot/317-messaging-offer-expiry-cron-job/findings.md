# Review Findings — #317

## [W] W1: Supabase errors silently swallowed in try/catch

The Supabase JS client returns `{ data, error }` instead of throwing. The `try/catch` block around message insertion and thread update is a no-op for database failures. Should check `error` property and log/continue.

**File:** `src/features/messaging/services/offers-server.ts`, lines 377-396
**Fix:** Replace try/catch with explicit error checking pattern

## [W] W2: Cron schedule may be too infrequent for offer expiry

Daily schedule means expired offers could sit in stale state up to 24h. Known Hobby plan constraint. Add note to launch checklist for Pro plan upgrade.

**File:** `vercel.json`
**Fix:** Add launch checklist item

## [I] I1: Consistent `now` timestamp across batch

The `now` variable is computed once before the loop — all threads get the same `last_message_at`. Intentional for batch consistency.

## [I] I2: No logging in cron route

Consistent with price-drops cron pattern. Could add console.log for Vercel function logs.
