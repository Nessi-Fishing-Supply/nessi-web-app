# Implementation Plan: #14 — Add post-login onboarding gate infrastructure

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Foundation — onboarding service and type cleanup

**Goal:** Create the stub onboarding check service and remove the unused `redirectUrl` prop from the shared auth form types.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create onboarding check service

Create a new service file with the async `checkOnboardingComplete` stub that always returns `{ isComplete: true }`. Include a TODO comment explaining that the real implementation will query the profiles table once it exists. Follow the same module pattern as the existing `src/features/auth/services/auth.ts`.
**Files:** `src/features/auth/services/onboarding.ts`
**AC:** The file exports an async function `checkOnboardingComplete` that returns `Promise<{ isComplete: boolean }>` and currently resolves to `{ isComplete: true }`. A TODO comment is present indicating future profiles-table integration.
**Expert Domains:** nextjs

### Task 1.2: Remove redirectUrl from AuthFormProps

Remove the `redirectUrl` property from the `AuthFormProps` interface in the shared auth form types file. This prop is only consumed by `LoginForm` (confirmed via grep) and will no longer be needed after the login form is updated.
**Files:** `src/features/auth/types/forms.ts`
**AC:** `AuthFormProps` no longer contains a `redirectUrl` property. The file still exports all other types unchanged (`LoginFormData`, `RegisterFormData`, `ForgotPasswordFormData`, `AuthFormResponse`).
**Expert Domains:** nextjs

## Phase 2: Integration and tests — update LoginForm, navbar, and add tests

**Goal:** Wire the onboarding check into the login flow, remove the hard redirect from LoginForm, clean up the navbar prop, and add unit tests.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test:run`

### Task 2.1: Update LoginForm to use onboarding check instead of hard redirect

In `LoginForm`, remove the `redirectUrl` prop (and its default value), remove the `window.location.href = redirectUrl` line, and instead import and call `checkOnboardingComplete` after a successful login. If `isComplete` is false, redirect to `/onboarding` via `window.location.href`. If `isComplete` is true, call `onSuccess?.call(null, data)` to close the modal and keep the user on the current page. The `useRouter` import can also be evaluated — keep it only if still needed for `handleForgotPassword`.
**Files:** `src/features/auth/components/login-form/index.tsx`
**AC:** (1) `redirectUrl` prop is gone from `LoginFormProps`. (2) After successful login, `checkOnboardingComplete` is called. (3) When `isComplete` is true, `onSuccess` callback fires and no redirect occurs. (4) When `isComplete` is false, `window.location.href` is set to `/onboarding`. (5) No reference to `window.location.href = redirectUrl` remains. (6) The `useRouter` import remains (it is used by `handleForgotPassword`).
**Expert Domains:** nextjs

### Task 2.2: Remove redirectUrl prop from navbar LoginForm usage

In the navbar component, remove the `redirectUrl="/dashboard"` prop from the `<LoginForm>` JSX. No other changes needed since `handleLoginSuccess` already closes the modal correctly.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** The `<LoginForm>` element in the navbar no longer receives a `redirectUrl` prop. All other props (`onSuccess`, `onClose`, `onResendVerification`, `banner`) remain unchanged.
**Expert Domains:** nextjs

### Task 2.3: Add unit tests for onboarding service and LoginForm integration

Create a test file for the onboarding service that verifies `checkOnboardingComplete` returns `{ isComplete: true }`. Add a test file (or extend existing) for LoginForm that verifies: (a) after successful login the `onSuccess` callback is invoked, (b) `checkOnboardingComplete` is called during the login flow. Follow the existing test patterns — use `vi.mock` for service dependencies, `@testing-library/react` for component tests, and the `// @vitest-environment node` directive for pure service tests.
**Files:** `src/features/auth/services/__tests__/onboarding.test.ts`, `src/features/auth/components/login-form/__tests__/index.test.tsx`
**AC:** (1) `onboarding.test.ts` passes with at least one test asserting the return value is `{ isComplete: true }` and that the function is async. (2) `login-form/__tests__/index.test.tsx` passes with tests covering: successful login calls `checkOnboardingComplete`, successful login with `isComplete: true` calls the `onSuccess` callback, and no hard redirect to `/dashboard` occurs. (3) All tests pass via `pnpm test:run`.
**Expert Domains:** nextjs
