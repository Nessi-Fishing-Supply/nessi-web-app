# Implementation Plan: #74 — Start selling CTA and mini seller onboarding

## Overview

3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Foundation Components (Start Selling CTA + Create Shop CTA)

**Goal:** Build the two standalone CTA card components that will be placed on the dashboard, independently testable and buildable.
**Verify:** `pnpm build`

### Task 1.1: Create the StartSellingCta component

Build a full-width CTA card component for buyers (`is_seller = false`) that displays an icon, headline ("Start selling your gear"), brief value proposition text, and a prominent CTA button. The button calls an `onStartSelling` callback prop (wired to the modal in Phase 2). Follow the existing card pattern from `step-seller-type/` for styling conventions (border, radius, padding tokens). Use mobile-first SCSS with the project's breakpoint mixin.
**Files:**

- `src/features/members/components/start-selling-cta/index.tsx`
- `src/features/members/components/start-selling-cta/start-selling-cta.module.scss`
  **Reuses:** `src/components/controls/button/` (Button component)
  **AC:** Component renders a card with icon (use `HiOutlineCurrencyDollar` or similar from `react-icons/hi`), heading, description text, and a Button. Accepts `onStartSelling: () => void` prop. Exports as default. Mobile-first responsive styles using CSS custom property tokens only.
  **Expert Domains:** scss

### Task 1.2: Create the CreateShopCta component

Build a secondary CTA card for shop creation, visible to all members regardless of `is_seller` status. Displays a shop icon, brief description of premium shop benefits (custom branding, unlimited listings, team management), and a link to `/dashboard/shop/create`. Use AppLink for navigation. Style as a secondary/lighter card compared to the start-selling CTA.
**Files:**

- `src/features/shops/components/create-shop-cta/index.tsx`
- `src/features/shops/components/create-shop-cta/create-shop-cta.module.scss`
  **Reuses:** `src/components/controls/app-link/` (AppLink component)
  **AC:** Component renders a card with shop icon (`HiOutlineOfficeBuilding`), heading, description, and AppLink to `/dashboard/shop/create`. Exports as default. No props required. Mobile-first responsive styles.
  **Expert Domains:** scss

## Phase 2: Seller Onboarding Modal

**Goal:** Build the multi-step mini seller onboarding modal with terms acceptance and seller type selection, wired to the `useUpdateMember` mutation.
**Verify:** `pnpm build`

### Task 2.1: Create the SellerOnboardingModal component shell with step management

Build the modal component that manages a 2-step flow: Step 1 (terms/info) and Step 2 (seller type choice). Use the existing `Modal` component from `src/components/layout/modal/`. Manage step state internally with `useState`. The component accepts `isOpen`, `onClose`, `userId`, and `onComplete` props. `onComplete` is called after the flow finishes successfully with the chosen path ('free' or 'shop').
**Files:**

- `src/features/members/components/seller-onboarding-modal/index.tsx`
- `src/features/members/components/seller-onboarding-modal/seller-onboarding-modal.module.scss`
  **Reuses:** `src/components/layout/modal/` (Modal), `src/components/controls/button/` (Button)
  **AC:** Modal opens/closes via `isOpen` prop. Contains internal step state (1 or 2). Step 1 shows terms content with a checkbox for agreement and a "Next" button (disabled until checkbox is checked). Step 2 shows seller type selection cards (reuse the radiogroup card pattern from `step-seller-type/`). Back button on Step 2 returns to Step 1. Modal has `aria-label="Start selling on Nessi"`. Checkbox is a native `<input type="checkbox">` (not the react-hook-form Checkbox component, since this is not inside a FormProvider).
  **Expert Domains:** scss

### Task 2.2: Implement Step 1 — Terms and information screen

Build the terms/info content for Step 1 of the modal. Display a brief explanation of what selling on Nessi means (marketplace policies, how payments work, seller responsibilities). Include a checkbox for accepting seller terms. The "Next" button advances to Step 2 only when the checkbox is checked. Follow accessibility patterns: checkbox has proper `id`/`htmlFor` pairing, `aria-required="true"`.
**Files:**

- `src/features/members/components/seller-onboarding-modal/index.tsx` (modify — add Step 1 content)
- `src/features/members/components/seller-onboarding-modal/seller-onboarding-modal.module.scss` (modify — add Step 1 styles)
  **AC:** Step 1 renders: heading ("Start selling on Nessi"), informational paragraphs about marketplace policies, a labeled checkbox ("I agree to Nessi's seller terms"), and a disabled-until-checked "Next" button. Checkbox uses native HTML input with proper label association. Button shows `aria-busy` when in any loading state.
  **Expert Domains:** scss

### Task 2.3: Implement Step 2 — Seller type choice and mutation logic

