# Implementation Plan: #71 — feat(onboarding): add buyer/seller branch point and seller opt-in steps

## Overview
3 phases, 11 total tasks
Estimated scope: medium

## Phase 1: Types, Validations, and Store Updates
**Goal:** Extend the onboarding data model to support intent selection, seller type selection, and dynamic step routing via the Zustand store
**Verify:** `pnpm typecheck && pnpm build`

### Task 1.1: Add intent and seller type data types to onboarding types
Add `OnboardingIntent` union type (`'buyer' | 'seller'`), `OnboardingSellerType` union type (`'free' | 'shop'`), `OnboardingIntentData` type (with `intent` field), and `OnboardingSellerTypeData` type (with `sellerType` field) to the onboarding types file. Rename `OnboardingStep2Data` to `OnboardingFishingData` for clarity since it is no longer step 2. Update `OnboardingFormData` to include the new types. Keep existing `SPECIES_OPTIONS`, `TECHNIQUE_OPTIONS`, and `US_STATES` constants unchanged.
**Files:** `src/features/members/types/onboarding.ts`
**AC:** New types `OnboardingIntent`, `OnboardingSellerType`, `OnboardingIntentData`, `OnboardingSellerTypeData` are exported. `OnboardingFormData` includes all step data types. `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 1.2: Add Yup validation schemas for intent and seller type steps
Add `intentSchema` validating that `intent` is one of `'buyer'` or `'seller'` (required). Add `sellerTypeSchema` validating that `sellerType` is one of `'free'` or `'shop'` (required). Rename `step2Schema` to `fishingSchema` for clarity. Keep `step1Schema` and `step3Schema` (bio) unchanged.
**Files:** `src/features/members/validations/onboarding.ts`
**AC:** `intentSchema` rejects empty values and accepts only `'buyer'` or `'seller'`. `sellerTypeSchema` rejects empty values and accepts only `'free'` or `'shop'`. Existing schemas still work. `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 1.3: Rework onboarding Zustand store for branching flow
Replace the fixed 3-step store with a branching-aware store. Add `intentData` (with `intent` field, default `null`) and `sellerTypeData` (with `sellerType` field, default `null`) to state. Rename `step2Data` to `fishingData`. Add `setIntentData`, `setSellerTypeData`, `setFishingData` actions. Compute `totalSteps` dynamically: 3 for buyer path (display name, intent, fishing, bio -- but bio is the final step so steps are 1,2,3,5 mapped to visual 1,2,3), 5 for seller path. Replace the hardcoded `Math.min(currentStep + 1, 3)` in `nextStep` with `Math.min(currentStep + 1, totalSteps)`. Add a `goToStep(step)` action for the wizard to use when navigating between logical steps. The store should expose a computed `totalSteps` getter based on `intentData.intent`. Keep `prevStep` with logic to handle the buyer path skipping step 4 (if current step is 5 and intent is buyer, go to step 3).
**Files:** `src/features/members/stores/onboarding-store.ts`
**AC:** Store state includes `intentData`, `sellerTypeData`, `fishingData`. `totalSteps` returns 3 when intent is `null` or `'buyer'`, 5 when `'seller'`. `nextStep` from step 3 goes to step 5 for buyers, step 4 for sellers. `prevStep` from step 5 goes to step 3 for buyers, step 4 for sellers. `reset()` clears all new fields. `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 1.4: Update step-fishing-identity to use renamed store fields
Update the `StepFishingIdentity` component to read from `fishingData` instead of `step2Data`, and call `setFishingData` instead of `setStep2Data`. No visual changes -- this is purely a rename to match the new store shape.
**Files:** `src/features/members/components/onboarding/step-fishing-identity/index.tsx`
**AC:** Component reads `fishingData` from store, calls `setFishingData` on submit. No functional regression. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 1.5: Update step-bio to use renamed store fields and conditionally set is_seller
Update `StepBio` to read `fishingData` instead of `step2Data`, and read `intentData` and `sellerTypeData` from the store. In `handleFinish`, include `is_seller: true` in the `updateMember` call only when `intentData.intent === 'seller'` AND `sellerTypeData.sellerType === 'free'`. When intent is `'seller'` and sellerType is `'shop'`, do NOT set `is_seller` (shop creation is separate). When intent is `'buyer'`, do not set `is_seller`.
**Files:** `src/features/members/components/onboarding/step-bio/index.tsx`
**AC:** Buyer path does not set `is_seller`. Seller+free path sets `is_seller = true`. Seller+shop path does not set `is_seller`. Component reads from renamed `fishingData` field. `pnpm typecheck` passes.
**Expert Domains:** nextjs, supabase

## Phase 2: New Step Components
**Goal:** Create the two new step components (intent selection and seller type selection) with proper accessibility and mobile-first styling
**Verify:** `pnpm build && pnpm lint && pnpm lint:styles`

### Task 2.1: Create step-intent component
Create the intent selection step (step 2) with two large selection cards: "I'm here to buy" and "I want to buy and sell". Use a `role="radiogroup"` container with `role="radio"` and `aria-checked` on each card. Cards should have an icon (use `react-icons/hi` -- e.g. `HiShoppingBag` for buyer, `HiCurrencyDollar` for seller), a title, and a short description. Selecting a card highlights it and enables the "Next" button. Read/write `intentData` from the onboarding store. Include a "Back" button that calls `prevStep`. Follow the layout pattern from `step-fishing-identity` (header, content, sticky footer with Button).
**Files:** `src/features/members/components/onboarding/step-intent/index.tsx`, `src/features/members/components/onboarding/step-intent/step-intent.module.scss`
**AC:** Renders two selectable cards with `role="radiogroup"` and `role="radio"`. `aria-checked` reflects selection state. Keyboard navigation works (arrow keys move focus, Enter/Space selects). "Next" button is disabled until a choice is made. Selecting a card stores intent in the onboarding store. Mobile-first SCSS with `@include breakpoint()` for larger viewports. Minimum 44x44px tap targets. `pnpm lint` and `pnpm lint:styles` pass.
**Expert Domains:** nextjs, scss

### Task 2.2: Create step-seller-type component
Create the seller type step (step 4, seller path only) with two selection cards: "Free -- sell on your profile" and "Shop (premium)". Same `role="radiogroup"` / `role="radio"` pattern as step-intent. The "Shop" card should include a brief note like "Coming soon -- create your shop from the dashboard" to indicate it is a placeholder CTA. Read/write `sellerTypeData` from the onboarding store. Include "Back" button. Follow same layout patterns as step-intent.
**Files:** `src/features/members/components/onboarding/step-seller-type/index.tsx`, `src/features/members/components/onboarding/step-seller-type/step-seller-type.module.scss`
**AC:** Renders two selectable cards with proper ARIA radiogroup semantics. Keyboard navigation works. "Next" button disabled until a choice is made. Selection stored in onboarding store. "Shop" option shows a "coming soon" note. Mobile-first SCSS. `pnpm lint` and `pnpm lint:styles` pass.
**Expert Domains:** nextjs, scss

## Phase 3: Wizard Integration and Progress Indicator
**Goal:** Wire the new steps into the wizard container and update the progress indicator to reflect dynamic step counts
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles`

