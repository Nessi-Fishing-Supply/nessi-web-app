# Implementation Plan: #158 — feat(auth): email change — API route for duplicate email pre-check

## Overview
2 phases, 4 total tasks
Estimated scope: small

## Phase 1: API Route and Service Function
**Goal:** Create the `POST /api/auth/check-email` route and add the `checkEmailAvailable` client-side service function
**Verify:** `pnpm build`

### Task 1.1: Create the check-email API route
Create `POST /api/auth/check-email` following the same patterns as `/api/auth/register` and `/api/auth/delete-account`. The route should: (1) verify the user is authenticated using the server client's `getUser()`, returning 401 if no session; (2) parse and validate the email from the JSON body using the same `EMAIL_REGEX` pattern from `src/features/auth/validations/server.ts`, returning 400 for missing or malformed email; (3) use the admin client's `auth.listUsers()` to check if any user exists with that email, returning `{ available: false, error: 'DUPLICATE_EMAIL' }` with 409 if found, or `{ available: true }` with 200 if not. Use the shared `AUTH_CACHE_HEADERS` from `src/libs/api-headers.ts`. Wrap in try/catch returning 500 on unexpected errors.
**Files:** `src/app/api/auth/check-email/route.ts`
**AC:**
- Route returns 401 with `{ error: 'Unauthorized' }` when no session is present
- Route returns 400 with `{ error: 'Email is required' }` or `{ error: 'Invalid email format' }` for bad input
- Route returns 409 with `{ available: false, error: 'DUPLICATE_EMAIL' }` when email is already registered
- Route returns 200 with `{ available: true }` when email is not registered
- All responses include `Cache-Control: private, no-store` header
- `pnpm build` passes
**Expert Domains:** supabase, nextjs

### Task 1.2: Add checkEmailAvailable service function
Add a `checkEmailAvailable` function to `src/features/auth/services/auth.ts` following the same `fetch` + `AbortController` timeout pattern used by the existing `register` function. The function should accept `{ email: string }`, POST to `/api/auth/check-email`, and return the parsed JSON response. On non-ok responses, throw an `Error` with the `error` field from the response body. On abort/timeout, throw the standard timeout message. Export the function.
**Files:** `src/features/auth/services/auth.ts`
**AC:**
- `checkEmailAvailable` is exported from `src/features/auth/services/auth.ts`
- Function accepts `{ email: string }` and returns a promise
- Uses `AbortController` with `AUTH_TIMEOUT_MS` timeout (matching `register` pattern)
- Throws on non-ok responses with the server error message
- Throws the standard timeout message on abort
- `pnpm build` passes
**Expert Domains:** nextjs

## Phase 2: Tests
**Goal:** Add unit tests for the API route and service function following established test patterns
**Verify:** `pnpm test:run`

### Task 2.1: Add API route tests
Create tests for the check-email route following the pattern in `src/app/api/auth/register/__tests__/route.test.ts`. Mock `@/libs/supabase/server` (for `createClient` returning a mock with `auth.getUser`) and `@/libs/supabase/admin` (for `createAdminClient` returning a mock with `auth.listUsers`). Test all four response paths: 401 (no session), 400 (missing/invalid email), 409 (duplicate), and 200 (available). Also test the 500 catch path.
**Files:** `src/app/api/auth/check-email/__tests__/route.test.ts`
**AC:**
- Test file uses `// @vitest-environment node` directive
- Tests cover: 401 unauthenticated, 400 missing email, 400 invalid email format, 409 duplicate email, 200 available email, 500 unexpected error
- All tests pass with `pnpm test:run`
**Expert Domains:** supabase, nextjs

### Task 2.2: Add service function tests
Add tests for `checkEmailAvailable` to `src/features/auth/services/__tests__/auth.test.ts` following the existing test patterns in that file (e.g., the `register` describe block which tests fetch calls, abort signals, and error handling). Add a new `describe('checkEmailAvailable', ...)` block with tests for: successful 200 response, 409 duplicate error, other error responses, and timeout/abort behavior.
**Files:** `src/features/auth/services/__tests__/auth.test.ts`
**AC:**
- New `describe('checkEmailAvailable')` block exists in the test file
- Tests cover: 200 available response, 409 duplicate error thrown, other error responses thrown, abort/timeout behavior
- All existing tests continue to pass
- All new tests pass with `pnpm test:run`
**Expert Domains:** nextjs