Build the seller type selection for Step 2 using the radiogroup card pattern from the onboarding wizard (`step-seller-type/`). Two options: "Sell on your profile" (free) and "Create a shop" (shop). On selecting "free" and clicking "Get started", call `useUpdateMember` to set `is_seller: true`, show a success toast via `useToast`, then call `onComplete('free')`. On selecting "shop" and clicking "Get started", call `onComplete('shop')` (the dashboard will handle the redirect). Include full keyboard navigation for the radiogroup (arrow keys, Enter/Space).
**Files:**

- `src/features/members/components/seller-onboarding-modal/index.tsx` (modify — add Step 2 content and mutation)
- `src/features/members/components/seller-onboarding-modal/seller-onboarding-modal.module.scss` (modify — add Step 2 card styles)
  **Reuses:** `src/features/members/hooks/use-member` (useUpdateMember), `src/components/indicators/toast/context` (useToast)
  **AC:** Step 2 renders two selectable cards in a `role="radiogroup"`. Arrow key navigation cycles focus between cards. Selecting "free" + clicking submit calls `useUpdateMember` with `{ is_seller: true }`, shows success toast, and calls `onComplete('free')`. Selecting "shop" + clicking submit calls `onComplete('shop')`. Button shows loading state during mutation. Error state shows toast on failure.
  **Expert Domains:** state-management

## Phase 3: Dashboard Integration

**Goal:** Rework the dashboard page to conditionally render CTAs and content based on member data and active context, wiring everything together.
**Verify:** `pnpm build`

### Task 3.1: Add useMember hook integration to the dashboard page

Import `useAuth` and `useMember` into the dashboard page. Fetch the current member's data using `useMember(user.id)`. This provides `is_seller` status needed for conditional rendering. Handle loading state gracefully (do not flash CTAs during load).
**Files:**

- `src/app/(frontend)/dashboard/page.tsx` (modify)
  **Reuses:** `src/features/auth/context` (useAuth), `src/features/members/hooks/use-member` (useMember)
  **AC:** Dashboard fetches member data via `useMember(user.id)`. Loading state is handled (no flash of incorrect content). Member data is available for conditional rendering in subsequent tasks.
  **Expert Domains:** state-management, nextjs

### Task 3.2: Render StartSellingCta conditionally and wire to SellerOnboardingModal

In member context, show `StartSellingCta` only when `is_seller === false`. Clicking it opens `SellerOnboardingModal`. On modal completion with `'free'` path, the query cache invalidation from `useUpdateMember` will refresh member data automatically, hiding the CTA. On `'shop'` path, use `router.push('/dashboard/shop/create')` to redirect.
**Files:**

- `src/app/(frontend)/dashboard/page.tsx` (modify)
  **Reuses:** `src/features/members/components/start-selling-cta/`, `src/features/members/components/seller-onboarding-modal/`
  **AC:** "Start selling" CTA appears only when `activeContext.type === 'member'` AND `member.is_seller === false`. Clicking opens the modal. Completing with "free" hides the CTA (member data refreshes). Completing with "shop" redirects to `/dashboard/shop/create`. CTA is hidden when `is_seller === true`.
  **Expert Domains:** nextjs, state-management

### Task 3.3: Render CreateShopCta and seller dashboard sections

In member context, always show `CreateShopCta` (regardless of `is_seller`). When `is_seller === true`, also show a seller section with a placeholder product count or link to `/dashboard/products`. In shop context, replace all member CTAs with a placeholder message: "Shop dashboard coming soon" with the shop name.
**Files:**

- `src/app/(frontend)/dashboard/page.tsx` (modify)
- `src/app/(frontend)/dashboard/dashboard.module.scss` (modify — add styles for seller section and shop placeholder)
  **Reuses:** `src/features/shops/components/create-shop-cta/`
  **AC:** "Create a Shop" CTA is visible in member context regardless of `is_seller`. Seller section (product count placeholder, link to products) appears when `is_seller === true`. Shop context shows "Shop dashboard coming soon" with shop name. Previous inline "Ready to sell?" CTA card is removed (replaced by new components).
  **Expert Domains:** scss, nextjs

### Task 3.4: Polish dashboard layout and responsive styles

Finalize the dashboard layout with proper spacing, section ordering, and responsive behavior. Ensure the CTA cards stack vertically on mobile and can sit side-by-side on larger screens if both are visible. Add a welcome heading that adapts to context ("Welcome back, {display_name}" in member context). Remove the old placeholder subtitle.
**Files:**

- `src/app/(frontend)/dashboard/page.tsx` (modify — layout adjustments)
- `src/app/(frontend)/dashboard/dashboard.module.scss` (modify — responsive grid, section spacing)
  **AC:** Dashboard has a personalized welcome heading using member's `display_name`. CTA cards stack on mobile, can sit in a 2-column grid on `md` breakpoint and above. Proper vertical spacing between sections. Old "Welcome to your dashboard!" subtitle is removed. `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, and `pnpm build` all pass.
  **Expert Domains:** scss
