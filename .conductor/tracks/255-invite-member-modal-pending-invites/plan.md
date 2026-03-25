# Implementation Plan: #255 — Add Invite Member Modal and Pending Invites List

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Invite Member Modal

**Goal:** Create the InviteMemberModal component with email input, role selector, client-side validation, and API integration via useCreateInvite
**Verify:** `pnpm build`

### Task 1.1: Create InviteMemberModal component with form and validation

Create a new `InviteMemberModal` component that renders inside the existing `Modal` wrapper. The modal contains a native email `<input>` (following the `confirmInput` pattern already used in ShopMembersSection, NOT the react-hook-form `Input` component), the existing `RoleSelect` component for role selection (defaults to Contributor via `DEFAULT_ROLE_ID`), and Submit/Cancel buttons. Client-side validation uses `validateInviteInput` from `validations/invite.ts`. The email input must have `aria-required`, `aria-describedby` for errors, and `aria-invalid` on error state. The submit button shows a loading spinner with `aria-busy` during mutation. Inline errors use `role="alert"` with `aria-live="assertive"`. On success, the modal closes and the parent receives a callback. On 409 errors from the API, display the error message inline in the modal without closing.
**Files:**

- `src/features/shops/components/invite-member-modal/index.tsx` (new)
- `src/features/shops/components/invite-member-modal/invite-member-modal.module.scss` (new)
  **AC:**
- Modal renders email input (type="email") and RoleSelect defaulting to Contributor
- Client-side validation prevents submission of empty/invalid email
- All form inputs have proper `aria-*` attributes (aria-required, aria-describedby, aria-invalid)
- Submit button shows loading state with `aria-busy`
- Successful submission calls `useCreateInvite` and triggers `onSuccess` callback
- 409 API errors display inline with `role="alert"`
- Cancel button and modal close reset form state
- SCSS is mobile-first with design tokens only, flat class names
  **Reuses:** `src/components/layout/modal/`, `src/features/shops/components/role-select/`, `src/components/controls/button/`, `src/features/shops/validations/invite.ts`, `src/features/shops/constants/roles.ts`
  **Expert Domains:** scss, nextjs

### Task 1.2: Wire InviteMemberModal into ShopMembersSection with member cap logic

Replace the placeholder "Coming soon" toast on the "Invite" button with state that opens the `InviteMemberModal`. Add the member cap check: the button is disabled when `(members.length + pendingInvites.length) >= MAX_MEMBERS_PER_SHOP`. Import `useShopInvites` to fetch pending invites for the cap calculation. Update the heading to show "Members ({current}/{max})" count. On successful invite creation, show a success toast. The button remains visible only for the Owner (existing behavior preserved).
**Files:**

- `src/features/shops/components/shop-settings/shop-members-section/index.tsx` (modify)
  **AC:**
- "Invite" button opens InviteMemberModal instead of showing placeholder toast
- Button is disabled when members + pending invites >= 5 (MAX_MEMBERS_PER_SHOP)
- Disabled button has a tooltip or title explaining the cap
- Heading shows "Members (N/5)" count indicator
- Success toast appears after invite creation
- Owner-only visibility of invite button is preserved
- `pnpm typecheck` passes
  **Reuses:** `src/features/shops/hooks/use-shop-invites.ts` (useShopInvites, useCreateInvite), `src/features/shops/constants/limits.ts` (MAX_MEMBERS_PER_SHOP)
  **Expert Domains:** state-management, nextjs

## Phase 2: Pending Invitations List

**Goal:** Create the PendingInvitesList component showing all pending invites with status badges, relative timestamps, resend, and revoke actions
**Verify:** `pnpm build`

### Task 2.1: Create PendingInviteRow component for individual invite display

Create a component that renders a single pending invite row: email address, role badge (using the existing `Pill` component with status-appropriate colors), relative sent time (e.g., "2 days ago" using a simple `getRelativeTime` utility), and expiry status. The expiry status checks if `expires_at < now` to show "Expired" vs "Pending". Include Resend and Revoke action buttons. Resend calls `useResendInvite` and shows a success toast. Revoke opens a confirmation dialog (using the existing `Modal` pattern from ShopMembersSection) before calling `useRevokeInvite`.
**Files:**

- `src/features/shops/components/pending-invites-list/index.tsx` (new)
- `src/features/shops/components/pending-invites-list/pending-invites-list.module.scss` (new)
- `src/features/shops/utils/get-relative-time.ts` (new)
  **AC:**
