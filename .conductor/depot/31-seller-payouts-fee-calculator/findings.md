# Review Findings — #31

## Preflight Results

- TypeScript: pass (7.6s)
- ESLint: pass (0 errors, 8 warnings — all pre-existing)
- Stylelint: pass
- Prettier: FIXED (4 files reformatted)
- Tests: pass (645 tests, 5.8s)
- Build: pass (15.7s)

## Code Review Findings

### [W] Missing CTA link/button on `/sell` page

The CTA section has copy but no actionable link. Add a link to registration.

### [W] Hardcoded `letter-spacing: 0.05em` in 3 SCSS files

Should use `--letter-spacing-300` or `--letter-spacing-400` token.

### [W] Payouts page checks `stripe_account_id` client-side

Should only check `is_stripe_connected` to avoid relying on sensitive field.

### [I] No pagination UI in PayoutHistory (plan-compliant, future iteration)

### [I] PendingBalance fetches all orders (intentional — escrow_status filter not available server-side)

### [I] Balance route has no-store cache vs payouts route has 5-min cache (plan-aligned)
