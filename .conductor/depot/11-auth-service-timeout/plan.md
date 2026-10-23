# Implementation Plan: #11 — Add 8-second AbortController timeout to auth service functions

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Add timeout utility and apply to all auth service functions

**Goal:** Create the `withTimeout` helper and `AUTH_TIMEOUT_MS` constant, then wrap all five in-scope auth functions with timeout logic
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 1.1: Create withTimeout helper and AUTH_TIMEOUT_MS constant

Add a `AUTH_TIMEOUT_MS = 8000` constant and a generic `withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>` helper at the top of the auth services file. The helper uses `Promise.race` between the original promise and a timeout promise that rejects with `new Error("Something went wrong. Check your connection and try again.")` after `ms` milliseconds. The timeout promise must clean up its timer when the original promise settles first (use `finally` to call `clearTimeout`).
**Files:** `src/features/auth/services/auth.ts`
**AC:** `withTimeout` is exported (for testing) or defined at module scope; a promise that resolves in <8s returns its value; a promise that takes >8s rejects with the exact message "Something went wrong. Check your connection and try again."
**Expert Domains:** nextjs

### Task 1.2: Apply withTimeout to Supabase client functions using Promise.race

Wrap the Supabase client call in `login`, `forgotPassword`, `resetPassword`, and `resendVerification` with the `withTimeout` helper. Each function should pass its existing Supabase promise to `withTimeout(promise, AUTH_TIMEOUT_MS)`. Do NOT use AbortController for these — the `Promise.race` pattern inside `withTimeout` is the correct approach since the Supabase JS client does not accept an AbortSignal.
**Files:** `src/features/auth/services/auth.ts`
**AC:** All four Supabase-backed functions use `withTimeout`; existing error handling (throw on `error`) still works; `logout` and `getUserProfile` remain unchanged
**Expert Domains:** supabase, nextjs

### Task 1.3: Apply AbortController timeout to the register function

Add an `AbortController` with an 8-second `setTimeout` to the `register` function. Pass `signal` to the `fetch()` options. On `AbortError`, catch and re-throw with the standard timeout message "Something went wrong. Check your connection and try again." Clean up the timer in a `finally` block.
**Files:** `src/features/auth/services/auth.ts`
**AC:** `register` passes `signal` to `fetch()`; an aborted fetch throws the exact timeout message; normal fast calls are unaffected; the timer is cleared after the fetch completes
**Expert Domains:** nextjs

## Phase 2: Add unit tests and update documentation

**Goal:** Verify timeout behavior with unit tests and update the auth feature CLAUDE.md
**Verify:** `pnpm test:run && pnpm build`

### Task 2.1: Write unit tests for timeout behavior

Create `src/features/auth/services/__tests__/auth.test.ts` with tests covering: (1) `withTimeout` resolves normally for fast promises, (2) `withTimeout` rejects with the exact timeout message for slow promises, (3) `register` uses AbortController signal (mock `fetch` to delay), (4) `login` times out when Supabase is slow (mock `createClient`), (5) `logout` and `getUserProfile` are NOT wrapped with timeout. Use `vi.useFakeTimers()` to control time advancement. Follow the existing test patterns: `// @vitest-environment node`, import from `vitest`, use `describe`/`it`/`expect`.
**Files:** `src/features/auth/services/__tests__/auth.test.ts`
**AC:** All tests pass with `pnpm test:run`; tests cover both the fast-resolve and timeout-reject paths; the exact error message string is asserted
**Expert Domains:** nextjs

### Task 2.2: Update auth feature CLAUDE.md with timeout documentation

Add a "Timeout Handling" section to `src/features/auth/CLAUDE.md` under "Security" documenting: the 8-second timeout on all auth service functions except `logout` and `getUserProfile`, the `withTimeout` helper using `Promise.race`, the `AbortController` approach for `register`'s `fetch()`, and the standard error message.
**Files:** `src/features/auth/CLAUDE.md`
**AC:** CLAUDE.md documents timeout behavior, lists which functions have timeouts, and mentions both the `Promise.race` and `AbortController` patterns
