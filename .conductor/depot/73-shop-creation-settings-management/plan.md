# Implementation Plan: #73 — Build shop creation flow, settings page, and management UI

## Overview

5 phases, 17 total tasks
Estimated scope: large

## Phase 1: Foundation — Validations, slug utility, and shop avatar API route

**Goal:** Establish the validation schemas, shared slug generation utility, and server-side avatar upload route that all subsequent UI phases depend on.
**Verify:** `pnpm build`

### Task 1.1: Create shop validation schemas

Create Yup validation schemas for shop creation and shop settings update, following the same pattern as `src/features/members/validations/onboarding.ts`. The creation schema validates shop_name (3-60 chars, required), slug (2-60 chars, lowercase alphanumeric + hyphens, required), and description (optional, max 500 chars). The settings update schema validates the same fields but all optional (for inline editing).
**Files:** `src/features/shops/validations/shop.ts`
**Expert Domains:** nextjs
**AC:** `createShopSchema` validates name length 3-60, slug format (lowercase alphanumeric + hyphens, 2-60 chars), and optional description max 500 chars. `updateShopSchema` has same field constraints but all fields optional. Schemas export cleanly and `pnpm typecheck` passes.

### Task 1.2: Extract generateSlug into shared utility

The `generateSlug` function in `src/features/members/services/member.ts` is a pure function with no database dependency. Move it to `src/features/shared/utils/slug.ts` so both members and shops can import it. Update the members service import to use the shared location.
**Files:** `src/features/shared/utils/slug.ts` (create), `src/features/members/services/member.ts` (modify import)
**Expert Domains:** nextjs
**AC:** `generateSlug` is exported from `src/features/shared/utils/slug.ts`. The members service re-exports or imports from the shared location. All existing imports of `generateSlug` from the members service still work. `pnpm build` passes.

### Task 1.3: Create shop avatar upload API route

Create `POST /api/shops/avatar` following the exact same pattern as `src/app/api/members/avatar/route.ts`. The route authenticates the user, accepts a `file` field and a `shopId` field from FormData, validates the file (MIME type, 5MB limit), resizes to 200x200 WebP via Sharp, and uploads to the `avatars` bucket with path `shop-{shopId}.webp` using upsert. It must also verify the authenticated user is the shop owner before allowing upload.
**Files:** `src/app/api/shops/avatar/route.ts`
**Expert Domains:** supabase, nextjs
**AC:** `POST /api/shops/avatar` with FormData containing `file` (image) and `shopId` (string) returns `{ url: string }` on success. Returns 401 for unauthenticated users, 403 if user is not the shop owner, 400 for invalid file type or missing shopId, 413 for files over 5MB. Avatar is stored at `avatars/shop-{shopId}.webp`.

## Phase 2: Shop creation form and page

**Goal:** Build the shop creation form component and its page route so users can create a new shop from the dashboard.
**Verify:** `pnpm build`

### Task 2.1: Create shop creation form component

Build the `ShopCreationForm` component at `src/features/shops/components/shop-creation-form/`. The form uses `react-hook-form` with `FormProvider` and the `createShopSchema` from Task 1.1. Fields: shop name (`Input`), slug (`Input` with real-time availability check via `useShopSlugCheck` with debounce -- same pattern as display name check in `PersonalInfo`), description (`Textarea`), and avatar upload (reuse `AvatarUpload` from members, but POST to `/api/shops/avatar` instead). The slug field auto-generates from shop name on change (using shared `generateSlug`) but is editable. Show check/X availability icons like `PersonalInfo` does for display name. On submit, call `useCreateShop()` mutation with `{ shop_name, slug, description, owner_id, avatar_url }`, then call `useAddShopMember()` to create the owner shop_member entry, reserve the slug via Supabase RPC `reserve_slug`, switch context to the new shop via `useContextStore`, and redirect to `/dashboard`.
**Files:** `src/features/shops/components/shop-creation-form/index.tsx`, `src/features/shops/components/shop-creation-form/shop-creation-form.module.scss`
**Reuses:** `src/components/controls/input/`, `src/components/controls/text-area/`, `src/components/controls/button/`, `src/features/members/components/avatar-upload/` (will need to make avatar upload endpoint configurable or create a shop-specific variant)
**Expert Domains:** nextjs, scss, state-management
**AC:** Form renders with shop name, slug (auto-generated, editable), description, and avatar upload fields. Slug availability indicator shows check/X icons with debounced checking. Submit creates shop, adds owner as shop_member, reserves slug, switches context, and redirects to `/dashboard`. Form validation prevents submit with invalid name length or taken slug.

### Task 2.2: Create shop avatar upload component or make AvatarUpload configurable

The existing `AvatarUpload` component hardcodes the upload endpoint to `/api/members/avatar`. Either make it accept an `uploadUrl` prop (preferred, since the component is otherwise identical) or create a thin wrapper. The shop variant needs to pass `shopId` in the FormData alongside the file.
**Files:** `src/features/members/components/avatar-upload/index.tsx` (modify to accept optional `uploadUrl` and `extraFormData` props), OR `src/features/shops/components/shop-avatar-upload/index.tsx` (create shop-specific variant)
**Expert Domains:** nextjs
**AC:** Avatar upload works for both member avatars (default `/api/members/avatar`) and shop avatars (passing `/api/shops/avatar` with `shopId` in FormData). Existing member avatar upload behavior is unchanged.

