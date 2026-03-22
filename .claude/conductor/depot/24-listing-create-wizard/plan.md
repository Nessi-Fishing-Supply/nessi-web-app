# Implementation Plan: #24 — Listing create wizard

## Overview
4 phases, 18 total tasks
Estimated scope: large

## Phase 1: Foundation — Zustand store, Yup validations, category selector
**Goal:** Establish the wizard's client state layer, per-step validation schemas, and the reusable category selector component so all subsequent wizard steps have their dependencies in place.
**Verify:** `pnpm build`

### Task 1.1: Create the create-wizard Zustand store
Create the Zustand store that holds all wizard form data, current step index, draft/listing IDs, and actions for setting fields, navigating steps, and resetting. Use `zustand/middleware` `persist` with a `nessi-create-wizard` localStorage key so the wizard survives page refreshes. Wrap with `createSelectors` from `@/libs/create-selectors.ts` following the pattern in `src/features/context/stores/context-store.ts`.

Store shape per the ticket: `step` (1-6), `photos` (ListingPhoto[]), `category`, `condition`, `title`, `description`, `fishingHistory`, `priceCents`, `shippingPreference` ('ship' | 'local_pickup'), `shippingPaidBy` ('buyer' | 'seller' | null), `weightOz`, `packageDimensions` ({length, width, height} | null), `listingId`, `draftId`, `setStep`, `setField` (generic setter), `reset`.

**Files:** `src/features/listings/stores/create-wizard-store.ts`
**AC:** Store exports a `useCreateWizardStore` with auto-generated selectors; `useCreateWizardStore.use.step()` returns `1` by default; `reset()` clears all fields to defaults; store persists to localStorage under key `nessi-create-wizard`.
**Expert Domains:** state-management

### Task 1.2: Create per-step Yup validation schemas
Create Yup validation schemas for each wizard step: `photosSchema` (photos array min 2), `categoryConditionSchema` (category required, condition required), `detailsSchema` (title 10-80 chars, description 20-2000 chars, fishingHistory optional max 500 chars), `pricingSchema` (priceCents min 100 max 999900, shippingPreference required), `shippingSchema` (weightOz required positive, packageDimensions.length/width/height required positive, shippingPaidBy required). Export a `STEP_SCHEMAS` array mapping step index to its schema so the wizard can dynamically resolve validation per step.

**Files:** `src/features/listings/validations/listing.ts`
**AC:** Each schema validates independently; `photosSchema` rejects arrays with fewer than 2 items; `detailsSchema` rejects titles under 10 chars; `pricingSchema` rejects priceCents below 100 or above 999900; `shippingSchema` is only applied when shippingPreference is 'ship'.
**Expert Domains:** nextjs

### Task 1.3: Create the category selector component
Build a reusable tile-grid component that renders `LISTING_CATEGORIES` from `src/features/listings/constants/category.ts` as selectable icon tiles. Each tile shows the category icon (from `react-icons`) and label. Single-select behavior via `value`/`onChange` props. The grid is 2 columns on mobile, 3 on tablet (`md`), 4 on desktop (`lg`). Active tile has a highlighted border using `--color-primary`. The component is placed in `src/features/listings/components/category-selector/` since it is listing-domain-specific but reusable across create and edit wizards.

Note: The issue mentions 12 categories but `LISTING_CATEGORIES` currently has 10 entries. The component should render whatever is in the constant array — do not hardcode a count.

**Files:** `src/features/listings/components/category-selector/index.tsx`, `src/features/listings/components/category-selector/category-selector.module.scss`
**AC:** Renders all entries from `LISTING_CATEGORIES` as tiles; selected tile has visual highlight; calls `onChange` with the category value on click; keyboard accessible (Enter/Space selects); mobile-first responsive grid (2 cols base, 3 at `md`, 4 at `lg`); each tile has `role="radio"` within a `role="radiogroup"` fieldset.
**Expert Domains:** scss

### Task 1.4: Export new modules from the listings barrel
Add exports for the new store, validations, and category selector to the listings barrel file so they are importable via `@/features/listings`.

**Files:** `src/features/listings/index.ts`
**AC:** `useCreateWizardStore` exported from store; `STEP_SCHEMAS` and individual schemas exported from validations; `CategorySelector` exported as default component; no circular dependency issues; `pnpm build` passes.

## Phase 2: Wizard shell and first three steps (Photos, Category/Condition, Details)
**Goal:** Create the wizard container with step navigation, progress indicator, slide transitions, and implement Steps 1-3 so the user can upload photos, select category/condition, and enter listing details.
**Verify:** `pnpm build`