- Each invite row shows: email, role pill, relative sent time, expiry indicator
- Status pills use correct colors: Pending (warning), Expired (default), Revoked (error), Accepted (success)
- Resend button calls `useResendInvite` with loading state and `aria-busy`
- Revoke button opens a confirmation Modal before calling `useRevokeInvite`
- Success toasts appear for both resend and revoke actions
- Empty state shows "No invitations sent yet"
- All interactive elements have minimum 44x44px tap targets
- SCSS is mobile-first with design tokens only
  **Reuses:** `src/components/indicators/pill/`, `src/components/layout/modal/`, `src/components/controls/button/`, `src/features/shops/hooks/use-shop-invites.ts` (useResendInvite, useRevokeInvite)
  **Expert Domains:** scss, nextjs

### Task 2.2: Integrate PendingInvitesList into ShopMembersSection

Add the `PendingInvitesList` component below the existing members list in `ShopMembersSection`. Pass the `useShopInvites` data (already fetched in Task 1.2 for the cap calculation) and the shop's roles array for role label resolution. The pending invites section renders with its own subheading "Pending Invitations" and is visible to the Owner. Include loading and error states consistent with the members list pattern.
**Files:**

- `src/features/shops/components/shop-settings/shop-members-section/index.tsx` (modify)
- `src/features/shops/components/shop-settings/shop-members-section/shop-members-section.module.scss` (modify)
  **AC:**
- Pending invitations section renders below the members list
- Section has "Pending Invitations" subheading
- Uses shared invite data from `useShopInvites` (no duplicate fetch)
- Loading state shows while invites are fetching
- Section is visible to the Owner
- Member cap count includes pending invites in the heading counter
- `pnpm build` passes
  **Expert Domains:** scss, nextjs

## Phase 3: Polish and Edge Cases

**Goal:** Handle loading states, error recovery, mobile responsiveness, and ensure all quality gates pass
**Verify:** `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm build`

### Task 3.1: Add loading skeletons and error states for invite sections

Add loading skeleton placeholders for the pending invites list while data is fetching. Add error recovery UI ("Failed to load invitations. Please refresh and try again.") consistent with the existing members list error pattern. Ensure the invite modal submit button is disabled during any active mutation to prevent double-submission. Handle network errors gracefully with error toasts.
**Files:**

- `src/features/shops/components/pending-invites-list/index.tsx` (modify)
- `src/features/shops/components/invite-member-modal/index.tsx` (modify)
  **AC:**
- Loading state renders placeholder text while invites fetch
- Error state renders with `role="alert"` and retry guidance
- Submit button in modal is disabled during active mutations
- Network errors show error toasts with descriptive messages
- No unhandled promise rejections
  **Expert Domains:** nextjs

### Task 3.2: Add mobile-responsive SCSS for invite modal and pending list

Ensure the invite modal renders full-width on mobile (below `sm` breakpoint) and max-width 480px on desktop. The pending invites list stacks vertically on mobile with each row showing email above the metadata row (role, date, actions). Verify all tap targets are 44x44px minimum. Verify the modal renders correctly at 320px viewport width.
**Files:**

- `src/features/shops/components/invite-member-modal/invite-member-modal.module.scss` (modify)
- `src/features/shops/components/pending-invites-list/pending-invites-list.module.scss` (modify)
  **AC:**
- Modal is full-width on mobile, max-width 480px on desktop
- Pending invite rows stack vertically on mobile
- All buttons meet 44x44px minimum tap target
- Renders correctly at 320px viewport width
- No horizontal scrolling on any viewport
  **Expert Domains:** scss

### Task 3.3: Run all quality gates and fix any issues

Run `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm format:check`, and `pnpm build`. Fix any TypeScript errors, ESLint violations, Stylelint issues, or formatting problems. Ensure all file and folder names are kebab-case. Verify no hardcoded colors, spacing, or UUIDs exist in new code.
**Files:**

- Any files created or modified in Phases 1-2 (as needed for fixes)
  **AC:**
- `pnpm typecheck` passes with zero errors
- `pnpm lint` passes with zero errors
- `pnpm lint:styles` passes with zero errors
- `pnpm format:check` passes
- `pnpm build` succeeds
- No hardcoded hex colors, pixel values (outside 44px tap targets), or UUID strings in new files
