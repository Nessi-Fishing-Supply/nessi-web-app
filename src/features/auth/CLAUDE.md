# Auth Feature

## Overview

Authentication feature using Supabase Auth with cookie-based sessions via `@supabase/ssr`. Covers login, registration, email verification, password reset, and post-login onboarding gate.

## Architecture

- **context.tsx** -- `AuthProvider` and `useAuth()` hook wrapping Supabase session state (client-side). Exposes `{ user, isAuthenticated, isLoading }`.
- **services/auth.ts** -- Client-side auth API functions with 8-second timeout protection: `login`, `register`, `logout`, `getUserProfile`, `forgotPassword`, `resetPassword`, `resendVerification`. Also exports `withTimeout` helper and `AUTH_TIMEOUT_MS` constant.
- **services/onboarding.ts** -- Post-login onboarding completeness check (stub — returns `{ isComplete: true }` until profiles table exists). Called by LoginForm after successful login.
- **types/auth.ts** -- Auth data interfaces: `RegisterData`, `LoginData`, `ResetPasswordData`, `AuthResponse`
- **types/forms.ts** -- Form prop interfaces and form data types: `AuthFormProps<TData, TResponse>`, `LoginFormData`, `RegisterFormData`, `ForgotPasswordFormData`, `AuthFormResponse`
- **validations/auth.ts** -- Yup schemas for client-side form validation: `loginSchema`, `registerSchema`, `resetPasswordSchema`
- **validations/server.ts** -- Pure-function validation for register API route (server-side, no Yup dependency): `validateRegisterInput()`

## Session Flow

1. `proxy.ts` refreshes Supabase sessions on every request via `getUser()` (server-side)
2. `proxy.ts` redirects unauthenticated users away from `/dashboard/*` routes
3. `proxy.ts` redirects authenticated users away from guarded auth pages (currently `/auth/forgot-password`) to `/`
4. `/auth/callback` is explicitly not guarded — it handles email verification, recovery tokens, and PKCE exchange and must remain accessible to authenticated and unauthenticated users alike
5. `AuthProvider` listens to `onAuthStateChange` for client-side state
6. Auth forms call services which use the Supabase browser client
7. Registration goes through `/api/auth/register` (uses admin client to bypass RLS)
8. After successful login, `LoginForm` calls `checkOnboardingComplete()` — if incomplete, redirects to `/onboarding`; if complete, calls `onSuccess` (closes modal, user stays on current page)
9. Onboarding check currently always returns `{ isComplete: true }` (stub) — will query profiles table when it exists

## API Routes

- **`/api/auth/register`** (POST) -- Server-side registration. Validates via `validateRegisterInput()`, creates user with admin client (bypasses RLS), returns `409 DUPLICATE_EMAIL` for existing accounts, sets `Cache-Control: private, no-store`.
- **`/api/auth/callback`** (GET) -- Handles email verification (token_hash), PKCE code exchange, and recovery flow. Sanitizes redirect paths to prevent open redirects. Routes recovery tokens to `/auth/callback?status=recovery`, signup verification to `/?verified=true`.
- **`/api/auth/delete-account`** (DELETE) -- Permanently deletes the authenticated member's account. Requires an authenticated session (server client). Before deletion: checks for active shops owned by the member and releases the member's slug from the `slugs` table. After cleanup, calls `deleteUser()` via admin client.

  **Shop ownership guard:** If the member owns one or more shops, the route returns `409` before deleting:

  ```json
  { "error": "OWNS_SHOPS", "shops": [{ "id": "uuid", "shop_name": "My Shop" }] }
  ```

  The account page (`src/app/(frontend)/dashboard/account/page.tsx`) handles this 409 by showing an inline warning inside the deletion confirmation modal. Each shop name is rendered as a link to `/dashboard/shop/settings` so the member can delete their shops before retrying account deletion.

## Auth Pages

- **`/auth/forgot-password`** -- Renders `ForgotPasswordForm`. Protected by proxy.ts (authenticated users redirected to `/`).
- **`/auth/callback`** -- Handles post-email-link routing. If `status=recovery`, renders `ResetPasswordForm` (dynamic import, ssr: false). Otherwise shows processing message. NOT protected by proxy.ts.
- **No dedicated login/register pages** -- Login and registration are modal-based, rendered in the navbar.

