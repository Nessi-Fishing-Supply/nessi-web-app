# Implementation Plan: #159 — email change — ChangeEmailForm component and PersonalInfo integration

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: ChangeEmailForm component
**Goal:** Create the multi-step ChangeEmailForm component (email input step and OTP verification step) following the RegisterForm pattern
**Verify:** `pnpm build`

### Task 1.1: Create ChangeEmailForm SCSS module
Create the stylesheet for the change email form with styles for the two-step layout (email input form and OTP step), the heading, description text, error messages, and submit button. Follow the modal form styling patterns from `registration-form.module.scss`. All values must use CSS custom property tokens — no hardcoded hex/px values. Mobile-first with breakpoint enhancements.
**Files:** `src/features/auth/components/change-email-form/change-email-form.module.scss`
**AC:** SCSS module compiles without errors, uses only CSS custom property tokens (`var(--*)`) for all spacing/color/font values, mobile-first structure
**Expert Domains:** scss

### Task 1.2: Create ChangeEmailForm component with email input step
Create the ChangeEmailForm component with `useState<'form' | 'otp'>` for step management (matching RegisterForm pattern). Step 1 renders a `react-hook-form` form with a single email `Input` (from `@/components/controls`), validates with `changeEmailSchema`, checks same-as-current email client-side (compare against `useAuth().user.email`), calls `checkEmailAvailable` for duplicate detection, then calls `changeEmail` service on success. On successful email submission, stores the new email and transitions to `'otp'` step. Uses `useFormState` for loading/error state. Props: `currentEmail: string`, `onSuccess: () => void`. All error messages rendered with `role="alert"`. Same-as-current error: "That is your current email address". Duplicate error: "An account with that email already exists". Focus moves to email input on mount via `autoFocus`.
**Files:** `src/features/auth/components/change-email-form/index.tsx`
**AC:** Component renders email input form on mount; same-as-current email shows inline error without network call; duplicate email from `checkEmailAvailable` shows inline error; valid unique email calls `changeEmail` and transitions to OTP step; loading state disables submit button with `aria-busy`; all errors have `role="alert"`
**Reuses:** `src/components/controls/input/`, `src/components/controls/button/`, `src/features/auth/services/auth.ts` (`changeEmail`, `checkEmailAvailable`), `src/features/auth/validations/auth.ts` (`changeEmailSchema`), `src/features/shared/hooks/use-form-state.ts`, `src/features/auth/context.tsx` (`useAuth`)
**Expert Domains:** nextjs, state-management

### Task 1.3: Add OTP verification step to ChangeEmailForm
Wire up the OTP step in ChangeEmailForm. When `step === 'otp'`, render the shared `OtpInput` component with `email` set to the new email, `type="email_change"`, `onResend` calling `resendEmailChangeCode`, and `onSuccess` calling the component's `onSuccess` prop. Include a heading ("Verify your new email") and description text above the OTP input. Focus is handled by `OtpInput` internally (it auto-focuses the first digit on mount).
**Files:** `src/features/auth/components/change-email-form/index.tsx`
**AC:** After email step succeeds, OTP step renders with correct email and `type="email_change"`; resend calls `resendEmailChangeCode` with the new email; successful OTP verification calls `onSuccess` prop; OTP errors display inline via OtpInput's built-in error handling
**Reuses:** `src/features/auth/components/otp-input/`, `src/features/auth/services/auth.ts` (`resendEmailChangeCode`)
**Expert Domains:** nextjs

## Phase 2: PersonalInfo integration with Modal
**Goal:** Add the email field row to PersonalInfo and wire up the change email modal flow with success toast
**Verify:** `pnpm build`

### Task 2.1: Add email field row to PersonalInfo component
Add an email field row to the PersonalInfo `fields` section, positioned after the Bio field row. Display the current email from `useAuth().user?.email` as a read-only `fieldStatic` span. Add a "Change" text-link button next to or below the email value. Add `useState<boolean>` for modal open state — the "Change" button sets it to `true`. Import `useAuth` from `@/features/auth/context`. The "Change" button should be styled as an inline text link (not a full button) — add a `changeLink` class to the SCSS module.
**Files:** `src/features/members/components/account/personal-info/index.tsx`, `src/features/members/components/account/personal-info/personal-info.module.scss`
**AC:** Email row visible in PersonalInfo showing the user's current email address; "Change" text link renders next to email; clicking "Change" sets modal state to open; email row uses existing `fieldRow`, `fieldLabel`, `fieldStatic` CSS classes; new `changeLink` class styled as text link with visible focus indicator and 44px minimum tap target
**Reuses:** `src/features/auth/context.tsx` (`useAuth`)
**Expert Domains:** nextjs, scss

