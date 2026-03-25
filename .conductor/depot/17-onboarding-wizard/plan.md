# Implementation Plan: #17 — Onboarding wizard

## Overview

4 phases, 16 total tasks
Estimated scope: large

## Phase 1: Foundation — Types, Validations, Zustand Store, and Sharp Dependency

**Goal:** Establish the data layer, validation schemas, and wizard state management so subsequent phases can build UI on a stable foundation.
**Verify:** `pnpm build`

### Task 1.1: Add sharp dependency

Install `sharp` as a production dependency for server-side avatar image resizing.
**Files:** `package.json`
**AC:** `pnpm add sharp` completes successfully and `sharp` appears in `package.json` dependencies.
**Expert Domains:** nextjs

### Task 1.2: Create onboarding validation schemas

Create Yup schemas for all three wizard steps following the pattern in `src/features/auth/validations/auth.ts`. Step 1: `displayName` (string, 3-40 chars, required). Step 2: `primarySpecies` (array of strings, optional), `primaryTechnique` (array of strings, optional), `homeState` (string, optional). Step 3: `bio` (string, max 280 chars, optional).
**Files:** `src/features/profiles/validations/onboarding.ts`
**AC:** Three exported schemas (`step1Schema`, `step2Schema`, `step3Schema`) with the specified constraints. Importing them causes no type errors.
**Expert Domains:** state-management

### Task 1.3: Create onboarding types

Define TypeScript types for the wizard: `OnboardingStep1Data`, `OnboardingStep2Data`, `OnboardingStep3Data`, `OnboardingFormData` (union of all three), species/technique option constants as `readonly` arrays, and a `US_STATES` constant array with `{ value, label }` entries for all 50 states + DC.
**Files:** `src/features/profiles/types/onboarding.ts`
**AC:** All types and constants are exported. `OnboardingFormData` includes fields from all three steps. Species list includes: bass, trout, walleye, muskie, pike, panfish, catfish, saltwater, carp, fly, ice, other. Technique list includes: spinning, casting, fly, trolling, ice, jigging, drop_shot, topwater, surf, other.
**Expert Domains:** state-management

### Task 1.4: Create onboarding Zustand store

Create a Zustand store to manage wizard state: current step (1-3), form data for all steps, navigation methods (`nextStep`, `prevStep`, `setStepData`, `reset`). Use the `createSelectors` utility from `src/libs/create-selectors.ts` for typed selectors. The store holds transient wizard state only — no persistence.
**Files:** `src/features/profiles/stores/onboarding-store.ts`
**AC:** Store exports `useOnboardingStore` with `use.currentStep()`, `use.stepData()`, `use.nextStep()`, `use.prevStep()`, `use.setStepData()`, `use.reset()`. Step transitions are clamped to 1-3 range.
**Expert Domains:** state-management

### Task 1.5: Create onboarding completion service function

Add a `completeOnboarding` function to `src/features/profiles/services/profile.ts` that accepts a `userId` and calls `updateProfile` with `onboarding_completed_at` set to the current ISO timestamp. This reuses the existing `updateProfile` function which already handles the Supabase update and RLS.
**Files:** `src/features/profiles/services/profile.ts`
**AC:** `completeOnboarding(userId)` is exported, calls `updateProfile` with `{ onboarding_completed_at: new Date().toISOString() }`, and returns the updated `Profile`.
**Expert Domains:** supabase

### Task 1.6: Create useCompleteOnboarding mutation hook

Add a Tanstack Query mutation hook that calls `completeOnboarding`, invalidates the `['profiles']` query key on success. Follow the pattern of `useUpdateProfile` in `src/features/profiles/hooks/use-profile.ts`.
**Files:** `src/features/profiles/hooks/use-profile.ts`
**AC:** `useCompleteOnboarding()` is exported, uses `useMutation`, invalidates profiles queries on success.
**Expert Domains:** state-management

## Phase 2: Avatar Upload API Route and Reusable Components

**Goal:** Build the avatar upload endpoint and the two reusable UI components (avatar-upload and pill-selector) that the wizard steps depend on.
**Verify:** `pnpm build`

### Task 2.1: Create avatar upload API route

