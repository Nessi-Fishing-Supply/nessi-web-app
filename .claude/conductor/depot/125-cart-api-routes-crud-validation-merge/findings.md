# Preflight Findings — #125

## [W] POST /api/cart missing listingId input validation
- **Check:** Code Review
- **Error:** `{ listingId }` destructured from `req.json()` without checking it exists or is a string. Undefined listingId produces misleading 404 instead of 400.
- **File:** `src/app/api/cart/route.ts` (POST handler, line ~50)
- **Fix:** Add `if (!listingId || typeof listingId !== 'string')` guard returning 400

## [W] No JSON parse error handling on req.json() calls
- **Check:** Code Review
- **Error:** Invalid JSON body throws SyntaxError caught by generic 500 handler — misleading error message. Affects POST /api/cart and POST /api/cart/merge.
- **File:** `src/app/api/cart/route.ts`, `src/app/api/cart/merge/route.ts`
- **Fix:** This matches the reference pattern (listings/[id]/status/route.ts has same gap). Codebase-wide debt, not cart-specific. Skip for this ticket.

## [I] Unused `req` parameter in PATCH expiry route
- Required by Next.js function signature for dynamic routes needing context. Not an issue.

## [I] Double Supabase client creation per request
- Established codebase pattern. Not a regression.
