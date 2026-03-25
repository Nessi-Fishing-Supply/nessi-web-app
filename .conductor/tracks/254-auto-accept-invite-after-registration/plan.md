# Implementation Plan: #254 — Auto-accept invite after new account registration

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Thread invite token through query params and navbar modal logic

**Goal:** Enable the invite accept page to open the register modal with the invite token preserved as a URL query param, and have the navbar detect and store that token for the duration of the registration flow.
**Verify:** `pnpm build`

### Task 1.1: Add "Sign Up" button and `?register=true&invite={token}` navigation to InviteAccept

Update the `InviteAccept` component's unauthenticated state to include a "Sign Up" button alongside the existing "Sign In" button. The "Sign Up" button navigates to `?register=true&invite={invite.token}`, which the navbar will consume in Task 1.2. The "Sign In" button keeps its current `?login=true` behavior.

**Files:** `src/features/shops/components/invite-accept/index.tsx`
**AC:** Unauthenticated users on `/invite/[token]` see both "Sign In" and "Sign Up" buttons. Clicking "Sign Up" sets `?register=true&invite={token}` in the URL. Clicking "Sign In" continues to set `?login=true`.
**Reuses:** `src/components/controls/button/`
**Expert Domains:** nextjs

### Task 1.2: Detect `?register=true` and `?invite={token}` query params in Navbar

Extend the navbar's existing `useEffect` that detects `?login=true` to also handle `?register=true`. When `register=true` is detected, open the register modal instead of the login modal. Extract the `invite` query param into component state (`inviteToken`). Clean up both `register` and `invite` params from the URL after consuming them (same pattern as the existing `login` param cleanup). The `inviteToken` state persists in the navbar component for the duration of the registration flow.

**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** Navigating to `?register=true` opens the register modal. Navigating to `?register=true&invite=abc123` opens the register modal and stores `abc123` as invite token in navbar state. Both params are cleaned from the URL after consumption. Existing `?login=true` behavior is unchanged.
**Expert Domains:** nextjs

### Task 1.3: Add optional `inviteToken` prop to RegisterForm and thread to OtpInput

Add an optional `inviteToken?: string` prop to `RegisterFormProps`. Pass it through to `OtpInput` as a new optional `inviteToken?: string` prop on `OtpInputProps`. Neither component uses the token yet -- this task only threads the prop. Update the navbar to pass `inviteToken` state to `<RegisterForm>`.

**Files:** `src/features/auth/components/registration-form/index.tsx`, `src/features/auth/components/otp-input/index.tsx`, `src/components/navigation/navbar/index.tsx`
**AC:** `RegisterForm` accepts `inviteToken` prop and passes it to `OtpInput`. `OtpInput` accepts `inviteToken` prop. Navbar passes stored invite token to `RegisterForm`. `pnpm typecheck` passes. No behavioral changes for non-invite registration flows.
**Expert Domains:** nextjs

## Phase 2: Auto-accept invite after OTP verification

**Goal:** After successful OTP verification with an invite token present, automatically call the accept API and show appropriate toast notifications.
**Verify:** `pnpm build`

### Task 2.1: Call accept API in OtpInput's success handler when inviteToken is present

In the `OtpInput` component's `submitOtp` success path, after `verifyOtp()` succeeds and before calling `onSuccess()`, check if `inviteToken` is present. If so, call `acceptShopInvite(inviteToken)` from `src/features/shops/services/shop-invites.ts` wrapped in a try/catch. On success, call `onSuccess()` with the shop data (extend `onSuccess` signature or use a new `onInviteAccepted` callback). On failure, log the error and still call `onSuccess()` -- invite failure must never block account creation.

**Files:** `src/features/auth/components/otp-input/index.tsx`
**AC:** When `inviteToken` is provided and OTP verification succeeds, `acceptShopInvite` is called. If accept succeeds, `onSuccess` is called (account creation completes). If accept fails, `onSuccess` is still called (account creation not blocked). Accept call only happens when `inviteToken` is truthy.
**Reuses:** `src/features/shops/services/shop-invites.ts` (`acceptShopInvite`)
**Expert Domains:** nextjs, state-management

### Task 2.2: Add `onInviteAccepted` callback prop to OtpInput and RegisterForm

