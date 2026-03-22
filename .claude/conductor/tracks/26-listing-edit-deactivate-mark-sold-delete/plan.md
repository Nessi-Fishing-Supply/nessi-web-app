# Implementation Plan: #26 — Listing edit, deactivate, mark as sold, and delete

## Overview
5 phases, 23 total tasks
Estimated scope: large

## Phase 1: Database Schema & API Foundation
**Goal:** Add missing database columns (`sold_at`, `watcher_count`), update status transition rules, and extend services/hooks for deactivate/activate/mark-as-sold semantics.
**Verify:** `pnpm build`

### Task 1.1: Add `sold_at` and `watcher_count` columns to the listings table
The ticket requires `sold_at` (set when status transitions to sold) and `watcher_count` (displayed in quick-edit price notice and dashboard rows). Neither column exists in the current schema. Apply a Supabase migration that adds `sold_at timestamptz null` and `watcher_count integer default 0` to the `listings` table, then regenerate TypeScript types.
**MCP:** supabase
**Files:** `src/types/database.ts` (regenerated via `pnpm db:types`)
**AC:** `sold_at` and `watcher_count` columns exist on the `listings` table; `pnpm db:types` produces updated `database.ts` with both fields present in the Row, Insert, and Update types.
**Expert Domains:** supabase

### Task 1.2: Update status transition map to support deactivate/activate flows
The current `VALID_TRANSITIONS` in `src/app/api/listings/[id]/status/route.ts` uses `active→archived` and `archived→active` but does not handle `sold` with `sold_at` or allow passing `sold_price_cents`. Update the PATCH handler to: (1) set `sold_at = NOW()` when transitioning to `sold`, (2) accept an optional `sold_price_cents` in the request body and persist it if the listing table supports it (or store in the update payload), (3) keep the existing transition map which already maps "deactivate" = `archived` and "activate" = `archived→active`. Also add `active→sold` explicit `sold_at` write.
**Files:** `src/app/api/listings/[id]/status/route.ts`
**AC:** PATCH to `/api/listings/{id}/status` with `{ status: 'sold' }` sets `sold_at` timestamp on the listing; `{ status: 'archived' }` from active works (deactivate); `{ status: 'active' }` from archived works (activate).
**Expert Domains:** supabase, nextjs

### Task 1.3: Extend listing types with `sold_at`, `watcher_count`, and status-related helpers
Add `sold_at` and `watcher_count` to the exported `Listing` type (already derived from `database.ts` Row, so this happens automatically after 1.1). Add a `LISTING_STATUS_LABELS` constant mapping status enum values to display labels (Active, Draft, Sold, Deactivated, Deleted) and a `LISTING_STATUS_COLORS` constant mapping to Pill color props (success, default, primary, warning, error). Create a `StatusBadge` helper type. These constants will be consumed by the dashboard listing row and status tabs.
**Files:** `src/features/listings/constants/status.ts` (new), `src/features/listings/types/listing.ts` (verify types auto-update from database.ts)
**AC:** Importing `LISTING_STATUS_LABELS` and `LISTING_STATUS_COLORS` from `constants/status.ts` compiles; status labels map `draft→"Draft"`, `active→"Active"`, `sold→"Sold"`, `archived→"Deactivated"`, `deleted→"Deleted"`.
**Expert Domains:** state-management

### Task 1.4: Add optimistic cache updates to listing mutation hooks
The existing `useUpdateListing`, `useDeleteListing`, and `useUpdateListingStatus` hooks in `src/features/listings/hooks/use-listings.ts` only invalidate queries on success. Add `onMutate` optimistic updates that patch the Tanstack Query cache for `['listings', 'seller', ...]` queries before the server responds, and `onError` rollbacks. This provides instant UI feedback for status changes, price edits, and deletes on the dashboard.
**Files:** `src/features/listings/hooks/use-listings.ts`
**AC:** Calling `useUpdateListingStatus` optimistically updates the listing's status in the seller listings query cache before the API responds; on error, the previous data is restored.
**Expert Domains:** state-management

## Phase 2: Edit Wizard — Step Refactoring & Wizard Store
**Goal:** Make the existing create wizard step components support edit mode via `initialData` and `mode` props, create the edit wizard Zustand store, and build the WizardProgress clickable step navigation for edit mode.
**Verify:** `pnpm build`