### Task 3.1: Update progress indicator for dynamic total steps
Modify the `ProgressIndicator` component to accept `totalSteps` from the wizard (it already has a `totalSteps` prop defaulting to 3, so this is just about passing the correct value from the parent). Also add a `stepMap` prop (array of visual step numbers) so that when the buyer path shows steps 1,2,3 visually, the progress indicator renders 3 circles even though the internal step numbers are 1,2,3,5. The indicator needs to map logical step numbers to visual positions. Alternatively, the simpler approach: the wizard passes `visualStep` and `totalSteps` to the progress indicator, where `visualStep` is computed from the logical step and the intent.
**Files:** `src/features/members/components/onboarding/progress-indicator/index.tsx`
**AC:** Progress indicator renders the correct number of circles (3 for buyer, 5 for seller). Current step highlights correctly for both paths. Completed steps show checkmarks. No visual regression for the default case. `pnpm typecheck` passes.
**Expert Domains:** nextjs

### Task 3.2: Update onboarding wizard to render all 5 steps with conditional routing
Import `StepIntent` and `StepSellerType` into the wizard. Read `intentData` and `totalSteps` from the onboarding store. Render step components based on `currentStep`: 1 = StepDisplayName, 2 = StepIntent, 3 = StepFishingIdentity, 4 = StepSellerType (seller only), 5 = StepBio. Compute `visualStep` for the progress indicator: for buyer path, map logical steps {1,2,3,5} to visual {1,2,3,3}; for seller path, map {1,2,3,4,5} directly. Pass `visualStep` and `totalSteps` to `ProgressIndicator`.
**Files:** `src/features/members/components/onboarding/onboarding-wizard/index.tsx`
**AC:** Buyer path shows steps 1->2->3->5 (3 visual steps in progress). Seller path shows steps 1->2->3->4->5 (5 visual steps). Step 4 only renders for seller intent. Back navigation from step 5 goes to step 3 for buyers, step 4 for sellers. All steps render correctly. `pnpm build` passes.
**Expert Domains:** nextjs, state-management

### Task 3.3: Update progress indicator SCSS for 5-step layout
Adjust the progress indicator styles to handle 5 steps gracefully on mobile. The connecting lines may need a smaller `max-width` when there are 5 steps. Add a conditional class or adjust the gap/line widths to ensure 5 circles fit on small screens without overflow.
**Files:** `src/features/members/components/onboarding/progress-indicator/progress-indicator.module.scss`
**AC:** 5-step progress indicator fits on 320px viewport width without horizontal overflow. Line widths scale proportionally. 3-step layout is not visually regressed. `pnpm lint:styles` passes.
**Expert Domains:** scss

### Task 3.4: Update members feature CLAUDE.md
Update the members feature documentation to reflect the new onboarding flow: 5 potential steps (3 for buyer, 5 for seller), new store fields (`intentData`, `sellerTypeData`, `fishingData`), new components (`step-intent`, `step-seller-type`), and the branching logic. Update the onboarding components table and state management section.
**Files:** `src/features/members/CLAUDE.md`
**AC:** CLAUDE.md accurately describes the new 5-step branching wizard, lists all new components, documents the store shape with intent/seller-type fields, and explains the buyer vs seller path routing.
**Expert Domains:** nextjs
