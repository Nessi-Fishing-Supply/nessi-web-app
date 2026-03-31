# Review Findings — #308

## Preflight

All 6 checks passed: typecheck, lint, stylelint, format, tests (583), build.

## Code Review

### [W] Zero-amount offer returns 500 instead of 400 — FIXED

- **Files:** `src/app/api/offers/route.ts`, `src/app/api/offers/[id]/counter/route.ts`
- **Issue:** `validateOfferAmount` throws `'Offer amount must be greater than zero'` which wasn't matched by error mapping
- **Fix:** Added `'greater than zero'` to BAD_REQUEST_MESSAGES (create route) and to the counter route's validation check

### [I] Partial substring matching for error classification

Accepted trade-off for thin API wrappers — consistent with existing messaging routes.

### [I] `amountCents` not type-validated at API layer

Consistent with existing codebase pattern — server services catch invalid types.

## Verdict

No blocking findings. One warning fixed. Implementation matches plan and coding standards.
