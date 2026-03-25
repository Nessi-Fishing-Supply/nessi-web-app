# Review Log — #238

## Review 1 (2026-03-24)

### Preflight: 6/6 passed

- TypeScript: pass
- ESLint: pass (0 errors, 7 pre-existing warnings)
- Stylelint: pass
- Prettier: pass
- Tests: pass (521 tests)
- Build: pass

### Code Review Findings

- [B] ShopId mismatch between URL param and X-Nessi-Context header — privilege escalation vector
- [W] Permission level comparison duplicates check-permission.ts logic
- [W] Missing test for permission level 'none' on a feature
- [I] Test assertions could verify response body content
- [I] Consider adding JSDoc to requireShopPermission
- [I] The request parameter is only used for the context header

### Decision: needs_fixes (1 blocking, 2 warnings)

## Fix Cycle 1 (2026-03-24)

### Fixes Applied

- [B] FIXED: Added `expectedShopId` option to `requireShopPermission` — validates context header shopId matches URL param. Members route now passes `{ expectedShopId: shopId }`. Added test for mismatch case.
- [W] FIXED: Extracted `meetsLevel()` utility to `check-permission.ts` — `shop-permissions.ts` now imports it instead of duplicating `PERMISSION_LEVELS` map. Added 8 unit tests for `meetsLevel`.
- [W] FIXED: Added test for `members` feature with `'none'` permission level when `'view'` is required.

### Verification: 531 tests pass, build clean
