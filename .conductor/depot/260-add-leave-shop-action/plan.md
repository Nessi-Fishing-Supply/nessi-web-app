# Implementation Plan: #260 — Add "Leave Shop" action for non-owner shop members

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Add "Leave Shop" modal action type and handler

**Goal:** Extend the ShopMembersSection modal system with a new `leave` action type, confirmation handler, and type-to-confirm logic
**Verify:** `pnpm build`

### Task 1.1: Add `leave` modal action type and handler logic to ShopMembersSection

Add a new `leave` entry to the `ModalAction` discriminated union type. Add state derivation for the leave confirmation phrase (`I [First Last] want to leave [Shop Name]`), a phrase-match boolean, and a `handleConfirmLeave` async handler that calls `removeShopMember.mutateAsync` with the current user's member ID, then calls `useContextStore.getState().switchToMember()`, shows a success toast `"You left [Shop Name]"`, and closes the modal. On error, show an error toast. Follow the existing `handleTransferConfirm` pattern (async/await with try/catch, switchToMember after success). Do NOT close the modal before the mutation resolves (unlike the remove handler which closes first) so that loading state remains visible.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/index.tsx`
**AC:**

- `ModalAction` union includes `{ type: 'leave'; member: ShopMember }`
- `handleConfirmLeave` calls `removeShopMember.mutateAsync({ shopId: shop.id, memberId: member.member_id })`
- On success: calls `useContextStore.getState().switchToMember()`, shows toast with message `You left {shop.shop_name}`, closes modal
- On error: shows error toast, does not close modal or switch context
- Leave confirmation phrase is `I {First Last} want to leave {Shop Name}` derived from the modal member and shop props
- `isLeavePhraseMatch` boolean compares `confirmName` state against the phrase
  **Reuses:** `useRemoveShopMember` from `@/features/shops/hooks/use-shops`, `useContextStore` from `@/features/context/stores/context-store`
  **Expert Domains:** nextjs, state-management

### Task 1.2: Add "Leave Shop" button to the current user's MemberRow

In the `MemberRow` component, add a "Leave Shop" button that renders when `isCurrentUser === true` AND `isOwnerRole === false`. The button should appear in the same position as the three-dot menu (right side of the row), using `style="danger"` with an `HiLogout` icon (from `react-icons/hi`). Clicking it calls `onAction({ type: 'leave', member })`. The button should be disabled when `isPending` is true. Add `aria-label="Leave this shop"`. Update the `MemberRow` component to accept and forward the `leave` action.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/index.tsx`
**AC:**

- Non-owner current user row shows a "Leave Shop" button on the right side
- Owner row never shows "Leave Shop" (guarded by `!isOwnerRole`)
- Non-current-user rows are unaffected (existing three-dot menu logic unchanged)
- Button uses `style="danger"` and includes `HiLogout` icon
- Button disabled during any pending mutation
- Button has `aria-label="Leave this shop"`
  **Reuses:** `Button` from `@/components/controls/button`
  **Expert Domains:** nextjs, scss

## Phase 2: Leave Shop confirmation modal and styling

**Goal:** Render the type-to-confirm Leave Shop modal and add any needed SCSS adjustments
**Verify:** `pnpm build`

### Task 2.1: Add Leave Shop confirmation modal markup

Add a new `<Modal>` block in ShopMembersSection following the Transfer Ownership modal pattern. The modal opens when `modalAction?.type === 'leave'`. Contents: heading "Leave shop?", description paragraph explaining the consequences (lose access immediately, cannot undo), the confirmation phrase displayed in monospace using the existing `.confirmPhrase` class, a text input bound to `confirmName` state using the existing `.confirmInput` class, and an actions row with Cancel (secondary, disabled during mutation) and "Leave Shop" (danger, disabled until phrase matches, loading during mutation) buttons. Wire `onClose` to `closeModal`. Use existing SCSS classes: `.confirmModal`, `.confirmTitle`, `.confirmMessage`, `.confirmPhrase`, `.confirmInput`, `.confirmActions`. Add `aria-label="Confirm leaving shop"` to the Modal. Add a visually hidden `<label>` for the input and `aria-describedby` linking to the hint paragraph, matching the transfer modal's accessibility pattern.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/index.tsx`
**AC:**

- Modal opens only when `modalAction?.type === 'leave'`
- Heading reads "Leave shop?"
- Description explains loss of access
- Confirmation phrase rendered in monospace: `I [First Last] want to leave [Shop Name]`
- Text input with placeholder matching the phrase
- Confirm button disabled until exact phrase match
- Confirm button shows loading spinner during mutation
- Cancel button disabled during mutation
- Modal has `aria-label="Confirm leaving shop"`
- Input has a visually hidden label and `aria-describedby` linking to hint text
- All existing SCSS classes reused, no new SCSS needed
  **Reuses:** `Modal` from `@/components/layout/modal`, `Button` from `@/components/controls/button`
  **Expert Domains:** nextjs, scss

### Task 2.2: Add leave button styling to SCSS module

Add a `.leaveButton` class to the SCSS module for positioning the Leave Shop button within the member row. The button should align to the right (matching where the three-dot menu sits), with a minimum tap target of 44x44px for mobile accessibility. Use only CSS custom property tokens. If the existing Button component's `style="danger"` provides sufficient styling and no wrapper class is needed, this task can be skipped — verify first and only add styles if the button needs positional adjustments within the row layout.
**Files:** `src/features/shops/components/shop-settings/shop-members-section/shop-members-section.module.scss`
**AC:**

- Leave button aligns to the right side of the member row, consistent with the three-dot menu position
- Minimum 44x44px tap target on mobile
- All values use CSS custom property tokens (no hardcoded hex/px)
- Mobile-first SCSS
- If no additional styles are needed beyond what Button provides, document that decision in a code comment and skip adding new classes
  **Expert Domains:** scss
