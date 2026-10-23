# Review Findings — #36 Watchlist + Price Drop Alerts

## Preflight: 6/6 passed

- TypeScript: pass (6.5s)
- ESLint: pass (11.3s, 2 pre-existing warnings)
- Stylelint: pass (1.7s)
- Prettier: pass (7.1s)
- Tests: pass (6.8s, 538 tests)
- Build: pass (15.3s)

## Code Review Findings

### [B] FIXED — Watchlist page SCSS uses nonexistent design tokens

`watchlist-page.module.scss` used `--space-*`, `--font-size-{name}`, and `--radius-md` tokens that don't exist. Replaced with correct numbered tokens (`--spacing-*`, `--font-size-{number}`, `--radius-300`).

### [B] FIXED — `detect_price_drop` trigger missing SECURITY DEFINER

The trigger function inserted into `price_drop_notifications` (service_role-only RLS) but ran as the calling user. Added `SECURITY DEFINER` and `SET search_path = public` to match the `update_watcher_count` pattern.

### [W] Accepted — POST /api/watchlist never returns 409 for duplicates

`addWatcherServer` catches `23505` and returns existing row (201). The plan specified 409. Accepted as-is — the client handles both correctly, and the behavior is functionally correct.

### [W] Accepted — Hardcoded `rgb(0 0 0 / 40%)` overlay colors

No overlay tokens exist in the design system. These are semi-transparent overlays on images — a common pattern that doesn't map to semantic color tokens.

### [I] Noted — Redundant `aria-label` on sold overlay div

Minor. The visible "Sold" text is sufficient for screen readers.

### [I] Noted — Per-card watch status requests (N+1 pattern)

Same pattern as the follows feature. Batch endpoint is a future optimization.