### Task 2.3: Create shop creation page route

Create the page at `src/app/(frontend)/dashboard/shop/create/page.tsx`. This is a `'use client'` page that renders the `ShopCreationForm` component. It reads `useAuth()` to get the current user ID (passed as `ownerId` to the form). Page styling follows the account page pattern (max-width container, title, single-section layout).
**Files:** `src/app/(frontend)/dashboard/shop/create/page.tsx`, `src/app/(frontend)/dashboard/shop/create/create-shop.module.scss`
**Reuses:** `src/components/controls/button/`
**Expert Domains:** nextjs, scss
**AC:** `/dashboard/shop/create` renders the shop creation form. Unauthenticated users are redirected by proxy.ts (existing behavior). Page has a title "Create Your Shop" and the form below it. Mobile-first responsive layout matching account page width constraints.

## Phase 3: Shop settings page with inline editing

**Goal:** Build the shop settings page where shop owners can edit shop details using inline editing, matching the account page pattern.
**Verify:** `pnpm build`

### Task 3.1: Create shop details settings section component

Build `ShopDetailsSection` at `src/features/shops/components/shop-settings/shop-details-section/`. This section uses the same card pattern as `PersonalInfo` in the account page. It displays shop name (inline-editable), slug/handle (inline-editable with availability check and "changing your handle will break existing links" warning), description (inline-editable, multiline, 500 char max), and avatar (using the configurable `AvatarUpload`). Each field saves independently via `useUpdateShop()` mutation. Slug changes also call `reserve_slug` RPC for the new slug.
**Files:** `src/features/shops/components/shop-settings/shop-details-section/index.tsx`, `src/features/shops/components/shop-settings/shop-details-section/shop-details-section.module.scss`
**Reuses:** `src/components/controls/inline-edit/`, `src/features/members/components/avatar-upload/` (with configurable endpoint from Task 2.2), `src/components/indicators/toast/context.tsx`
**Expert Domains:** nextjs, scss, state-management
**AC:** Shop name, slug, description are inline-editable. Slug changes show availability indicator and a warning about broken links. Avatar upload works via `/api/shops/avatar`. Each field saves independently on confirm. Toast notifications appear on save success.

### Task 3.2: Create Stripe placeholder section component

Build a simple `ShopSubscriptionSection` placeholder at `src/features/shops/components/shop-settings/shop-subscription-section/`. This renders a card with title "Subscription & Billing", a description "Manage your shop's subscription plan and billing details", and a disabled "Coming Soon" button. This satisfies the ticket constraint of having a Stripe placeholder without implementation.
**Files:** `src/features/shops/components/shop-settings/shop-subscription-section/index.tsx`, `src/features/shops/components/shop-settings/shop-subscription-section/shop-subscription-section.module.scss`
**Reuses:** `src/components/controls/button/`
**Expert Domains:** nextjs, scss
**AC:** Section renders with "Subscription & Billing" title, description text, and a disabled button labeled "Coming Soon". No Stripe logic is implemented.

### Task 3.3: Create shop settings page route

Create the page at `src/app/(frontend)/dashboard/shop/settings/page.tsx`. This is a `'use client'` page that reads the active context from `useContextStore` to get the `shopId`, fetches the shop via `useShop(shopId)`, and renders the settings sections. If the active context is not a shop, redirect to `/dashboard`. Page layout matches the account page pattern with title "Shop Settings" and stacked sections.
**Files:** `src/app/(frontend)/dashboard/shop/settings/page.tsx`, `src/app/(frontend)/dashboard/shop/settings/shop-settings.module.scss`
**Expert Domains:** nextjs, scss, state-management
**AC:** `/dashboard/shop/settings` renders shop details section and Stripe placeholder section when in shop context. Redirects to `/dashboard` when in member context. Loading and error states are handled. Layout matches account page styling conventions.

## Phase 4: Ownership transfer and shop deletion

**Goal:** Build the ownership transfer UI and shop deletion danger zone in the shop settings page.
**Verify:** `pnpm build`

### Task 4.1: Create ownership transfer component

Build `OwnershipTransfer` at `src/features/shops/components/shop-settings/ownership-transfer-section/`. This section renders a card with title "Ownership Transfer". It fetches shop members via `useShopMembers(shopId)` and displays a dropdown (`<select>`) to pick a new owner from non-owner members. When a member is selected and "Transfer Ownership" is clicked, a first confirmation modal appears ("Are you sure you want to transfer ownership to {name}?"). On confirm, a second modal appears ("This action is irreversible. You will lose owner privileges. Type the shop name to confirm.") with a text input that must match the shop name exactly. On final confirm, call `useTransferOwnership()` mutation, show success toast, and switch context back to member.
**Files:** `src/features/shops/components/shop-settings/ownership-transfer-section/index.tsx`, `src/features/shops/components/shop-settings/ownership-transfer-section/ownership-transfer-section.module.scss`
**Reuses:** `src/components/layout/modal/`, `src/components/controls/button/`, `src/components/indicators/toast/context.tsx`
**Expert Domains:** nextjs, scss, state-management
**AC:** Dropdown lists non-owner shop members. Transfer requires two confirmation steps: first a simple confirm, then typing the shop name exactly. After transfer, context switches to member and success toast shows. If shop has no other members, section shows explanatory text instead of the transfer form.