### Task 2.1: Create the edit wizard Zustand store
Create a new Zustand store for the edit wizard that mirrors the create wizard store shape but: (1) initializes from a `ListingWithPhotos` object instead of defaults, (2) tracks `changedFields` set to know which fields were modified (for partial save), (3) has no `persist` middleware (edits pull fresh from server, not localStorage), (4) uses `createSelectors` wrapper. The store should have a `hydrate(listing: ListingWithPhotos)` action and a `getChangedData()` selector that returns only modified fields.
**Files:** `src/features/listings/stores/edit-wizard-store.ts` (new)
**AC:** `useEditWizardStore.use.title()` returns the hydrated listing title; after calling `setField('title', 'new')`, `getChangedData()` returns `{ title: 'new' }` without other fields.
**Expert Domains:** state-management

### Task 2.2: Refactor step components to accept `mode` and use a store abstraction
Each step component currently imports `useCreateWizardStore` directly. Refactor so that each step component accepts an optional `storeHook` prop (or use React Context) that provides the same `use.fieldName()` / `setField()` interface. The default remains `useCreateWizardStore` so the create flow is unaffected. In edit mode, the edit wizard will pass `useEditWizardStore`. Refactor `CategoryConditionStep`, `DetailsStep`, `PricingStep`, `ShippingStep`, and `ReviewStep` to use this abstraction. `PhotosStep` already receives photos via props and does not need store changes.
**Files:** `src/features/listings/components/create-wizard/steps/category-condition-step.tsx`, `src/features/listings/components/create-wizard/steps/details-step.tsx`, `src/features/listings/components/create-wizard/steps/pricing-step.tsx`, `src/features/listings/components/create-wizard/steps/shipping-step.tsx`, `src/features/listings/components/create-wizard/steps/review-step.tsx`, `src/features/listings/components/create-wizard/wizard-store-context.tsx` (new)
**AC:** The create wizard continues to function identically (step components default to create wizard store); step components accept an alternative store via context; `pnpm build` passes; no regressions in create flow.
**Expert Domains:** state-management, nextjs

### Task 2.3: Make WizardProgress support clickable/jumpable steps in edit mode
The current `WizardProgress` component renders step circles as non-interactive `<span>` elements. Add an `onStepClick?: (step: number) => void` prop. When provided (edit mode), render completed and future steps as `<button>` elements with click handlers and `cursor: pointer` styling. When not provided (create mode), keep the current non-interactive rendering. Add appropriate ARIA: `role="button"`, `aria-label="Go to step N: Label"`.
**Files:** `src/features/listings/components/create-wizard/wizard-progress.tsx`, `src/features/listings/components/create-wizard/wizard-progress.module.scss`
**AC:** In edit mode, clicking any step circle calls `onStepClick` with the step number; in create mode, steps remain non-interactive; all step buttons meet 44x44px tap target; `:focus-visible` styles present.
**Expert Domains:** scss, nextjs

## Phase 3: Edit Wizard Page & Dashboard Listings Page
**Goal:** Build the edit wizard route with server-side ownership check, the edit wizard client component, and the rebuilt dashboard listings page with status tabs and listing rows.
**Verify:** `pnpm build`

### Task 3.1: Create the edit wizard server page with ownership guard
Create the edit route at `/dashboard/listings/[id]/edit`. The server component fetches the listing via `getListingByIdServer`, verifies the current user is the `seller_id` (redirect to `/` if not), and passes the listing data to the client component. Include `generateMetadata` for the page title ("Edit {title}").
**Files:** `src/app/(frontend)/dashboard/listings/[id]/edit/page.tsx` (new)
**AC:** Authenticated owner navigating to `/dashboard/listings/{id}/edit` sees the edit wizard pre-populated; non-owner is redirected to `/`; unauthenticated user is redirected by proxy.ts.
**Expert Domains:** nextjs, supabase

### Task 3.2: Build the EditWizard client component
Create the edit wizard client component that wraps the same step components as `CreateWizard` but: (1) hydrates `useEditWizardStore` from the server-provided `ListingWithPhotos`, (2) provides the edit store via `WizardStoreContext`, (3) renders `WizardProgress` with `onStepClick` for jumpable navigation, (4) shows a "Save changes" button on every step (not just review) that calls `useUpdateListing` with only changed fields from `getChangedData()`, (5) for photos, loads existing photos from `listing.listing_photos` into the photo manager (not IndexedDB). The footer shows "Save changes" (primary) and "Cancel" (secondary, navigates back).
**Files:** `src/features/listings/components/edit-wizard/index.tsx` (new), `src/features/listings/components/edit-wizard/edit-wizard.module.scss` (new)
**AC:** Edit wizard renders all 5 steps pre-populated; clicking step indicator jumps to that step; "Save changes" sends only changed fields via PUT; unchanged listing saves successfully with no API call.
**Expert Domains:** nextjs, state-management, scss