### Task 2.1: Create the wizard progress bar component
Build a horizontal step progress indicator that shows 5 labeled steps (Photos, Category, Details, Pricing, Shipping) plus a 6th unlabeled Review dot. The current step is highlighted, completed steps show a checkmark. On mobile, show only the step number dots (labels hidden); on `md`+, show labels below dots. Use a `<nav>` with `aria-label="Listing creation progress"` and `aria-current="step"` on the active step.

**Files:** `src/features/listings/components/create-wizard/wizard-progress.tsx`, `src/features/listings/components/create-wizard/wizard-progress.module.scss`
**AC:** Renders 6 step indicators; current step has `aria-current="step"`; completed steps show check icon; labels visible only at `md` breakpoint; mobile shows numbered dots; component accepts `currentStep` and `totalSteps` props.
**Expert Domains:** scss

### Task 2.2: Create the wizard shell (CreateWizard container component)
Build the main wizard container that renders the progress bar, the active step component, and navigation buttons (Back/Next/Save Draft). The wizard reads `step` from the Zustand store and renders the corresponding step component. Implement slide-left/slide-right CSS transitions when step changes. The "Next" button is sticky/fixed at the bottom on mobile (48px height, full-width). "Save draft and exit" link is always visible in the header area. The wizard prevents form submission on Enter for non-final steps by wrapping each step in a `<form>` with `onSubmit` that calls `preventDefault` unless on the review step. Browser back button support: use `window.history.pushState` when navigating forward and `popstate` listener to go back a step without losing state.

**Files:** `src/features/listings/components/create-wizard/index.tsx`, `src/features/listings/components/create-wizard/create-wizard.module.scss`
**AC:** Renders progress bar and active step; Next button validates current step via Yup schema before advancing; Back button goes to previous step; slide transition animates between steps; Enter key does not submit on non-review steps; browser back navigates to previous wizard step; "Save draft and exit" button visible on all steps; sticky Next button on mobile (fixed bottom, 48px, full-width).
**Reuses:** `src/components/controls/button/` (Button component)
**Expert Domains:** nextjs, scss, state-management

### Task 2.3: Create the route page (server component)
Create the Next.js page at `/dashboard/listings/new`. This is a server component that optionally loads an existing draft by `draftId` query param (using `getListingByIdServer` from `src/features/listings/services/listing-server.ts`), then passes the draft data as props to the client `CreateWizard` component. If no draft param, renders the wizard with empty state. The route is under `/dashboard/` so proxy.ts handles auth protection automatically.

**Files:** `src/app/(frontend)/dashboard/listings/new/page.tsx`
**AC:** `/dashboard/listings/new` renders the CreateWizard component when authenticated; unauthenticated users are redirected to `/` by proxy.ts; page accepts optional `?draftId=` query param; if draftId provided, loads draft data server-side and passes to wizard; page has metadata with title "Create Listing".
**Expert Domains:** nextjs, supabase

### Task 2.4: Implement Step 1 — Photos step
Build the photos step that renders the existing `PhotoManager` component from `src/features/listings/components/photo-manager/`. The step needs a `listingId` to upload photos against — if no draft exists yet, it creates one via `useCreateDraft()` on first photo add, then stores the returned `listingId` and `draftId` in the Zustand store. Display the minimum photos requirement (2) and a "?" icon button that opens a modal with photo guidance tips (from `CATEGORY_PHOTO_GUIDANCE`). The Next button is disabled until photos.length >= 2. Photos array is synced to the Zustand store via `onPhotosChange`.

**Files:** `src/features/listings/components/create-wizard/steps/photos-step.tsx`
**AC:** Renders PhotoManager with listingId from store; creates a draft on first photo upload if no listingId exists; stores listingId/draftId in wizard store; "?" button opens photo guidance modal; Next disabled with < 2 photos; photos synced to Zustand store.
**Reuses:** `src/features/listings/components/photo-manager/` (PhotoManager), `src/components/layout/modal/` (Modal)
**Expert Domains:** state-management

### Task 2.5: Implement Step 2 — Category & Condition step
Build the step that renders the `CategorySelector` (from Task 1.3) and `ConditionSelector` (existing at `src/features/listings/components/condition-selector/`). Both selections are stored in the Zustand store. The condition selector receives the selected category so it can show category-specific photo guidance. Next is disabled until both category and condition are selected.

**Files:** `src/features/listings/components/create-wizard/steps/category-condition-step.tsx`
**AC:** Renders CategorySelector and ConditionSelector; both values read from and write to the Zustand store; ConditionSelector receives the selected category for contextual guidance; Next disabled until both fields have values.
**Reuses:** `src/features/listings/components/category-selector/` (CategorySelector), `src/features/listings/components/condition-selector/` (ConditionSelector)
**Expert Domains:** state-management