### Task 4.2: Create shop deletion component

Build `ShopDeletion` at `src/features/shops/components/shop-settings/shop-deletion-section/`. This renders a danger zone card (red-themed, matching the account page danger zone styling) with title "Delete Shop", warning text about permanent deletion, and a "Delete Shop" button. Clicking opens a confirmation modal requiring the user to type the shop name to confirm. On confirm, call `useDeleteShop()` mutation (soft-delete sets `deleted_at`), then call Supabase RPC `release_slug` for the shop's slug, switch context to member via `useContextStore`, show success toast, and redirect to `/dashboard`.
**Files:** `src/features/shops/components/shop-settings/shop-deletion-section/index.tsx`, `src/features/shops/components/shop-settings/shop-deletion-section/shop-deletion-section.module.scss`
**Reuses:** `src/components/layout/modal/`, `src/components/controls/button/`, `src/components/indicators/toast/context.tsx`
**Expert Domains:** nextjs, scss, state-management
**AC:** Danger zone section renders with red-themed styling. Delete requires typing shop name to confirm. After deletion, slug is released, context switches to member, success toast shows, and user is redirected to `/dashboard`.

### Task 4.3: Wire ownership transfer and deletion into shop settings page

Add the `OwnershipTransfer` and `ShopDeletion` components to the shop settings page, below the existing sections. Only render these sections if the current user is the shop owner (check `shop.owner_id === user.id`).
**Files:** `src/app/(frontend)/dashboard/shop/settings/page.tsx` (modify)
**Expert Domains:** nextjs
**AC:** Ownership transfer and deletion sections appear on the shop settings page only when the current user is the shop owner. Non-owner members see only the details and subscription sections.

## Phase 5: Side-nav context awareness and polish

**Goal:** Update the side-nav to show context-appropriate navigation items and finalize documentation.
**Verify:** `pnpm build`

### Task 5.1: Make side-nav context-aware

Convert `SideNav` to a `'use client'` component that reads `useContextStore` for the active context. In member context, show: Dashboard, Account, Products, and a "Create a Shop" link to `/dashboard/shop/create`. In shop context, show: Dashboard, Shop Settings (links to `/dashboard/shop/settings`), Products, and a "Back to Member" link that calls `switchToMember()`. Use appropriate icons from `react-icons/hi` (`HiOutlineCog` for settings, `HiOutlinePlus` or `HiOutlineShoppingBag` for create shop). Guard context-dependent rendering behind the `useSyncExternalStore` mounted pattern used in the navbar to prevent hydration mismatches.
**Files:** `src/components/navigation/side-nav/index.tsx` (modify), `src/components/navigation/side-nav/side-nav.module.scss` (modify if needed)
**Reuses:** `src/components/controls/app-link/`
**Expert Domains:** nextjs, scss, state-management
**AC:** In member context, side-nav shows Dashboard, Account, Products, and "Create a Shop" link. In shop context, side-nav shows Dashboard, Shop Settings, Products, and "Back to Member" button. No hydration mismatch errors. Context switches are reflected immediately in the side-nav.

### Task 5.2: Add "Create a Shop" CTA to dashboard page

Add a prominent "Create a Shop" card or CTA section on the main dashboard page (`/dashboard`) that links to `/dashboard/shop/create`. This should be visible when the user is in member context. In shop context, the dashboard should show the current shop name instead. This is a lightweight addition -- just a link card, not a full redesign of the dashboard.
**Files:** `src/app/(frontend)/dashboard/page.tsx` (modify), `src/app/(frontend)/dashboard/dashboard.module.scss` (modify if needed)
**Expert Domains:** nextjs, scss
**AC:** Dashboard page shows a "Create a Shop" CTA card linking to `/dashboard/shop/create` when in member context. In shop context, the CTA is hidden or replaced with shop identity display. Mobile-first responsive.

### Task 5.3: Update shops feature CLAUDE.md documentation

Update `src/features/shops/CLAUDE.md` to document all new components, the avatar upload API route, validation schemas, and the relationship between shop creation form, shop settings page, and the context store. Document which shared components are reused (InlineEdit, Modal, AvatarUpload, CollapsibleCard).
**Files:** `src/features/shops/CLAUDE.md` (modify)
**Expert Domains:** nextjs
**AC:** CLAUDE.md documents all new shop components (creation form, settings sections, ownership transfer, deletion), the avatar upload API route, validation schemas, and component reuse patterns. Component table lists all new components with their purpose.
