# OTP Auth Refactor — Email Link to 6-Digit Code Verification

**Date:** 2026-03-23
**Status:** Approved
**Scope:** Registration verification, password reset, onboarding gating

## Problem

Nessi uses email link-based verification for both signup and password reset. Users must leave the app, open their email, click a link, get redirected back, and then sign in manually. This creates friction, especially for users mid-purchase who just need an account to check out.

## Solution

Replace link-based email verification with 6-digit OTP codes for both signup and password reset. Users stay in the app the entire time. Registration becomes a two-step modal (form then code input). Password reset becomes a multi-step page. Onboarding is no longer forced after login — a persistent banner nudges users instead.

## Design Decisions

| Decision            | Choice                                        | Rationale                                                                           |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Verification method | 6-digit OTP code                              | Modern UX standard, user stays in-app                                               |
| Both flows          | OTP for signup AND password reset             | Consistent UX, one pattern to learn                                                 |
| Registration UI     | Modal with in-place step transition           | User never leaves their current page (critical for checkout conversion)             |
| Password reset UI   | Standalone page at `/auth/reset-password`     | Infrequent flow, benefits from a dedicated URL                                      |
| Post-verification   | Auto-login + welcome toast                    | Zero friction — user just proved email ownership                                    |
| Onboarding          | Remove forced redirect, use persistent banner | Purchases don't require a complete profile; don't block the primary conversion path |
| Shared component    | Single `OtpInput` component for both flows    | DRY, consistent behavior and styling                                                |

## Flow 1: Registration (Modal)

### User Journey

1. User clicks "Sign Up / Log In" in navbar
2. Switches to Register modal, fills out form (first name, last name, email, password, terms)
3. Submits → `POST /api/auth/register` creates user via admin client
4. Modal transitions in-place from form to OTP verification step
5. User sees: their email displayed, 6 input fields for the code, "Resend code" link
6. User checks email, receives 6-digit code (Supabase template uses `{{ .Token }}`)
7. User enters or pastes code → auto-submits when all 6 digits are entered
8. Client calls `supabase.auth.verifyOtp({ email, token, type: 'signup' })`
9. Session established automatically (Supabase sets cookies via browser client)
10. Modal closes, `AuthProvider` picks up session via `onAuthStateChange`
11. Toast: "Welcome to Nessi! Your account is ready."
12. User stays on current page (product page, cart, homepage — wherever they were)
13. Persistent "Complete your profile" banner appears in `NotificationBar`

### Error Handling

- **Invalid code:** "Invalid code. Please try again." — fields clear, focus returns to first input
- **Expired code:** "Code expired. We've sent a new one." — auto-resend, fields clear
- **Network timeout:** Standard 8-second timeout with retry messaging
- **Duplicate email:** Same as today — 409 from register API, "Account already exists" with sign-in link

### Registration Modal State

The register modal becomes a two-step component:

- **Step 1 — Form:** Current registration form (unchanged fields)
- **Step 2 — OTP:** Shared `OtpInput` component with the registered email

Internal state (`step: 'form' | 'otp'`) manages which content is displayed. The email from step 1 is stored in component state and passed to step 2.

## Flow 2: Password Reset (Page)

### User Journey

1. User clicks "Reset your password" in login modal
2. Login modal closes, navigates to `/auth/reset-password`
3. Multi-step form on one page:

**Step 1 — Email:**

- User enters email, clicks "Send Code"
- Calls `supabase.auth.resetPasswordForEmail(email)` (no `redirectTo` needed)
- Supabase sends 6-digit code email (template uses `{{ .Token }}`)
- Form advances to step 2

**Step 2 — OTP:**

- Same shared `OtpInput` component
- User enters code → calls `supabase.auth.verifyOtp({ email, token, type: 'recovery' })`
- On success, session is established (Supabase logs user in as part of recovery)
- Form advances to step 3

**Step 3 — New Password:**

- User enters new password + confirmation
- Calls `supabase.auth.updateUser({ password })`
- On success → toast "Password updated!" → redirect to homepage (user is now logged in)

### Error Handling

- **Invalid code:** Same as registration — clear fields, show error, focus first input
- **Expired code:** Auto-resend with messaging
- **Password validation:** Same rules as registration (8+ chars, uppercase, lowercase, digit)
- **Passwords don't match:** Client-side validation before submission

### Route Changes