### Task 2.2: Wire up Modal with ChangeEmailForm
Import the `Modal` component and `ChangeEmailForm` into PersonalInfo. Render `Modal` controlled by the open state from Task 2.1 with `ariaLabel="Change email address"`. Pass `ChangeEmailForm` as modal children with `currentEmail` from `useAuth().user?.email` and an `onSuccess` handler. The `onSuccess` handler closes the modal and shows a success toast via `useToast().showToast({ message: 'Email updated', description: 'Your email address has been changed.', type: 'success', duration: 3000 })`. The modal's `onClose` resets the form by unmounting (since `isOpen` controls rendering). The `AuthProvider` picks up the email change automatically via `onAuthStateChange`, so the displayed email in PersonalInfo updates without manual refresh.
**Files:** `src/features/members/components/account/personal-info/index.tsx`
**AC:** Clicking "Change" opens modal with ChangeEmailForm; successful email change closes modal and shows success toast; dismissing modal (Escape, close button, click outside) closes modal cleanly; email displayed in PersonalInfo updates after successful change (via AuthProvider reactivity); modal has `ariaLabel="Change email address"`
**Reuses:** `src/components/layout/modal/`, `src/features/auth/components/change-email-form/`, `src/components/indicators/toast/context.tsx` (`useToast`)
**Expert Domains:** nextjs, state-management

## Phase 3: Accessibility and polish
**Goal:** Ensure all accessibility requirements are met, edge cases are handled, and styles are correct at all breakpoints
**Verify:** `pnpm build && pnpm typecheck`

### Task 3.1: Accessibility audit and fixes for ChangeEmailForm
Audit ChangeEmailForm for WCAG 2.1 AA compliance. Ensure: email input has `aria-required="true"`, `aria-describedby` linking to error message element when error is present, `aria-invalid` set on error state; submit button has `aria-busy` when loading; error messages use `role="alert"` with `aria-live="assertive"`; form has accessible heading structure (h2 for "Change your email" title inside modal). Verify the Input component from `@/components/controls` already handles `aria-invalid` and `aria-describedby` — if so, just confirm the error message container has a matching `id`. If not, add the attributes directly.
**Files:** `src/features/auth/components/change-email-form/index.tsx`
**AC:** All form inputs have `aria-required` on required fields; `aria-invalid` toggles on error state; error messages have `role="alert"`; submit button has `aria-busy` when loading; form heading is an h2 inside the modal; keyboard navigation works correctly (Tab through input, button, modal close)
**Expert Domains:** nextjs

### Task 3.2: Responsive layout verification and SCSS polish
Review the email field row in PersonalInfo and the ChangeEmailForm modal at mobile (320px), small (480px), medium (768px), and desktop (1024px+) breakpoints. Ensure the email row layout does not overflow on small screens — the email address may be long, so add `overflow-wrap: break-word` or `word-break: break-all` to the email display. Verify the modal form has adequate padding on mobile. Ensure the "Change" link has a minimum 44x44px tap target on mobile. Add any needed responsive adjustments to both SCSS modules.
**Files:** `src/features/auth/components/change-email-form/change-email-form.module.scss`, `src/features/members/components/account/personal-info/personal-info.module.scss`
**AC:** Email address does not overflow its container on narrow screens; modal form is usable at 320px width; "Change" link meets 44x44px minimum tap target; all spacing/sizing uses CSS custom property tokens; no hardcoded pixel values or hex colors
**Expert Domains:** scss

### Task 3.3: Type check and build verification
Run `pnpm typecheck` and `pnpm build` to verify all new and modified files compile without errors. Fix any TypeScript strict mode issues (null checks on `useAuth().user?.email`, proper typing of form handlers). Ensure no unused imports or variables.
**Files:** all files from previous tasks
**AC:** `pnpm typecheck` passes with zero errors; `pnpm build` passes with zero errors; no TypeScript `any` types introduced; all imports are used
**Expert Domains:** nextjs
