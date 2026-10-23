# Implementation Plan: #12 — Redirect authenticated users away from auth pages in proxy.ts

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Add authenticated user redirect in proxy.ts

**Goal:** Redirect authenticated users away from guarded auth pages (starting with `/auth/forgot-password`) while keeping `/auth/callback` accessible to all users.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 1.1: Add guarded auth paths array and redirect logic to proxy.ts

Add a `GUARDED_AUTH_PATHS` array containing `/auth/forgot-password` and a new conditional block after the existing unauthenticated dashboard redirect. The new block checks: if `user` is truthy AND `request.nextUrl.pathname` matches any path in the array, return a `NextResponse.redirect` to `/`. This reuses the existing `user` object from the `getUser()` call on line 26. The array pattern makes it trivial to add future auth pages without changing logic.

**Files:** `src/proxy.ts`
**AC:**

- `GUARDED_AUTH_PATHS` array exists with `/auth/forgot-password` as the sole entry
- Authenticated user navigating to `/auth/forgot-password` receives a 302 redirect to `/`
- Unauthenticated user navigating to `/auth/forgot-password` is not redirected
- `/auth/callback` is NOT in the guarded array and remains accessible to all users
- Existing `/dashboard/*` unauthenticated redirect logic is unchanged
- New redirect block is placed after the dashboard guard and before `return response`
  **Expert Domains:** nextjs

### Task 1.2: Update auth CLAUDE.md to document the new redirect behavior

Add a bullet point to the "Session Flow" section in the auth feature CLAUDE.md documenting that `proxy.ts` redirects authenticated users away from guarded auth pages (currently `/auth/forgot-password`). Also update the "Key Patterns" section's route protection bullet to mention both directions of the guard.

**Files:** `src/features/auth/CLAUDE.md`
**AC:**

- Session Flow section mentions authenticated user redirect from auth pages
- Key Patterns route protection bullet covers both unauthenticated-from-dashboard and authenticated-from-auth-pages guards
- `/auth/callback` exception is documented

## Phase 2: Add unit tests for proxy redirect behavior

**Goal:** Add unit tests verifying both the existing unauthenticated dashboard redirect and the new authenticated auth page redirect, ensuring no regressions.
**Verify:** `pnpm test:run && pnpm build`

### Task 2.1: Create proxy unit test file with redirect behavior tests

Create `src/__tests__/proxy.test.ts` following the project's existing test patterns (Vitest, `vi.mock`, `// @vitest-environment node`). Mock `@supabase/ssr`'s `createServerClient` to control the `getUser()` return value. Mock `next/server`'s `NextResponse` and `NextRequest` to inspect redirect calls. Test cases:

1. Authenticated user at `/auth/forgot-password` is redirected to `/`
2. Unauthenticated user at `/auth/forgot-password` is not redirected
3. Authenticated user at `/auth/callback` is not redirected
4. Unauthenticated user at `/auth/callback` is not redirected
5. Unauthenticated user at `/dashboard` is redirected to `/` (existing behavior)
6. Authenticated user at `/dashboard` is not redirected (existing behavior)

**Files:** `src/__tests__/proxy.test.ts`
**AC:**

- All 6 test cases pass
- Mocks follow the same pattern as `src/features/auth/services/__tests__/auth.test.ts`
- Uses `// @vitest-environment node` directive
- `pnpm test:run` passes with all tests green
  **Expert Domains:** nextjs
