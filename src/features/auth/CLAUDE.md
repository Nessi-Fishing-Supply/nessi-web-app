# Auth Feature

## Overview

Authentication feature using Supabase Auth with cookie-based sessions via `@supabase/ssr`. Covers login, registration, 6-digit OTP code verification, and password reset. Users never leave the app — all verification happens inline via OTP input.

## Architecture

- **context.tsx** -- `AuthProvider` and `useAuth()` hook wrapping Supabase session state (client-side). Exposes `{ user, isAuthenticated, isLoading }`.
- **services/auth.ts** -- Client-side auth API functions with 8-second timeout protection: `login`, `register`, `logout`, `getUserProfile`, `forgotPassword`, `resetPassword`, `verifyOtp`, `resendOtp`, `changeEmail`, `verifyEmailChange`, `resendEmailChangeCode`. Also exports `withTimeout` helper and `AUTH_TIMEOUT_MS` constant.
- **types/auth.ts** -- Auth data interfaces: `RegisterData`, `LoginData`, `ResetPasswordData`, `ChangeEmailData`, `AuthResponse`
- **types/forms.ts** -- Form prop interfaces and form data types: `AuthFormProps<TData, TResponse>`, `LoginFormData`, `RegisterFormData`, `AuthFormResponse`
- **validations/auth.ts** -- Yup schemas for client-side form validation: `loginSchema`, `registerSchema`, `resetPasswordSchema`, `changeEmailSchema`
- **validations/server.ts** -- Pure-function validation for register API route (server-side, no Yup dependency): `validateRegisterInput()`

## Session Flow

1. `proxy.ts` refreshes Supabase sessions on every request via `getUser()` (server-side)
2. `proxy.ts` redirects unauthenticated users away from `/dashboard/*` routes
3. `AuthProvider` listens to `onAuthStateChange` for client-side state
4. Auth forms call services which use the Supabase browser client
5. Registration goes through `/api/auth/register` (uses admin client to bypass RLS)
6. After registration, the modal transitions inline to the OTP input step — user enters the 6-digit code, `verifyOtp()` establishes the session, and the user is auto-logged in and stays on the current page. No `emailRedirectTo`, no callback redirect.
7. After successful login, `LoginForm` calls `onSuccess` (closes modal, user stays on current page). Onboarding is handled by a persistent banner — not a redirect gate.

## API Routes

- **`/api/auth/register`** (POST) -- Server-side registration. Validates via `validateRegisterInput()`, creates user with admin client (bypasses RLS), returns `409 DUPLICATE_EMAIL` for existing accounts, sets `Cache-Control: private, no-store`. No `emailRedirectTo` is set — verification is OTP-based.
- **`/api/auth/callback`** (GET) -- Simplified for backwards compatibility. Recovery tokens redirect to `/auth/reset-password`. Signup verification is no longer handled here (OTP replaces it). Sanitizes redirect paths to prevent open redirects.
- **`/api/auth/delete-account`** (DELETE) -- Permanently deletes the authenticated member's account. Requires an authenticated session (server client). Before deletion: checks for active shops owned by the member and releases the member's slug from the `slugs` table. After cleanup, calls `deleteUser()` via admin client.

  **Shop ownership guard:** If the member owns one or more shops, the route returns `409` before deleting:

  ```json
  { "error": "OWNS_SHOPS", "shops": [{ "id": "uuid", "shop_name": "My Shop" }] }
  ```

  The account page (`src/app/(frontend)/dashboard/account/page.tsx`) handles this 409 by showing an inline warning inside the deletion confirmation modal. Each shop name is rendered as a link to `/dashboard/shop/settings` so the member can delete their shops before retrying account deletion.

## Auth Pages

- **`/auth/reset-password`** -- Multi-step page: email → OTP → new password. Step 1 submits the email to trigger a reset code. Step 2 uses the shared `otp-input` component for code entry. Step 3 collects and sets the new password. NOT protected by proxy.ts — authenticated users need access during recovery.
- **No dedicated login/register pages** -- Login and registration are modal-based, rendered in the navbar.

## Security

- **Cookie-based sessions** -- httpOnly cookies via `@supabase/ssr`, no localStorage
- **OTP code verification** -- `verifyOtp()` exchanges the 6-digit code for a session. `autocomplete="one-time-code"` is set on OTP inputs for mobile auto-fill.
- **Server-side validation** -- `/api/auth/register` validates email format, password complexity, and required fields independent of client-side Yup schemas
- **Password policy** -- minimum 8 characters, requires uppercase, lowercase, and number (enforced both client-side and server-side)
- **Cache-Control headers** -- `private, no-store` on all auth API responses to prevent CDN caching
- **Open redirect prevention** -- callback route's `sanitizeRedirectPath()` rejects protocol-relative URLs and requires `/` prefix
- **`getUser()` over `getSession()`** -- proxy.ts uses `getUser()` which verifies the JWT server-side (Supabase best practice)
- **Admin client isolation** -- `autoRefreshToken: false`, `persistSession: false`, used only for registration