- **Create** `/auth/reset-password` page with multi-step form
- **Delete** `/auth/forgot-password` page and styles
- **Delete** `/auth/callback` page and styles (no longer needed for either flow)
- **Update** `proxy.ts` guard from `/auth/forgot-password` to `/auth/reset-password`

## Shared OTP Component

**Location:** `src/features/auth/components/otp-input/`

### Behavior

- 6 individual input fields, one digit each
- Auto-focus first field on mount
- Auto-advance to next field on digit entry
- Backspace moves to previous field and clears it
- Full paste support — paste "123456" and all fields populate
- Auto-submit when all 6 digits entered (no button needed)
- Loading spinner while verifying
- Error state clears fields and refocuses first input
- "Resend code" link with 60-second cooldown timer (shows countdown: "Resend code in 47s")

### Props

```typescript
interface OtpInputProps {
  email: string;
  type: 'signup' | 'recovery';
  onSuccess: () => void;
  onResend: () => Promise<void>;
}
```

### Accessibility

- `aria-label="Verification code digit N of 6"` on each input
- `inputMode="numeric"` + `pattern="[0-9]"` for mobile number keyboard
- `autocomplete="one-time-code"` on a hidden input that captures the full code (iOS/Android auto-fill targets a single input), then distributes digits to visual inputs programmatically
- Inputs wrapped in a `role="group"` with `aria-label="Verification code"`
- `aria-describedby` linking to instruction text ("Enter the 6-digit code sent to your email")
- Error messages with `role="alert"` and `aria-live="assertive"`
- Screen reader announcement on auto-submit: "Verifying code..."
- Minimum 44x44px tap target on each input field (mobile)

## Onboarding Gating Changes

### What Changes

- `LoginForm` no longer calls `checkOnboardingComplete()` after successful login
- Registration OTP flow does not check onboarding — auto-logs in and closes modal
- `proxy.ts` keeps existing guard: redirects away from `/onboarding` if already complete
- `proxy.ts` does NOT force users to `/onboarding` if incomplete

### Persistent Banner

`NotificationBar` component gains a "Complete your profile" message when the authenticated user's `onboarding_completed_at` is null. Links to `/onboarding`. Dismissible per session (via `sessionStorage`) but reappears on next visit.

**Data source:** The navbar already calls `useMember()` which returns `onboarding_completed_at`. Pass an `onboardingComplete` boolean prop from the navbar to `NotificationBar` rather than adding auth hooks to the notification bar directly. This keeps `NotificationBar` a presentational component.

### Action Gating (Out of Scope)

Seller-specific actions (create listing, open shop) will check onboarding status and redirect to `/onboarding` when those features are built. Not part of this refactor.

## Service Layer Changes

### New Functions in `auth.ts`

```typescript
// Verify a 6-digit OTP code (used by both signup and recovery flows)
export const verifyOtp = async (data: {
  email: string;
  token: string;
  type: 'signup' | 'recovery';
}) => { ... };
```

### Modified Functions

- `forgotPassword()` — remove `redirectTo` option (no longer redirecting via link). Rename to `sendResetCode()` for clarity.
- `register()` — response handling changes (no more "check your email for a link" message)
- `resendVerification()` — unchanged, works for signup OTP resend only. **Note:** For the password reset flow, resending a recovery code requires calling `sendResetCode()` (which calls `resetPasswordForEmail`), NOT `resendVerification()`. Supabase's `resend()` only supports `type: 'signup'`. The `OtpInput` component's `onResend` prop abstracts this — the registration modal wires it to `resendVerification()`, the reset password page wires it to `sendResetCode()`.

### Removed Dependencies

- `checkOnboardingComplete()` call removed from `LoginForm`
- `emailRedirectTo` removed from `/api/auth/register` route
- `onboarding.ts` service — no longer called from auth flows. Keep the file for now; it will be used by the `NotificationBar` onboarding banner and future action-gating logic.

## Navbar Changes

### State Removed

- `isResendModalOpen` — gone (resend is inline in OTP component)
- `loginBanner` — gone (no more "Email verified!" banner in login modal)
- `?verified=true` query param handling — gone
- `?auth_error=true` query param handling — gone
- Resend verification modal — gone

### State Modified

- `handleRegisterSuccess` — instead of closing modal + showing toast, transitions modal to OTP step
- Register modal gets internal step state

### Login Modal

