# Implementation Plan: #157 — Email Change Service Functions

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Types, Validation Schema, and Service Functions

**Goal:** Add the `ChangeEmailData` type, `changeEmailSchema` validation, three new service functions, and extend the OTP type union across services, types, and OtpInput component
**Verify:** `pnpm build`

### Task 1.1: Add ChangeEmailData type and extend OtpVerificationData type union

Add the `ChangeEmailData` interface to the auth types file and extend the `OtpVerificationData` type union to include `'email_change'`.

In `src/features/auth/types/auth.ts`, add:

```ts
export interface ChangeEmailData {
  newEmail: string;
}
```

In `src/features/auth/types/forms.ts`, change the `type` field in `OtpVerificationData` from `'signup' | 'recovery'` to `'signup' | 'recovery' | 'email_change'`.

**Files:** `src/features/auth/types/auth.ts`, `src/features/auth/types/forms.ts`
**AC:** `ChangeEmailData` interface exists with a `newEmail: string` field. `OtpVerificationData.type` accepts `'email_change'` without TypeScript errors. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.2: Add changeEmailSchema Yup validation

Add a `changeEmailSchema` to the auth validations file. Follow the existing pattern of the other schemas in the file. The schema validates a single `email` field: required, valid email format.

**Files:** `src/features/auth/validations/auth.ts`
**AC:** `changeEmailSchema` exists and validates `{ email: string }` with required + email format rules. Rejects missing email and invalid format. `pnpm build` passes.
**Expert Domains:** nextjs

### Task 1.3: Add changeEmail, verifyEmailChange, and resendEmailChangeCode service functions and extend verifyOtp type

Modify `src/features/auth/services/auth.ts` to:

1. Extend the `verifyOtp` function's `type` parameter from `'signup' | 'recovery'` to `'signup' | 'recovery' | 'email_change'`.
2. Add `changeEmail(data: { newEmail: string })` that calls `supabase.auth.updateUser({ email: data.newEmail })` wrapped with `withTimeout`.
3. Add `verifyEmailChange(data: { email: string; token: string })` that delegates to `verifyOtp` with `type: 'email_change'`.
4. Add `resendEmailChangeCode(data: { newEmail: string })` that calls `supabase.auth.updateUser({ email: data.newEmail })` wrapped with `withTimeout` (Supabase resends the OTP on re-call).

Follow the existing patterns: use `createClient()`, `withTimeout(..., AUTH_TIMEOUT_MS)`, throw on error, return a success message object.

**Files:** `src/features/auth/services/auth.ts`
**AC:** All three functions exist and are exported. `verifyOtp` accepts `'email_change'` type. `changeEmail` and `resendEmailChangeCode` call `supabase.auth.updateUser({ email })` with timeout. `verifyEmailChange` delegates to `verifyOtp`. `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 1.4: Extend OtpInput component type prop to include email_change

Modify the `OtpInputProps` interface in the OtpInput component to extend the `type` prop union from `'signup' | 'recovery'` to `'signup' | 'recovery' | 'email_change'`. No behavioral changes — only the type union is widened.

**Files:** `src/features/auth/components/otp-input/index.tsx`
**AC:** `OtpInput` accepts `type="email_change"` without TypeScript errors. Existing behavior for `'signup'` and `'recovery'` is unchanged. `pnpm typecheck` passes.
**Expert Domains:** nextjs

## Phase 2: Unit Tests

**Goal:** Add unit tests for the three new service functions and the changeEmailSchema validation
**Verify:** `pnpm test:run`

### Task 2.1: Add unit tests for changeEmail, verifyEmailChange, resendEmailChangeCode, and changeEmailSchema

Add tests to the existing test files following established patterns:

In `src/features/auth/services/__tests__/auth.test.ts`, add three new `describe` blocks:

- `changeEmail`: test success (calls `updateUser` with email, returns message), test error (throws Supabase error message), test timeout (times out after `AUTH_TIMEOUT_MS`)
- `verifyEmailChange`: test success (delegates to `supabase.auth.verifyOtp` with `type: 'email_change'`), test error (throws on Supabase error)
- `resendEmailChangeCode`: test success (calls `updateUser` with email, returns message), test error (throws Supabase error message)
- Also add a test in the existing `verifyOtp` describe block confirming it works with `type: 'email_change'`

In `src/features/auth/validations/auth.test.ts`, add a `changeEmailSchema` describe block:

- Validates correct email input
- Rejects invalid email format
- Rejects missing/empty email

Follow the existing mock patterns: mock `@/libs/supabase/client`, use `vi.useFakeTimers()` for timeout tests, use `vi.mocked(createClient)` to set up mock Supabase instances.

**Files:** `src/features/auth/services/__tests__/auth.test.ts`, `src/features/auth/validations/auth.test.ts`
**AC:** All new tests pass via `pnpm test:run`. Tests cover success, error, and timeout cases for service functions. Tests cover valid, invalid email, and missing email for the schema. No existing tests are broken.
**Expert Domains:** nextjs