Add an optional `onInviteAccepted?: (data: { shopName: string }) => void` callback prop to both `OtpInput` and `RegisterForm`. In `OtpInput`, call this after a successful `acceptShopInvite` response, passing `{ shopName: data.shopName }`. In `RegisterForm`, thread the callback through from its own props to `OtpInput`. This callback allows the parent (navbar) to show the invite-specific success toast.

**Files:** `src/features/auth/components/otp-input/index.tsx`, `src/features/auth/components/registration-form/index.tsx`
**AC:** `OtpInput` fires `onInviteAccepted` with `{ shopName }` when invite auto-accept succeeds. `RegisterForm` threads `onInviteAccepted` through to `OtpInput`. Callback is not fired when invite auto-accept fails or when no invite token is present.
**Expert Domains:** nextjs

### Task 2.3: Handle invite-specific success and failure toasts in Navbar

In the navbar, wire up the `onInviteAccepted` callback on `RegisterForm`. On invite accepted: show a success toast "You've joined {shopName}!" and redirect to `/dashboard`. On normal registration (no invite): keep the existing "Welcome to Nessi!" toast behavior. Add an `onInviteError` or handle the failure case in `handleRegisterSuccess` -- when invite fails, show a warning toast "We couldn't auto-join the shop. Try accepting the invite from your dashboard." but still complete the registration success flow. Clear `inviteToken` state after the registration flow completes (success or failure).

**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** Successful invite auto-accept shows "You've joined {shopName}!" toast and redirects to `/dashboard`. Failed invite auto-accept shows a warning toast but account creation completes normally with "Welcome to Nessi!" toast. `inviteToken` state is cleared after registration completes. Non-invite registrations are unaffected.
**Reuses:** `src/components/indicators/toast/context` (`useToast`)
**Expert Domains:** nextjs, state-management

## Phase 3: Edge cases and polish

**Goal:** Handle edge cases around token leaking, modal switching with token preservation, and ensure the invite token does not affect unrelated pages.
**Verify:** `pnpm build`

### Task 3.1: Preserve invite token when switching between login and register modals

When a user clicks "Sign Up" from the invite page, the register modal opens with the invite token. If they switch to the login modal (via `onSwitchToLogin` or the "Register" button in the login modal header), the invite token should NOT carry over -- it only applies to new registrations. Ensure `inviteToken` is cleared when switching from register to login, and also cleared when the register modal is closed without completing registration.

**Files:** `src/components/navigation/navbar/index.tsx`
**AC:** Invite token is cleared when: (1) register modal is closed, (2) user switches from register to login, (3) registration completes. Invite token is NOT cleared when the modal stays open during OTP step. Opening the login modal independently never has an invite token.
**Expert Domains:** nextjs

### Task 3.2: Handle invite-specific context in InviteAccept for post-registration redirect

After a new user registers via the invite page and is auto-accepted, they should be redirected to `/dashboard` (handled in Task 2.3 via the navbar). However, the `InviteAccept` component will also detect the auth state change (via `useAuth()`) and show the "Accept Invitation" button. Add a guard: if registration just completed with auto-accept (invite was already accepted), avoid showing the accept button or showing a stale UI. Use the URL cleanup from Task 1.2 and the auth state change to handle this gracefully -- the redirect to `/dashboard` from Task 2.3 should happen before the user can interact with the now-authenticated invite page.

**Files:** `src/features/shops/components/invite-accept/index.tsx`
**AC:** After registration + auto-accept + redirect, the user lands on `/dashboard` without seeing a flash of the accept button on the invite page. No duplicate accept calls are possible.
**Expert Domains:** nextjs

### Task 3.3: Update feature CLAUDE.md files with invite auto-accept flow documentation

Document the invite auto-accept registration flow in both the shops and auth feature CLAUDE.md files. In shops CLAUDE.md, add a section describing the auto-accept flow for new users. In auth CLAUDE.md, document the `inviteToken` prop threading through RegisterForm and OtpInput, and the `onInviteAccepted` callback pattern.

**Files:** `src/features/shops/CLAUDE.md`, `src/features/auth/CLAUDE.md`
**AC:** Both CLAUDE.md files document the invite auto-accept registration flow, including the prop threading pattern, callback flow, and edge case handling. A developer reading either file can understand how invite tokens flow through the auth components.
