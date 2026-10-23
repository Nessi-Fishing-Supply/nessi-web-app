# Auth UX Improvements Design Spec

**Goal:** Fix auth flow UX gaps discovered during testing — duplicate messages, missing verification feedback, broken modal behavior, and PKCE email template support.

**Scope:** Registration success, email verification landing, resend verification, unverified login handling, forgot password modal cleanup, and callback route `token_hash` support.

**No new dependencies.** One new component (toast). One new modal state (resend verification). All other changes modify existing files.

---

## Decisions Made

| Decision                      | Choice                                                                     | Rationale                                                                      |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Registration success feedback | Close modal + page-level toast                                             | Next action is outside the app (check email)                                   |
| Toast style                   | Soft green card (light green bg, green border, checkmark, auto-dismiss 8s) | Welcoming, celebratory, matches marketplace tone                               |
| Verification success          | Auto-open login modal with green banner                                    | Next action is inside the modal (sign in)                                      |
| Auth error landing            | Dedicated resend verification modal (email-only, no password)              | User isn't trying to log in — they need to resend                              |
| Resend success state          | Same soft green card style as registration toast                           | Consistency across auth flow                                                   |
| Unverified login attempt      | Error banner with "Resend verification" link → opens resend modal          | Reuses existing component, clear path forward                                  |
| Feedback placement principle  | Auth feedback goes where the next action is                                | Page toast when next step is external, modal banner when next step is in-modal |

---

## 1. Toast Component

A reusable toast notification component for page-level feedback.

**Location:** `src/components/indicators/toast/`

**Props:**

- `message: string` — primary bold text (e.g., "Account created!")
- `description: string` — secondary text with details
- `subtitle?: string` — tertiary text (smaller, lighter)
- `type: 'success' | 'error'` — determines color scheme
- `duration?: number` — auto-dismiss in ms (default 8000)
- `onDismiss?: () => void` — callback when dismissed
- `visible: boolean` — controls show/hide

**Visual spec (success type):**

- Light green background (`#f0fdf4`), green border (`#bbf7d0`), rounded corners (12px)
- Green checkmark circle icon on the left
- `message` text in dark green (`#166534`, 15px, semibold)
- `description` text in medium green (`#15803d`, 13px)
- `subtitle` text in light green (`#6b9e7a`, 12px) — optional, renders below description if provided
- Dismissible via X button
- Auto-dismiss after `duration` ms
- Positioned fixed at top-center of viewport with slide-down animation
- SCSS module for styling, consistent with project patterns

**Usage for registration:**

```
message: "Account created!"
description: "Check your inbox at {email} for a verification link."
subtitle: "Come back and sign in once verified."
```

---

## 2. Registration Success Flow

**Current behavior:** Form shows inline success message AND calls `onSuccess` which shows a second message in the modal wrapper. Modal stays open with filled form visible.

**New behavior:**

1. Registration API succeeds
2. Modal closes immediately
3. Toast appears on the page with registration success message including user's email
4. Toast auto-dismisses after 8 seconds

**Changes:**

- `registration-form/index.tsx` — remove `setSuccess()` call (no inline message), keep `onSuccess` callback
- `navbar/index.tsx` — `handleRegisterSuccess` receives the response, closes the modal, triggers toast with user's email
- Need to pass the registered email up to the navbar via the `onSuccess` callback response

---

## 3. Email Verification Landing (`?verified=true`)

**Current behavior:** Home page ignores the `verified=true` query param. User sees no feedback.

**New behavior:**

1. User clicks email verification link → callback route verifies → redirects to `/?verified=true`
2. Home page (or navbar) detects `?verified=true` in search params
3. Login modal auto-opens with a green success banner at the top: "Email verified! Sign in to get started."
4. Banner disappears when modal closes

**Changes:**

- `navbar/index.tsx` — detect `?verified=true` search param, auto-open login modal, pass `verified` state to login form
- `login-form/index.tsx` — accept optional `banner` prop to render a success/error banner above the form fields
- Clean up the URL query param after consuming it — call `window.history.replaceState` inside the `useEffect` after modal state has been set, to prevent stale state on page refresh

---

## 4. Auth Error Landing (`?auth_error=true`)

**Current behavior:** User lands on `/?auth_error=true` with no feedback — blank page with no indication of what went wrong.

**New behavior:**

1. User clicks expired/invalid verification link → callback route fails → redirects to `/?auth_error=true`
2. Home page (or navbar) detects `?auth_error=true` in search params
3. Resend verification modal auto-opens (new modal state in navbar)

**Resend verification modal:**

- Warning icon (amber/red circle) centered at top
- Heading: "Verification link expired"
- Subtext: "Enter your email to resend the verification link."
- Single email input field (no password)
- "Resend Verification Email" button
- "Back to Sign In" link at bottom (switches to login modal)
- On success: modal transforms to soft green card confirmation state with checkmark, "Verification email sent!", user's email, and instructions
- On success, also show "Back to Sign In" link
- On error (rate limited, invalid email, network): show inline error message below the email field, consistent with other auth form error patterns

**Changes:**

