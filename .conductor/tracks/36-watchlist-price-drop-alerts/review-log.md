# Review Log — #36 Watchlist + Price Drop Alerts

## Review Cycle 1 — 2026-03-27

### Preflight: PASS (6/6)

### Code Review: 2 blocking, 2 warnings, 2 info

**Blocking findings fixed:**

1. **SCSS tokens** — `watchlist-page.module.scss` used nonexistent `--space-*`, `--font-size-{name}`, `--radius-md` tokens. Replaced with correct numbered tokens.
2. **detect_price_drop SECURITY DEFINER** — Trigger couldn't insert into RLS-protected `price_drop_notifications`. Added `SECURITY DEFINER` + `SET search_path = public`.

**Warnings accepted:**

1. POST /api/watchlist returns 201 (not 409) on duplicate — functionally correct, client handles both.
2. Hardcoded overlay `rgb()` values — no design system tokens for overlays exist.

### Result: PASS after fixes