- `LoginForm` loses `banner` prop, `onResendVerification` prop
- "Forgot your password?" text becomes "Reset your password"
- Link target changes from `/auth/forgot-password` to `/auth/reset-password`
- Unverified email error handling changes — instead of showing "Resend verification email" link that opens a separate modal, show inline "Resend verification code" that opens the OTP step with a fresh code

## Files Affected

### New Files

- `src/features/auth/components/otp-input/index.tsx` — shared OTP input component
- `src/features/auth/components/otp-input/otp-input.module.scss` — OTP styles
- `src/app/(frontend)/auth/reset-password/page.tsx` — multi-step reset page
- `src/app/(frontend)/auth/reset-password/reset-password.module.scss` — reset page styles

### Modified Files

- `src/features/auth/services/auth.ts` — add `verifyOtp()`, rename `forgotPassword()` to `sendResetCode()`, remove `emailRedirectTo`
- `src/features/auth/components/registration-form/index.tsx` — add OTP step transition
- `src/features/auth/components/login-form/index.tsx` — remove `checkOnboardingComplete`, remove `banner` prop, update forgot password link, clean up banner/resend styles from `login-form.module.scss`
- `src/components/navigation/navbar/index.tsx` — remove resend modal state, remove query param handling, update register success handler
- `src/app/api/auth/register/route.ts` — remove `emailRedirectTo` from `signUp()` options
- `src/app/api/auth/callback/route.ts` — simplify for backwards compat. Update recovery redirect target from `/auth/callback?status=recovery` to `/auth/reset-password` (since the callback page is deleted). Keep handling old signup links gracefully (redirect to homepage with login prompt).
- `src/proxy.ts` — update route guard from `/auth/forgot-password` to `/auth/reset-password`
- `src/features/auth/validations/auth.ts` — add OTP validation schema if needed
- `src/features/auth/types/forms.ts` — add OTP-related form types, remove orphaned `ForgotPasswordFormData`
- `src/features/auth/CLAUDE.md` — update documentation
- `src/components/navigation/notification-bar/` — add onboarding banner logic

### Deleted Files

- `src/app/(frontend)/auth/forgot-password/page.tsx`
- `src/app/(frontend)/auth/forgot-password/forgot-password.module.scss`
- `src/app/(frontend)/auth/callback/page.tsx`
- `src/app/(frontend)/auth/callback/callback.module.scss`
- `src/features/auth/components/resend-verification-form/index.tsx`
- `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss`
- `src/features/auth/components/forgot-password-form/index.tsx` — replaced by reset-password page
- `src/features/auth/components/reset-password-form/index.tsx` — absorbed into the new multi-step reset-password page

## Supabase Dashboard Changes (Manual)

These must be done by the developer in the Supabase Dashboard before testing:

1. **Authentication > Email Templates > "Confirm signup"** — change template body to show `{{ .Token }}` (the 6-digit code) instead of the confirmation link
2. **Authentication > Email Templates > "Reset password"** — change template body to show `{{ .Token }}` instead of the reset link
3. **Authentication > Settings** — review OTP expiry duration (default: 1 hour). Consider reducing to 10-15 minutes for security.
4. **Authentication > Rate Limits** — note the default 60-second rate limit between emails for the same user. The OTP component's 60-second resend cooldown matches this. Auto-resend on expiration should also respect this limit and handle rate-limit errors gracefully ("Please wait before requesting a new code").

## Test Updates

### New Tests

- `otp-input` component tests: digit entry, auto-advance, backspace, paste, auto-submit, error state, resend cooldown, accessibility
- `verifyOtp` service tests: success, invalid code, timeout, network error
- Reset password page tests: multi-step flow, step transitions
- Registration modal OTP step tests: step transition from form to OTP

### Modified Tests

- `login-form` tests: remove `checkOnboardingComplete` assertions, remove banner tests
- `registration-form` tests: add OTP step transition assertions
- `navbar` tests (if any): remove resend modal assertions, remove query param handling
- `/api/auth/register` route tests: verify `emailRedirectTo` is no longer in the signUp call
- `proxy.test.ts`: update `/auth/forgot-password` tests to `/auth/reset-password`, update `/auth/callback` page tests for the deleted page
- `onboarding.test.ts`: keep as-is (service is retained for banner/action-gating use)

### Removed Tests

- `resend-verification-form` tests — component is deleted
