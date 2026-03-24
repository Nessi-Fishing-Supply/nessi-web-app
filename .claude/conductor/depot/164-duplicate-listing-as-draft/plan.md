# Implementation Plan: #164 — Duplicate listing as draft

## Overview
3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Service Layer — API Route, Client Service, and Hook
**Goal:** Create the backend duplicate endpoint that copies listing data into a new draft, and expose it through the client service and Tanstack Query hook.
**Verify:** `pnpm build`

### Task 1.1: Create the duplicate-as-draft API route
Create a new `POST /api/listings/[id]/duplicate` API route that reads the source listing, verifies ownership via the authenticated user's `seller_id`, and inserts a new listing row with `status: 'draft'` copying these fields from the source: `title`, `description`, `category`, `condition`, `price_cents`, `shipping_paid_by`, `shipping_price_cents`, `weight_oz`, `brand`, `model`, `quantity`, `location_city`, `location_state`. The new draft must NOT copy photos, `cover_photo_url`, `published_at`, `sold_at`, view/favorite/inquiry/watcher counts, or `search_vector`. The route must handle the `X-Nessi-Context` header to set `member_id`/`shop_id` on the new draft (same pattern as `POST /api/listings/drafts`). Return the new draft as `ListingWithPhotos` (with empty `listing_photos` array). Return 401 if unauthenticated, 404 if source listing not found or soft-deleted, 403 if not owned by the user.
**Files:** `src/app/api/listings/[id]/duplicate/route.ts`
**AC:** POST to `/api/listings/{id}/duplicate` creates a new draft with all specified fields copied; photos are not copied; original listing is unmodified; returns 201 with the new draft; returns 401/403/404 for auth/ownership/not-found errors
**Expert Domains:** supabase, nextjs

### Task 1.2: Add duplicateListing client service function
Add a `duplicateListing` function to the existing listing service module that calls `POST /api/listings/{id}/duplicate` via the `post` fetch helper. The function takes a `sourceId: string` parameter and returns `Promise<ListingWithPhotos>`.
**Files:** `src/features/listings/services/listing.ts`
**AC:** `duplicateListing(id)` calls the correct endpoint and returns the new draft; follows the existing service function patterns (uses `post` from `@/libs/fetch`)
**Expert Domains:** nextjs

### Task 1.3: Add useDuplicateListing Tanstack Query mutation hook
Add a `useDuplicateListing` hook to the existing listings hooks module. It should be a `useMutation` that calls `duplicateListing`, invalidates the `['listings']` query key on success (so the dashboard refreshes), and returns the mutation result. The hook does NOT handle navigation or toast -- those will be handled by the consuming components in Phase 2.
**Files:** `src/features/listings/hooks/use-listings.ts`
**AC:** `useDuplicateListing()` returns a mutation; on success it invalidates `['listings']` queries; follows the existing hook patterns in the file (e.g., `useCreateDraft`, `useDeleteListing`)
**Expert Domains:** state-management

## Phase 2: UI Integration — Dashboard Menu and Listing Detail Actions
**Goal:** Add the "Duplicate" action to both the seller dashboard three-dot menu and the listing detail page owner view, with navigation to the create wizard and toast notification.
**Verify:** `pnpm build`

### Task 2.1: Add "Duplicate" action to ListingActionsMenu
Add a new `onDuplicate` callback prop to `ListingActionsMenu`. Insert a "Duplicate" action item into the `actions` array for listings with status `active`, `sold`, or `archived` (all non-draft, non-deleted statuses). Position it after "Edit" and before status-change actions. When clicked, call `onClose()` then `onDuplicate()`.
**Files:** `src/features/listings/components/listing-actions-menu/index.tsx`
**AC:** "Duplicate" menu item appears for active, sold, and archived listings; does not appear for draft listings; calls the `onDuplicate` callback when clicked
**Reuses:** `src/components/layout/modal/`
**Expert Domains:** nextjs