Create a POST endpoint at `src/app/api/profiles/avatar/route.ts` following the pattern of `src/app/api/products/upload/route.ts`. Authenticate via server Supabase client. Accept a `file` from `FormData`. Use `sharp` to resize to 200x200 and convert to WebP. Upload to Supabase Storage bucket `avatars` at path `{user_id}.webp` with `upsert: true` and `contentType: 'image/webp'`. Return `{ url: publicUrl }`. Validate file exists, is an image (JPEG/PNG/WebP/GIF), and is under 5MB before processing.
**Files:** `src/app/api/profiles/avatar/route.ts`
**AC:** POST with valid image returns `{ url }` with Supabase Storage public URL. Missing file returns 400. Non-image returns 400. Unauthenticated returns 401. Image is resized to 200x200 WebP.
**Expert Domains:** supabase, nextjs

### Task 2.2: Create avatar-upload component

Create a reusable `'use client'` component that renders a circular avatar preview with click-to-upload. When no image is set, render initials on a colored circle (derive initials from `displayName` prop, color from a deterministic hash of the name using CSS `hsl()`). On file selection, call the avatar API route via `fetch`, show a loading spinner during upload, and call `onUpload(url)` on success. Include a hidden `<input type="file" accept="image/*">`. Minimum 44x44px tap target. All styles mobile-first using CSS Modules.
**Files:** `src/features/profiles/components/avatar-upload/index.tsx`, `src/features/profiles/components/avatar-upload/avatar-upload.module.scss`
**AC:** Component renders initials fallback when no `avatarUrl` prop. Clicking triggers file picker. Successful upload calls `onUpload` with the URL. Loading state is visually indicated. Accessible: button has `aria-label`, file input is screen-reader accessible.
**Expert Domains:** nextjs, scss

### Task 2.3: Create pill-selector component

Create a reusable `'use client'` multi-select pill component. Props: `options: { value: string; label: string }[]`, `selected: string[]`, `onChange: (selected: string[]) => void`, `label: string` (for accessibility). Renders horizontally scrolling pills with `overflow-x: auto` and `scroll-snap-type: x mandatory`. Each pill is a `<button>` that toggles selection (aria-pressed). Selected pills get a distinct visual style (filled primary color). All styles mobile-first. Minimum 44px height on pill buttons.
**Files:** `src/features/profiles/components/pill-selector/index.tsx`, `src/features/profiles/components/pill-selector/pill-selector.module.scss`
**AC:** Component renders all options as pills. Clicking toggles selection state. `onChange` is called with updated array. Horizontal scroll works on narrow viewports with snap. `aria-pressed` reflects selection state. `role="group"` with `aria-label` on container.
**Expert Domains:** scss

## Phase 3: Wizard Page and Step Components

**Goal:** Build the onboarding page and all three wizard step components with full form logic, assembling the foundation and components from phases 1-2.
**Verify:** `pnpm build`

### Task 3.1: Create step 1 component — Display Name and Avatar