### Task 2.6: Implement Step 3 — Details step
Build the step with title, description, and fishing history fields using react-hook-form with the `detailsSchema` Yup resolver. Title is a text input (10-80 chars), description is a textarea (20-2000 chars), fishing history is an optional textarea (500 chars). All fields show live character counters below them (e.g., "24 / 80"). Fields sync to the Zustand store on change. The existing `Input` and `Textarea` components from `src/components/controls/` integrate with react-hook-form via `useFormContext`, so wrap the step in a `FormProvider`.

**Files:** `src/features/listings/components/create-wizard/steps/details-step.tsx`
**AC:** Title input with 10-80 char validation and live counter; description textarea with 20-2000 char validation and live counter; fishing history textarea optional with 500 char max and live counter; all fields pre-populated from Zustand store; validation errors shown inline; form uses react-hook-form with yupResolver.
**Reuses:** `src/components/controls/input/` (Input), `src/components/controls/text-area/` (Textarea)
**Expert Domains:** nextjs

## Phase 3: Steps 4-5 and Review screen
**Goal:** Complete the remaining wizard steps (Pricing, Shipping) and the Review screen with publish/save-draft actions, enabling the full end-to-end wizard flow.
**Verify:** `pnpm build`

### Task 3.1: Implement Step 4 — Pricing step
Build the pricing step with a price input that has a "$" prefix and `inputmode="decimal"`. The input converts dollar values to cents for storage in the Zustand store. Include a live fee calculator that shows: Nessi fee (from `calculateFee`), your earnings (from `calculateNet`), and formatted prices (from `formatPrice`). The fee display updates with a 200ms debounce after the user stops typing. Include a shipping preference toggle: "I'll ship this item" vs "Local pickup only" — stored as `shippingPreference` in the store. Min price $1.00 (100 cents), max $9,999.00 (999900 cents).

**Files:** `src/features/listings/components/create-wizard/steps/pricing-step.tsx`, `src/features/listings/components/create-wizard/steps/pricing-step.module.scss`
**AC:** Price input with "$" prefix and `inputmode="decimal"`; converts display dollars to cents in store; fee calculator shows Nessi fee and net earnings; fee updates within 200ms debounce; shipping preference toggle between "I'll ship" and "Local pickup only"; min $1 / max $9,999 validation; $10 shows $0.99 fee; $20 shows $1.20 fee.
**Reuses:** `src/components/controls/toggle/` (Toggle)
**Expert Domains:** state-management

### Task 3.2: Implement Step 5 — Shipping step
Build the shipping step, only rendered when `shippingPreference === 'ship'`. If "Local pickup only" was selected, the wizard skips directly to Review. Fields: weight in lbs + oz (two inputs, converted to total oz for storage), package dimensions (length, width, height in inches), and shipping payer choice ("Buyer pays" / "Seller pays" radio buttons). Include a collapsible "What box should I use?" section with general shipping tips. All values sync to the Zustand store.

**Files:** `src/features/listings/components/create-wizard/steps/shipping-step.tsx`, `src/features/listings/components/create-wizard/steps/shipping-step.module.scss`
**AC:** Only renders when shippingPreference is 'ship'; weight inputs for lbs and oz, stores total oz; dimension inputs for L x W x H; shipping payer radio buttons (buyer/seller); collapsible box guidance section; all values sync to store; step skipped entirely when local pickup selected.
**Reuses:** `src/components/controls/radio-button/` (RadioButton), `src/components/layout/collapsible-card/` (CollapsibleCard if applicable)
**Expert Domains:** scss

### Task 3.3: Implement Step 6 — Review step
Build the review step that displays a read-only summary of all wizard data: a listing card preview (using `ListingCard` or a simplified preview card showing cover photo, title, price, condition badge) and a details breakdown (category, condition, description, shipping info, fees). Two action buttons: "Publish Listing" (primary, sets status to 'active' via `useUpdateListing` then `useUpdateListingStatus`) and "Save as Draft" (secondary, redirects without status change since the listing is already a draft). Publish redirects to `/listing/[id]` (or `/item/[id]` matching the existing `ListingCard` link pattern). Save draft redirects to `/dashboard/listings`. Both actions clear the Zustand store via `reset()`.

**Files:** `src/features/listings/components/create-wizard/steps/review-step.tsx`, `src/features/listings/components/create-wizard/steps/review-step.module.scss`
**AC:** Shows listing preview card with cover photo, title, price, condition; shows details summary (all fields); "Publish Listing" button updates listing fields + sets status to active + redirects to detail page; "Save as Draft" button redirects to /dashboard/listings; both actions reset the wizard store; publish button shows loading state during submission.
**Reuses:** `src/features/listings/components/condition-badge/` (ConditionBadge), `src/components/controls/button/` (Button)
**Expert Domains:** nextjs, state-management