- `navbar/index.tsx` — detect `?auth_error=true` (clean up query param after setting modal state, same as `?verified=true`), add `isResendModalOpen` state, add resend modal rendering
- Create `resend-verification-form/` component in `src/features/auth/components/`
- Add `resendVerification` function to `src/features/auth/services/auth.ts` — calls `supabase.auth.resend({ type: 'signup', email })`
- No formal `ResendVerificationData` type needed — the function takes a plain `{ email: string }` parameter. The resend form uses inline Yup email validation (same as forgot-password-form pattern)

---

## 5. Unverified Login Attempt

**Current behavior:** Supabase returns a generic "Email not confirmed" error that displays as a plain text error message in the login form.

**New behavior:**

1. User tries to sign in with unverified email
2. Login form detects the "Email not confirmed" error from Supabase
3. Instead of generic error text, shows a styled error banner: "Your email hasn't been verified yet" with a "Resend verification email" link
4. Clicking the link closes the login modal and opens the resend verification modal (same component from issue 4)

**Changes:**

- `login-form/index.tsx` — detect "Email not confirmed" error string, render banner with resend link instead of plain error text
- `login-form/index.tsx` — accept `onResendVerification` callback prop from navbar
- `navbar/index.tsx` — pass `onResendVerification` handler that closes login modal and opens resend modal

---

## 6. Forgot Password Modal Fix

**Current behavior:** Clicking "Forgot your password?" in the login form navigates to `/auth/forgot-password` but the login modal stays open, creating a layered/broken UI.

**New behavior:** Modal closes before navigation occurs.

**Changes:**

- `login-form/index.tsx` — replace `AppLink` with an `onClick` handler that calls the modal close callback then navigates via `router.push`
- `login-form/index.tsx` — accept `onClose?: () => void` callback prop (added to `AuthFormProps` or as a direct prop on LoginForm)

---

## 7. Callback Route: `token_hash` Support

**Current behavior:** The callback route only handles `code` parameter (from `exchangeCodeForSession`). The updated Supabase email templates now send `token_hash` parameter instead.

**New behavior:** The callback route handles both:

- `code` parameter → `exchangeCodeForSession(code)` (existing, for client-initiated PKCE flows like password reset via `resetPasswordForEmail`)
- `token_hash` parameter → `verifyOtp({ token_hash, type })` (new, for email template links)

**Changes:**

- `src/app/api/auth/callback/route.ts` — add `token_hash` handling branch before the `code` branch

**Flow:**

```
GET /api/auth/callback?token_hash=xxx&type=email    → verifyOtp → /?verified=true
GET /api/auth/callback?token_hash=xxx&type=recovery → verifyOtp → /auth/callback?status=recovery (page route, not API)
GET /api/auth/callback?code=xxx&type=recovery       → exchangeCodeForSession → /auth/callback?status=recovery (page route)
GET /api/auth/callback (no code or token_hash)      → /?auth_error=true
```

**Note:** `/auth/callback` is a client-side page route at `src/app/(frontend)/auth/callback/page.tsx` that renders the reset password form. `/api/auth/callback` is the API route that handles token exchange. The API route redirects to the page route for recovery flows.

---

## Flow Diagrams

### Registration → Verification → Login

```
Register form submit
  → API success
  → Modal closes
  → Green toast: "Account created! Check inbox at {email}"
  → User checks email
  → Clicks verification link
  → /api/auth/callback?token_hash=xxx&type=email
  → verifyOtp() succeeds
  → Redirect to /?verified=true
  → Login modal auto-opens with banner: "Email verified! Sign in to get started."
  → User signs in
```

### Expired Verification Link

```
User clicks old/expired email link
  → /api/auth/callback?token_hash=xxx&type=email
  → verifyOtp() fails
  → Redirect to /?auth_error=true
  → Resend verification modal auto-opens
  → User enters email, clicks "Resend"
  → supabase.auth.resend({ type: 'signup', email })
  → Modal transforms to success state
  → User checks email again
```

### Unverified Login Attempt

```
User tries to sign in
  → Supabase returns "Email not confirmed"
  → Login form shows banner: "Email not verified" + "Resend verification" link
  → User clicks "Resend verification"
  → Login modal closes, resend verification modal opens
  → Same flow as expired link from here
```

---

## Files Changed

| File                                                                                         | Action | What                                                                                             |
| -------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `src/components/indicators/toast/index.tsx`                                                  | Create | Toast component                                                                                  |
| `src/components/indicators/toast/toast.module.scss`                                          | Create | Toast styles                                                                                     |
| `src/features/auth/components/resend-verification-form/index.tsx`                            | Create | Resend verification modal content                                                                |
| `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss` | Create | Resend form styles                                                                               |
| `src/features/auth/services/auth.ts`                                                         | Modify | Add `resendVerification()` function                                                              |
| `src/features/auth/components/registration-form/index.tsx`                                   | Modify | Remove inline success message, pass email in callback                                            |
| `src/features/auth/components/login-form/index.tsx`                                          | Modify | Add banner prop, unverified error handling, forgot password close, onResendVerification callback |
| `src/components/navigation/navbar/index.tsx`                                                 | Modify | Toast state, resend modal state, query param detection, modal close on forgot password           |
| `src/app/api/auth/callback/route.ts`                                                         | Modify | Add `token_hash` + `verifyOtp()` support                                                         |