## Timeout Handling

All auth service functions except `logout` and `getUserProfile` apply an 8-second timeout to protect against hung Supabase client calls.

- **`withTimeout` helper** -- wraps a promise with `Promise.race` against a `setTimeout`-backed rejection. Used for all Supabase client calls in the service layer.
- **`register` fetch call** -- uses `AbortController` with an 8-second timeout passed as `signal` to the `fetch()` call to `/api/auth/register`, since `Promise.race` cannot cancel an in-flight fetch.
- **Error message on timeout** -- `"Something went wrong. Check your connection and try again."` is returned as the service error and displayed in the form.
- **Form field preservation** -- React Hook Form retains field values on timeout errors, so users do not lose their input and can retry without re-entering data.

## Error Handling

- **Duplicate email** -- `/api/auth/register` returns `409 DUPLICATE_EMAIL`. `RegisterForm` renders a friendly "An account with that email already exists" message with an inline "Sign in" button (calls `onSwitchToLogin`).
- **Unverified email** -- `LoginForm` detects `email_not_confirmed` error and shows an inline resend button directly in the form (no separate modal).
- **Invalid OTP code** -- `otp-input` shows an inline error message. User can retry or request a new code.
- **Expired OTP code** -- `otp-input` shows an expired message and prompts the user to resend. 60-second resend cooldown prevents abuse.
- **OTP rate limiting** -- Supabase rate limit errors are surfaced as a friendly "Too many attempts. Please wait before trying again." message.
- **Owns shops** -- `/api/auth/delete-account` returns `409 OWNS_SHOPS` with a `shops` array when the member has active shops. The account page renders an inline warning in the deletion modal listing each shop as a link to its settings page.
- **Generic errors** -- Rendered as-is in form error areas with `role="alert"` and `aria-live="assertive"`.

## Key Patterns

- Cookie-based sessions -- no localStorage tokens
- Server-side: API routes use server client from `src/libs/supabase/server.ts`
- Client-side: Components use browser client from `src/libs/supabase/client.ts`
- Admin operations: Registration uses admin client from `src/libs/supabase/admin.ts`
- Route protection: `proxy.ts` guards routes in both directions -- unauthenticated users redirected from `/dashboard/*` to `/`, authenticated users redirected from guarded auth pages to `/`; `/auth/reset-password` is excluded from this guard (needed during recovery)
- No `emailRedirectTo` usage -- OTP verification is fully in-app; no redirect URLs are passed to Supabase for registration
- Onboarding is banner-based, not redirect-based -- `LoginForm` does not call `checkOnboardingComplete()` or redirect to `/onboarding`
- Validation split: Yup schemas for client-side forms, pure functions for server-side API routes (no shared dependency)

## Components

- **login-form** -- Email/password login. Props: `onSuccess`, `onError`, `onClose`. On success, calls `onSuccess` to close the modal. No `banner` or `onResendVerification` props. Unverified email error shows an inline resend button. "Reset your password" link points to `/auth/reset-password`.
- **registration-form** -- Two-step component: form → OTP. After registration API succeeds, transitions inline to the OTP verification step. `onSuccess` fires after OTP verification (not after form submit). Props: `onSuccess`, `onError`, `onSwitchToLogin`. Shows friendly duplicate email error with Sign in link.
- **otp-input** -- Shared 6-digit OTP code input component. Used by `registration-form` (step 2) and `/auth/reset-password` (step 2). Props: `email`, `type`, `onSuccess`, `onResend`. Features: auto-advance on digit entry, paste support, auto-submit on last digit, 60-second resend cooldown, `autocomplete="one-time-code"` for mobile auto-fill, accessible with `aria-label` per input.

## Test Coverage

- **services/**tests**/auth.test.ts** -- 30 tests: `withTimeout`, `register` (abort signal, timeout, 409 duplicate, server errors), `login` (timeout, success, Supabase errors), `logout`, `getUserProfile`, `verifyOtp` (signup, recovery, email_change, error, timeout), `sendResetCode`, `changeEmail` (success, error, timeout), `verifyEmailChange` (success, error), `resendEmailChangeCode` (success, error)
- **validations/auth.test.ts** -- 20 tests: `loginSchema`, `registerSchema`, `resetPasswordSchema`, `changeEmailSchema` (valid/invalid inputs, password complexity, email format)
- **validations/server.test.ts** -- 11 tests: `validateRegisterInput` (valid input, missing fields, invalid email, weak passwords, unaccepted terms, null/undefined handling)
- **components/registration-form/**tests**/index.test.tsx** -- 6 tests: friendly duplicate email message, Sign in button, `onSwitchToLogin` callback, non-duplicate error passthrough
- **api/auth/register/**tests**/route.test.ts** -- 2 tests: 409 DUPLICATE_EMAIL, 400 for other errors