## Security

- **Cookie-based sessions** -- httpOnly cookies via `@supabase/ssr`, no localStorage
- **PKCE flow** -- `exchangeCodeForSession()` in `/api/auth/callback` for all magic links
- **Server-side validation** -- `/api/auth/register` validates email format, password complexity, and required fields independent of client-side Yup schemas
- **Password policy** -- minimum 8 characters, requires uppercase, lowercase, and number (enforced both client-side and server-side)
- **Cache-Control headers** -- `private, no-store` on all auth API responses to prevent CDN caching
- **Open redirect prevention** -- callback route's `sanitizeRedirectPath()` rejects protocol-relative URLs and requires `/` prefix
- **Error logging** -- Auth callback logs errors with type context before redirecting
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
- **Unverified email** -- `LoginForm` detects `email_not_confirmed` error and shows a warning banner with a "Resend" link (calls `onResendVerification`).
- **Owns shops** -- `/api/auth/delete-account` returns `409 OWNS_SHOPS` with a `shops` array when the member has active shops. The account page renders an inline warning in the deletion modal listing each shop as a link to its settings page.
- **Generic errors** -- Rendered as-is in form error areas with `role="alert"` and `aria-live="assertive"`.

## Key Patterns

- Cookie-based sessions -- no localStorage tokens
- Server-side: API routes use server client from `src/libs/supabase/server.ts`
- Client-side: Components use browser client from `src/libs/supabase/client.ts`
- Admin operations: Registration uses admin client from `src/libs/supabase/admin.ts`
- Route protection: `proxy.ts` guards routes in both directions -- unauthenticated users redirected from `/dashboard/*` to `/`, authenticated users redirected from guarded auth pages (e.g. `/auth/forgot-password`) to `/`; `/auth/callback` is excluded from this guard
- Redirect URLs use `NEXT_PUBLIC_APP_URL` env var (not `window.location.origin`)
- Validation split: Yup schemas for client-side forms, pure functions for server-side API routes (no shared dependency)

## Components

- **login-form** -- Email/password login with post-login onboarding gate. Props: `onSuccess`, `onError`, `onClose`, `onResendVerification`, `banner`. On success, calls `checkOnboardingComplete()` then either redirects to `/onboarding` or calls `onSuccess` to close modal.
- **registration-form** -- New user signup with email verification. Props: `onSuccess`, `onError`, `onSwitchToLogin`. Shows friendly duplicate email error with Sign in link.
- **forgot-password-form** -- Password reset email request. Props: `onSuccess`, `onError`. Shows success/error messages inline.
- **reset-password-form** -- New password entry after reset link (uses shared `resetPasswordSchema`). Props: `onSuccess`, `onError`. Redirects to `/dashboard?password_reset=true` on success.
- **resend-verification-form** -- Handles expired verification links. Props: `onBackToLogin`, `onSuccess`. Shows warning icon and "Verification link expired" header with resend action.

## Test Coverage

- **services/**tests**/auth.test.ts** -- 21 tests: `withTimeout`, `register` (abort signal, timeout, 409 duplicate, server errors), `login` (timeout, success, Supabase errors), `logout`, `getUserProfile`
- **services/**tests**/onboarding.test.ts** -- 2 tests: returns `{ isComplete: true }`, is async
- **validations/auth.test.ts** -- 17 tests: `loginSchema`, `registerSchema`, `resetPasswordSchema` (valid/invalid inputs, password complexity)
- **validations/server.test.ts** -- 11 tests: `validateRegisterInput` (valid input, missing fields, invalid email, weak passwords, unaccepted terms, null/undefined handling)
- **components/login-form/**tests**/index.test.tsx** -- 4 tests: calls `checkOnboardingComplete` after login, calls `onSuccess` when complete, redirects to `/onboarding` when incomplete
- **components/registration-form/**tests**/index.test.tsx** -- 6 tests: friendly duplicate email message, Sign in button, `onSwitchToLogin` callback, non-duplicate error passthrough
- **api/auth/register/**tests**/route.test.ts** -- 2 tests: 409 DUPLICATE_EMAIL, 400 for other errors
