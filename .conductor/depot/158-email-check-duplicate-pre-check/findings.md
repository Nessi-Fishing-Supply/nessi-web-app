# Review Findings: #158

## [B] listUsers() fetches ALL users without pagination

`admin.auth.admin.listUsers()` returns only the first page. Must filter or use single-record lookup.
**Fix:** Use `admin.auth.admin.listUsers({ filter: email })` or query directly.

## [W] Duplicated EMAIL_REGEX instead of importing from shared validation

Route defines its own regex identical to `server.ts`. Should import from shared location.
**Fix:** Export `EMAIL_REGEX` from `server.ts` and import in the route.

## [W] Auth feature CLAUDE.md not updated

Missing `checkEmailAvailable` in services list, test counts, and API routes section.
**Fix:** Update auth CLAUDE.md.

## [W] Register route uses inline AUTH_HEADERS (not part of #158 scope)

Out of scope — note for future cleanup.

## [I] Route test does not verify Cache-Control header

Minor — header is set but not asserted in tests.

## [I] listError path not tested

Minor — only tested via outer try/catch, not the specific branch.
