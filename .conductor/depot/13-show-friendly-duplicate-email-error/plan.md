# Implementation Plan: #13 — Show friendly duplicate email error with sign-in link on registration

## Overview

3 phases, 8 total tasks
Estimated scope: small

## Phase 1: API and Service Layer — Detect and propagate duplicate email error

**Goal:** Make the register API route return a 409 with `DUPLICATE_EMAIL` code, and have the client service preserve that code so the form can identify it.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Return 409 DUPLICATE_EMAIL from register API route

In `src/app/api/auth/register/route.ts`, add a check inside the existing `if (error)` block (line 28) that inspects `error.message` for the substring `"User already registered"` (Supabase's exact error string). When detected, return `NextResponse.json({ error: 'DUPLICATE_EMAIL' }, { status: 409, headers: AUTH_HEADERS })` instead of the generic 400 response. All other errors continue to return 400 as before.
**Files:** `src/app/api/auth/register/route.ts`
**AC:** When Supabase returns an error containing "User already registered", the API responds with status 409 and body `{ error: "DUPLICATE_EMAIL" }`. All other Supabase errors still return 400 with the original message.
**Expert Domains:** supabase, nextjs

### Task 1.2: Propagate DUPLICATE_EMAIL code through the register service function

In `src/features/auth/services/auth.ts`, the `register` function already throws `new Error(json.error || 'Registration failed')` when `!res.ok` (line 35). The error message will naturally be `"DUPLICATE_EMAIL"` when the API returns that string. No code change is needed for propagation — the existing `throw new Error(json.error)` already passes the exact error string through. Verify this by adding a unit test.
**Files:** `src/features/auth/services/__tests__/auth.test.ts`
**AC:** A new test case confirms that when fetch returns status 409 with `{ error: "DUPLICATE_EMAIL" }`, the `register` function throws an error with message `"DUPLICATE_EMAIL"`.
**Expert Domains:** supabase

### Task 1.3: Add unit test for register API route duplicate email detection

Create a new test file for the register route that mocks `createAdminClient` and `validateRegisterInput`, then verifies: (a) when `signUp` returns an error with message containing "User already registered", the route returns 409 with `{ error: "DUPLICATE_EMAIL" }`; (b) when `signUp` returns a different error, the route returns 400 with the original message.
**Files:** `src/app/api/auth/register/__tests__/route.test.ts`
**AC:** Two test cases pass: one for duplicate email returning 409/DUPLICATE_EMAIL, one for other errors returning 400 with original message. Tests run successfully with `pnpm test:run`.
**Expert Domains:** nextjs

## Phase 2: Registration Form — Render friendly error with sign-in action

**Goal:** The registration form detects the DUPLICATE_EMAIL error code and renders a user-friendly message with a clickable "Sign in" button that triggers modal switching.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 2.1: Add onSwitchToLogin prop to RegisterForm and detect duplicate email error

In `src/features/auth/components/registration-form/index.tsx`, extend the component to accept an `onSwitchToLogin?: () => void` prop (add it alongside the existing `AuthFormProps` generic — either by extending the interface inline or adding the prop directly). In the `handleSubmit` catch block, check if the error message equals `"DUPLICATE_EMAIL"`. If so, call `setError('DUPLICATE_EMAIL')` to store the specific code in form state rather than a user-facing message. All other errors continue to use their existing message.
**Files:** `src/features/auth/components/registration-form/index.tsx`
**AC:** The component accepts `onSwitchToLogin` as an optional prop. When registration throws with message `"DUPLICATE_EMAIL"`, the error state is set to the string `"DUPLICATE_EMAIL"`. Other errors behave unchanged.
**Expert Domains:** nextjs

### Task 2.2: Render friendly duplicate email message with sign-in button

In the same `src/features/auth/components/registration-form/index.tsx`, replace the existing error rendering block (`{error && <div className="errorMessage">{error}</div>}`) with conditional logic: when `error === 'DUPLICATE_EMAIL'`, render a `<div role="alert" className="errorMessage">` containing the text "An account with that email already exists. " followed by a `<button>` element styled as an inline link containing "Sign in" that calls `onSwitchToLogin`, followed by " instead?". When the error is any other string, render the existing `<div className="errorMessage">{error}</div>` (add `role="alert"` to this div as well for accessibility). Create a CSS module file for the inline-link button styling.
**Files:** `src/features/auth/components/registration-form/index.tsx`, `src/features/auth/components/registration-form/registration-form.module.scss`
**AC:** When error state is "DUPLICATE_EMAIL", the form renders "An account with that email already exists. Sign in instead?" with "Sign in" as a `<button>` element. The button calls `onSwitchToLogin` on click. The error container has `role="alert"`. For all other errors, the existing message displays. The "Sign in" button is keyboard-accessible (inherent with `<button>`).
**Expert Domains:** nextjs, scss

### Task 2.3: Style the inline sign-in button as a text link

Create `src/features/auth/components/registration-form/registration-form.module.scss` with a class for the inline link button. The button should: reset default button styles (no border, no background, no padding), use `color: var(--color-primary)`, add `text-decoration: underline`, set `cursor: pointer`, use `font-size: inherit` and `font-family: inherit` to match surrounding text, and add a `:hover` / `:focus-visible` state using `var(--color-primary--dark)`. The button should display inline within the text flow.
**Files:** `src/features/auth/components/registration-form/registration-form.module.scss`
**AC:** The "Sign in" button visually appears as an inline underlined text link using CSS custom property color tokens. It has visible hover and focus-visible states. No hardcoded color values are used.
**Expert Domains:** scss

### Task 2.4: Wire onSwitchToLogin prop in the Navbar

In `src/components/navigation/navbar/index.tsx`, pass an `onSwitchToLogin` callback to the `<RegisterForm>` component (line 259). The callback should close the register modal and open the login modal — this is the exact same pattern used by `handleResendToLogin` (lines 143-147): set register modal closed, set login modal open, clear login banner. Create a `handleRegisterToLogin` handler following this pattern.
**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** The `RegisterForm` receives an `onSwitchToLogin` prop. Clicking "Sign in" in the duplicate email error closes the register modal and opens the login modal. The login banner is cleared.

## Phase 3: Tests and Final Verification

**Goal:** Add unit tests for the RegisterForm duplicate email rendering and verify all quality gates pass.
**Verify:** `pnpm build && pnpm lint && pnpm lint:styles && pnpm typecheck && pnpm test:run`

### Task 3.1: Add RegisterForm unit test for duplicate email error rendering

Create a test file at `src/features/auth/components/registration-form/__tests__/index.test.tsx`. Mock the `register` service to throw `new Error('DUPLICATE_EMAIL')`. Render the `RegisterForm` with an `onSwitchToLogin` mock callback. Fill in the form fields, submit, and assert: (a) the text "An account with that email already exists." is rendered, (b) a button with text "Sign in" is present, (c) clicking that button calls the `onSwitchToLogin` mock, (d) the raw text "DUPLICATE_EMAIL" is not visible to the user. Also add a test that when register throws a different error (e.g., "Network error"), the standard error message is displayed instead.
**Files:** `src/features/auth/components/registration-form/__tests__/index.test.tsx`
**AC:** Tests pass confirming: friendly message renders for DUPLICATE_EMAIL, Sign in button triggers onSwitchToLogin callback, other errors render their original message. All tests pass with `pnpm test:run`.
**Expert Domains:** nextjs