### Task 2.2: Wire duplicate action in the listings dashboard page
In the listings dashboard page, import and use `useDuplicateListing`. Add a `handleDuplicate` function that calls the mutation with the target listing ID. On success: show a toast ("Listing duplicated as draft -- add photos to publish"), then navigate to `/dashboard/listings/new?draftId={newDraftId}`. On error: show an error toast. Pass the new `onDuplicate` handler to `ListingActionsMenu`. Add `'duplicate'` to the `ModalType` union if needed for loading state management, though the duplicate action does not require a confirmation modal.
**Files:** `src/app/(frontend)/dashboard/listings/page.tsx`
**AC:** Clicking "Duplicate" in the three-dot menu creates a new draft via the API; user sees a success toast with the message "Listing duplicated as draft -- add photos to publish"; user is redirected to the create wizard with the new draft pre-filled; error case shows an error toast
**Reuses:** `src/components/indicators/toast/context.tsx`
**Expert Domains:** nextjs, state-management

### Task 2.3: Add "Duplicate" button to listing detail page owner view
In the listing detail component, add a "Duplicate as Draft" button in the `isOwnListing` action area, below the existing "Edit listing" link. Also add it for the `isSold` state (when the seller views their own sold listing). Import and use `useDuplicateListing`. On success: show the same toast and navigate to `/dashboard/listings/new?draftId={newDraftId}`. The button should use the `Button` component with `style="secondary"` and `outline`. For sold listings owned by the current user, show both the "sold" banner and the "Duplicate as Draft" button below it.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:** "Duplicate as Draft" button appears when viewing own listing (active or sold status); clicking it creates a new draft and redirects to the create wizard; sold listings show the sold banner AND the duplicate button; toast notification matches the dashboard behavior
**Reuses:** `src/components/controls/button/`, `src/components/indicators/toast/context.tsx`
**Expert Domains:** nextjs, state-management

## Phase 3: Create Wizard Compatibility and Edge Cases
**Goal:** Ensure the create wizard correctly hydrates all duplicated fields from the draft, starts at Step 1 (photos), and handles edge cases like archived listings and missing optional fields.
**Verify:** `pnpm build`

### Task 3.1: Verify and fix create wizard hydration for duplicated drafts
The create wizard already hydrates from `initialDraft` via `?draftId=`. However, the current `targetStep` calculation in the `useEffect` advances to the first incomplete step. For duplicated drafts (which have all fields filled but zero photos), this should correctly land on Step 1 because `draftPhotos.length >= 2` is false. Verify this logic works correctly. Additionally, ensure the wizard hydrates `brand`, `model`, `quantity`, `location_city`, `location_state`, `shipping_price_cents` if those fields are stored on the draft but not currently in the Zustand store. If any copied fields are not in the create wizard store (e.g., `brand`, `model`), they are already persisted on the draft row in the database and will be preserved when the wizard publishes via `updateListing`. No Zustand store changes are needed since the wizard publishes by updating the existing draft row.
**Files:** `src/features/listings/components/create-wizard/index.tsx`
**AC:** A duplicated draft with all fields filled but no photos opens the create wizard at Step 1 (Photos); all pre-filled data (title, description, category, condition, price, shipping) is visible when navigating to those steps; fields not in the Zustand store (brand, model, etc.) are preserved on the draft row and not lost during publish
**Expert Domains:** state-management, nextjs

### Task 3.2: Ensure duplicate works for archived listings
Archived listings have `status: 'archived'`. The API route must not filter by status -- it should allow duplicating any non-deleted listing owned by the user regardless of status (active, sold, archived, even draft). Verify the API route query does not include a `.eq('status', ...)` filter. Also verify the `ListingActionsMenu` shows "Duplicate" for archived listings (Task 2.1 should handle this, but verify the `status === 'archived'` branch includes it).
**Files:** `src/app/api/listings/[id]/duplicate/route.ts`
**AC:** Duplicating an archived listing succeeds and creates a new draft; duplicating a sold listing succeeds; duplicating a draft listing is allowed (edge case); the API only rejects soft-deleted listings (`deleted_at IS NOT NULL`)

### Task 3.3: Update listings feature CLAUDE.md documentation
Add the new `POST /api/listings/[id]/duplicate` route to the API Routes section. Add `useDuplicateListing` to the hooks table. Document the duplicate-as-draft flow in the Key Patterns section: source listing fields copied, photos excluded, wizard starts at Step 1.
**Files:** `src/features/listings/CLAUDE.md`
**AC:** CLAUDE.md documents the new API route, hook, and duplicate flow; accurately describes which fields are copied and which are excluded