### Task 3.4: Wire step skipping logic in the wizard shell
Update the wizard shell (CreateWizard) to handle step 5 (shipping) being skipped when `shippingPreference === 'local_pickup'`. When the user clicks Next on step 4 (pricing) and local pickup is selected, advance directly to step 6 (review). Similarly, when on review and clicking Back, go to step 4 if local pickup. Update the progress bar to show step 5 as "skipped" (grayed out) when local pickup is selected.

**Files:** `src/features/listings/components/create-wizard/index.tsx`
**AC:** Next from step 4 goes to step 6 when shippingPreference is 'local_pickup'; Back from step 6 goes to step 4 when local pickup; progress bar shows step 5 as skipped/grayed when local pickup selected; normal flow preserved when 'ship' is selected.
**Expert Domains:** state-management

## Phase 4: Auto-save, draft resume, and polish
**Goal:** Add auto-save every 30 seconds, draft resume on wizard load, and remaining UX polish (transitions, accessibility, final build verification).
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 4.1: Implement auto-save draft logic
Create a custom hook `useAutoSaveDraft` that saves the current wizard state to the backend every 30 seconds of inactivity (debounced). It uses `useUpdateListing` to persist title, description, price, category, condition, and other fields to the existing draft listing. The hook should track a `lastSavedAt` timestamp and show a subtle "Draft saved" indicator. Only saves when there are actual changes (dirty check against last-saved values). The hook is used inside the CreateWizard component.

**Files:** `src/features/listings/hooks/use-auto-save-draft.ts`
**AC:** Saves draft to backend after 30 seconds of inactivity; uses useUpdateListing mutation; only saves when data has changed since last save; exposes `lastSavedAt` timestamp and `isSaving` boolean; does not save if no listingId exists yet (pre-photo-upload state); cleans up timer on unmount.
**Expert Domains:** state-management

### Task 4.2: Implement draft resume on wizard load
Update the wizard page and CreateWizard component to handle draft resume. When the page loads with a `?draftId=` query param, the server component fetches the draft data. The CreateWizard receives this as `initialDraft` prop and hydrates the Zustand store with the draft's values (title, description, price, category, condition, photos, etc.) and sets the step to the last incomplete step. Add logic to determine the "last incomplete step" by checking which step's required fields are populated.

**Files:** `src/app/(frontend)/dashboard/listings/new/page.tsx`, `src/features/listings/components/create-wizard/index.tsx`
**AC:** Loading `/dashboard/listings/new?draftId=xyz` hydrates wizard store with draft data; wizard starts at the first step with incomplete required fields; photos are loaded from the draft's listing_photos; all populated fields are pre-filled in their respective steps; works for drafts up to 7 days old.
**Expert Domains:** nextjs, supabase

### Task 4.3: Implement "Save draft and exit" action
Wire the "Save draft and exit" button that is visible on all steps. When clicked, it saves the current wizard state to the backend (same as auto-save but immediate), clears the Zustand store, and redirects to `/dashboard/listings`. If no draft exists yet (step 1, no photos), it simply clears the store and redirects without saving. Show a toast confirmation "Draft saved" on successful save.

**Files:** `src/features/listings/components/create-wizard/index.tsx`
**AC:** "Save draft and exit" visible on all steps; saves current state to backend when draft exists; clears wizard store after save; redirects to /dashboard/listings; shows success toast; handles case where no draft exists (just redirects).
**Reuses:** `src/components/indicators/toast/context.tsx` (useToast)
**Expert Domains:** state-management

### Task 4.4: Add WCAG 2.1 AA accessibility refinements
Audit all wizard components for accessibility compliance. Ensure: all form inputs have `aria-required`, `aria-invalid`, `aria-describedby` linking to error messages; the progress bar uses `aria-current="step"`; focus is moved to the step heading when navigating between steps; the sticky Next button has `aria-busy` during validation; the photo guidance modal has focus trap; all interactive elements have visible `:focus-visible` outlines and minimum 44x44px tap targets on mobile.

**Files:** `src/features/listings/components/create-wizard/index.tsx`, `src/features/listings/components/create-wizard/steps/photos-step.tsx`, `src/features/listings/components/create-wizard/steps/category-condition-step.tsx`, `src/features/listings/components/create-wizard/steps/details-step.tsx`, `src/features/listings/components/create-wizard/steps/pricing-step.tsx`, `src/features/listings/components/create-wizard/steps/shipping-step.tsx`, `src/features/listings/components/create-wizard/steps/review-step.tsx`, `src/features/listings/components/create-wizard/wizard-progress.tsx`
**AC:** All form fields have `aria-required` on required fields; error messages linked via `aria-describedby`; `aria-invalid` set on error state; focus moves to step heading on navigation; sticky button has `aria-busy` when loading; all tap targets are >= 44x44px; keyboard navigation works through all steps; screen reader announces step changes via `aria-live` region.
**Expert Domains:** scss