### Task 3.3: Build the dashboard listings page with status tabs
Rebuild `src/app/(frontend)/dashboard/listings/page.tsx` to show the seller's listings with horizontal status tabs (All, Active, Drafts, Sold, Deactivated). Use the existing `PillSelector` component (single-select mode variant) or build status tabs using `<button>` elements with `aria-pressed`. Fetch data via `useSellerListings(status)` with the selected status filter. Show tab counts by fetching all listings once and computing counts client-side. Include a "Create listing" button linking to `/dashboard/listings/new`. Show an empty state per tab.
**Files:** `src/app/(frontend)/dashboard/listings/page.tsx` (rewrite), `src/app/(frontend)/dashboard/listings/listings-dashboard.module.scss` (new)
**Reuses:** `src/components/controls/pill-selector/` (for scrollable pill tabs pattern) or `src/components/controls/button/`
**AC:** Dashboard shows status tabs with correct counts; selecting a tab filters listings; "All" tab is selected by default; empty state shows when no listings match the filter; horizontal scroll on mobile.
**Expert Domains:** nextjs, state-management, scss

### Task 3.4: Build the ListingRow component for dashboard
Create a listing row component that displays: thumbnail (first photo, 60x60 mobile / 80x80 desktop via `next/image`), title (truncated 1 line), formatted price (right-aligned), status badge (using `Pill` with color from `LISTING_STATUS_COLORS`), view count, watcher count, and days listed (calculated from `published_at` or `created_at`). Drafts show a "Continue editing" link to `/dashboard/listings/new?draftId={id}`. Each row includes a placeholder for the three-dot actions menu (added in Phase 4). Mobile: card-like stacked layout. Desktop: table-row-like horizontal layout.
**Files:** `src/features/listings/components/listing-row/index.tsx` (new), `src/features/listings/components/listing-row/listing-row.module.scss` (new)
**Reuses:** `src/components/indicators/pill/` (for status badge)
**AC:** Listing row renders thumbnail, title, price, status pill, stats; draft rows show "Continue editing" link; layout is card-like on mobile, table-row-like on desktop; thumbnail uses `next/image` with `sizes` attribute; 44x44px minimum tap targets.
**Expert Domains:** nextjs, scss

## Phase 4: Action Components — Three-Dot Menu, Mark as Sold, Delete Confirmation
**Goal:** Build the listing actions menu, mark-as-sold modal, and delete confirmation dialog. Wire them into the dashboard listing rows.
**Verify:** `pnpm build`

### Task 4.1: Build the ListingActionsMenu (three-dot) component
Create a three-dot actions menu component that renders differently based on listing status: Active listings show Edit, Mark as Sold, Deactivate, Delete. Archived/deactivated listings show Edit, Activate, Delete. Draft listings show Edit (→ create wizard with draftId), Delete. Sold listings show Edit (view-only or limited), Delete. Use the existing `Dropdown` component for desktop (dropdown menu) and render a bottom sheet on mobile (using `Modal` with bottom-anchored positioning via CSS). The trigger is a 44x44px icon button with `HiDotsVertical` from `react-icons`.
**Files:** `src/features/listings/components/listing-actions-menu/index.tsx` (new), `src/features/listings/components/listing-actions-menu/listing-actions-menu.module.scss` (new)
**Reuses:** `src/components/controls/dropdown/` (for desktop), `src/components/layout/modal/` (for mobile bottom sheet)
**AC:** Three-dot button opens a menu with context-appropriate actions; menu is a dropdown on desktop, bottom sheet on mobile; each action item has 44x44px tap target; Escape closes the menu; focus returns to trigger on close.
**Expert Domains:** nextjs, scss

### Task 4.2: Build the MarkSoldModal component
Create a confirmation modal for marking a listing as sold. It shows the listing title, an optional sale price input (dollar-to-cents, reusing the pricing input pattern from `PricingStep`), and "Mark as Sold" (primary) + "Cancel" (secondary) buttons. On confirm, calls `useUpdateListingStatus` with `{ status: 'sold' }`. The `sold_at` is set server-side (Task 1.2). Uses the existing `Modal` component.
**Files:** `src/features/listings/components/mark-sold-modal/index.tsx` (new), `src/features/listings/components/mark-sold-modal/mark-sold-modal.module.scss` (new)
**Reuses:** `src/components/layout/modal/`
**AC:** Modal shows listing title and optional sale price input; "Mark as Sold" button triggers status update to `sold`; after success, modal closes and listing appears in Sold tab; cancel closes modal without changes.
**Expert Domains:** nextjs, scss, state-management