Create `'use client'` component for step 1. Uses `react-hook-form` with `yupResolver(step1Schema)` in `mode: 'onBlur'`. Display name input triggers `useDisplayNameCheck` on blur (debounced via the hook's `enabled` condition). Show green checkmark icon (`HiCheckCircle` from `react-icons/hi`) when available, red X (`HiXCircle`) when taken, with inline text feedback. Render slug preview as read-only text below display name (use `generateSlug` from profile services). Render `AvatarUpload` component. "Next" button disabled until display name is valid (3+ chars) and available. Store data in Zustand store on submit via `setStepData`.
**Files:** `src/features/profiles/components/onboarding/step-display-name/index.tsx`, `src/features/profiles/components/onboarding/step-display-name/step-display-name.module.scss`
**AC:** Display name input validates length (3-40). Availability check fires on blur for names >= 2 chars. Green check / red X renders based on availability. Slug preview updates live. Avatar upload works. "Next" is disabled until name is valid and available. Data persists to Zustand store on advance.
**Expert Domains:** nextjs, scss, state-management

### Task 3.2: Create step 2 component — Fishing Identity

Create `'use client'` component for step 2. Renders two `PillSelector` instances (species and techniques) using constants from onboarding types. Renders a native `<select>` for home state using the `US_STATES` constant. All fields optional — "Next" is always enabled. "Back" text link at top left calls `prevStep`. Store data in Zustand store on submit.
**Files:** `src/features/profiles/components/onboarding/step-fishing-identity/index.tsx`, `src/features/profiles/components/onboarding/step-fishing-identity/step-fishing-identity.module.scss`
**AC:** Species and technique pill selectors render all options. Selections persist through back/forward navigation via Zustand. Home state dropdown includes all 50 states + DC. "Back" returns to step 1 with data preserved. "Next" advances to step 3.
**Expert Domains:** nextjs, scss, state-management

### Task 3.3: Create step 3 component — Bio

Create `'use client'` component for step 3. Renders a `<textarea>` with 280 char limit and live character counter (e.g., "42 / 280"). Placeholder text from the issue. "Skip" renders as a secondary text link that completes onboarding without bio. "Back" text link at top left. "Finish" button triggers onboarding completion. Uses `useCompleteOnboarding` mutation and `useUpdateProfile` mutation to save all wizard data, then redirects to `/` and shows "Welcome to Nessi!" toast via `useToast`.
**Files:** `src/features/profiles/components/onboarding/step-bio/index.tsx`, `src/features/profiles/components/onboarding/step-bio/step-bio.module.scss`
**AC:** Textarea enforces 280 char max. Live counter displays current / max. "Skip" completes onboarding without bio. "Finish" saves all wizard data (display_name, slug, avatar_url, primary_species, primary_technique, home_state, bio) and sets `onboarding_completed_at`. Redirects to `/` with "Welcome to Nessi!" toast. "Back" returns to step 2.
**Expert Domains:** nextjs, scss, state-management

### Task 3.4: Create progress indicator component

Create a progress indicator showing 3 circles connected by lines. Current step circle is filled primary color, completed steps are filled with a check, future steps are outlined. Uses CSS for the connecting lines. Accessible: `aria-label="Onboarding progress"`, each step has `aria-current="step"` when active.
**Files:** `src/features/profiles/components/onboarding/progress-indicator/index.tsx`, `src/features/profiles/components/onboarding/progress-indicator/progress-indicator.module.scss`
**AC:** Renders 3 connected circles. Visual state reflects current step. Accessible labels present. Mobile-first styles.
**Expert Domains:** scss

### Task 3.5: Create onboarding wizard container and page

Create the wizard container component that reads `currentStep` from Zustand store and renders the appropriate step component with CSS slide transitions. Wrap with `FormProvider` where needed. Create the Next.js page at `src/app/(frontend)/onboarding/page.tsx` that renders the wizard. The page should use `useAuth()` to get the current user — if not authenticated, redirect to `/`. Add page metadata with title "Set Up Your Profile".
**Files:** `src/features/profiles/components/onboarding/onboarding-wizard/index.tsx`, `src/features/profiles/components/onboarding/onboarding-wizard/onboarding-wizard.module.scss`, `src/app/(frontend)/onboarding/page.tsx`, `src/app/(frontend)/onboarding/onboarding.module.scss`
**AC:** `/onboarding` renders the 3-step wizard for authenticated users. Steps transition with CSS animations. Progress indicator shows current step. Layout is centered, mobile-friendly, with sticky "Next"/"Finish" at bottom on mobile. Unauthenticated users are redirected.
**Expert Domains:** nextjs, scss, state-management

## Phase 4: Proxy Onboarding Guard and Polish

**Goal:** Wire up the middleware-level onboarding redirect logic so incomplete users are forced to `/onboarding` and completed users are redirected away, then handle edge cases.
**Verify:** `pnpm build`

### Task 4.1: Update proxy.ts with onboarding redirect logic

After the existing `getUser()` call, if user exists: query profiles table for `onboarding_completed_at` using the same Supabase client already created in proxy. Skip the query for paths matching `/onboarding`, `/api/*`, `/auth/*`, `/_next/*`, or static assets (already excluded by the matcher config). If `onboarding_completed_at` is null and path is not `/onboarding` — redirect to `/onboarding`. If `onboarding_completed_at` is set and path is `/onboarding` — redirect to `/`. Keep existing dashboard guard and auth page guard logic intact.
**Files:** `src/proxy.ts`
**AC:** Authenticated user without completed onboarding visiting `/dashboard` is redirected to `/onboarding`. Authenticated user with completed onboarding visiting `/onboarding` is redirected to `/`. API routes and static assets are never queried or redirected. Existing proxy tests still pass. `/auth/callback` is not affected.
**Expert Domains:** nextjs, supabase

### Task 4.2: Update CLAUDE.md for profiles feature

Update `src/features/profiles/CLAUDE.md` to document the new onboarding components, store, validations, and avatar upload route. Add entries for the Zustand store, the three step components, the wizard container, the avatar-upload and pill-selector reusable components, and the avatar API route.
**Files:** `src/features/profiles/CLAUDE.md`
**AC:** CLAUDE.md accurately reflects all new files, their purposes, and their relationships. Store pattern documented. Avatar upload route documented.
**Expert Domains:** nextjs