### Task 4.3: Build the delete confirmation dialog
Create a delete confirmation dialog using the existing `Modal` component. Shows "Delete this listing? This can't be undone." with a red "Delete" button and secondary "Cancel" button. On confirm, calls `useDeleteListing` (which already does soft-delete via the API). On success, show a toast and remove the listing from the dashboard view.
**Files:** `src/features/listings/components/delete-listing-modal/index.tsx` (new), `src/features/listings/components/delete-listing-modal/delete-listing-modal.module.scss` (new)
**Reuses:** `src/components/layout/modal/`, `src/components/indicators/toast/context.tsx`
**AC:** Delete confirmation shows warning text; "Delete" button is styled red/error; confirm triggers soft-delete; listing disappears from dashboard; toast confirms deletion; cancel closes without action.
**Expert Domains:** nextjs, scss

### Task 4.4: Wire actions menu into ListingRow and integrate modals into dashboard
Connect the `ListingActionsMenu` to each `ListingRow`. Add state management in the dashboard page for which modal is open (mark-sold, delete) and which listing is targeted. Wire Edit action to navigate to `/dashboard/listings/{id}/edit` (or `/dashboard/listings/new?draftId={id}` for drafts). Wire Deactivate/Activate actions to call `useUpdateListingStatus` directly (no modal needed). Wire Mark as Sold and Delete to open their respective modals.
**Files:** `src/app/(frontend)/dashboard/listings/page.tsx` (update), `src/features/listings/components/listing-row/index.tsx` (update)
**AC:** All actions in the three-dot menu work: Edit navigates to edit wizard, Mark as Sold opens modal, Deactivate/Activate toggles status, Delete opens confirmation; status changes reflect immediately via optimistic updates.
**Expert Domains:** nextjs, state-management

## Phase 5: Quick-Edit Price & Polish
**Goal:** Build the quick-edit price bottom sheet/popover, add watcher notice, and handle remaining edge cases and accessibility polish.
**Verify:** `pnpm build`

### Task 5.1: Build the QuickEditPrice bottom sheet component
Create a compact price editor that opens from the listing row without entering the full wizard. On mobile: bottom sheet (Modal with bottom-anchored CSS). On desktop: popover positioned relative to the trigger. Contains: price input (auto-focused on open, dollar-to-cents conversion), live fee calculator (Nessi fee + "You'll receive" net), and "Save" button. If `watcher_count > 0`, shows notice: "{X} people are watching. Lowering your price will notify them." Uses `useUpdateListing` to PATCH only `price_cents`.
**Files:** `src/features/listings/components/quick-edit-price/index.tsx` (new), `src/features/listings/components/quick-edit-price/quick-edit-price.module.scss` (new)
**Reuses:** `src/components/layout/modal/` (for mobile bottom sheet)
**AC:** Quick-edit opens from dashboard row; price input is auto-focused; fee calculator updates live with 200ms debounce; watcher notice appears when `watcher_count > 0`; "Save" patches only `price_cents`; success closes the sheet and updates the row price.
**Expert Domains:** nextjs, scss, state-management

### Task 5.2: Add quick-edit price trigger to ListingRow
Add a tap/click handler on the price display in `ListingRow` that opens the `QuickEditPrice` component for active listings. Show a subtle edit icon (pencil) next to the price on hover/focus to indicate editability. Non-active listings (sold, draft, archived) should not show the quick-edit affordance.
**Files:** `src/features/listings/components/listing-row/index.tsx` (update), `src/features/listings/components/listing-row/listing-row.module.scss` (update)
**AC:** Clicking the price on an active listing row opens the quick-edit price sheet; pencil icon appears on hover/focus; non-active listings do not show the edit affordance.
**Expert Domains:** scss, nextjs

### Task 5.3: Add "Edit listing" entry point on listing detail page
The listing detail page (`src/app/(frontend)/listing/[id]/listing-detail.tsx`) shows `isOwnListing` but currently has no edit button. Add an "Edit listing" button (or link) visible only to the listing owner that navigates to `/dashboard/listings/{id}/edit`. Position it in the action bar area near the price.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx` (update)
**AC:** Listing owner sees an "Edit listing" button on the detail page; clicking it navigates to the edit wizard; non-owners do not see the button.
**Expert Domains:** nextjs

### Task 5.4: Update listings CLAUDE.md with new components and patterns
Update the listings feature CLAUDE.md to document: the edit wizard store, edit wizard component, listing actions menu, mark-sold modal, delete modal, quick-edit price, listing row, dashboard status tabs, and the status constants. Add the new pages to the pages table and new components to the components table.
**Files:** `src/features/listings/CLAUDE.md` (update)
**AC:** CLAUDE.md documents all new components, stores, constants, and pages added in this ticket; component table includes all new entries with location and purpose.
**Expert Domains:** nextjs
