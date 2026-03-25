# Implementation Plan: #241 — Build Roles & Permissions dashboard page with system role display and upsell gate

## Overview

4 phases, 14 total tasks
Estimated scope: medium

## Phase 1: Service Layer and API Route

**Goal:** Add the service function, Tanstack Query hook, and API route for fetching shop roles so the data layer is available before building UI.
**Verify:** `pnpm build`

### Task 1.1: Add getShopRoles service function to shop.ts

Add a `getShopRoles(shopId)` function to `src/features/shops/services/shop.ts` that calls `GET /api/shops/{shopId}/roles` using the `get` helper from `@/libs/fetch`. The function should return `ShopRole[]` (from `@/features/shops/types/permissions`). Follow the existing pattern used by `getShopMembers` but route through the API endpoint (since the API enforces permission checks via `requireShopPermission`).
**Files:** `src/features/shops/services/shop.ts`
**AC:** `getShopRoles(shopId)` is exported and returns a typed `ShopRole[]` by calling `GET /api/shops/{shopId}/roles`
**Expert Domains:** supabase

### Task 1.2: Create GET /api/shops/[id]/roles API route

Create `src/app/api/shops/[id]/roles/route.ts` with a `GET` handler. Use `requireShopPermission(request, 'members', 'view', { expectedShopId: shopId })` to enforce authorization (matches the existing pattern in `src/app/api/shops/[id]/members/route.ts`). Query the `shop_roles` table using the admin client: fetch all rows where `shop_id = shopId` OR `is_system = true` (system roles have `shop_id IS NULL`). Return the roles as JSON with `AUTH_CACHE_HEADERS`.
**Files:** `src/app/api/shops/[id]/roles/route.ts`
**AC:** `GET /api/shops/{id}/roles` returns system roles (and future custom roles) for authenticated shop members with `members: view` or higher; returns 401/403 for unauthorized requests
**Expert Domains:** supabase, nextjs

### Task 1.3: Add useShopRoles hook

Create `src/features/shops/hooks/use-shop-roles.ts` following the pattern in `use-shops.ts`. The hook should use `useQuery` with query key `['shops', shopId, 'roles']` and call `getShopRoles(shopId)`. Accept an optional `enabled` parameter defaulting to `true`. Return the standard Tanstack Query result.
**Files:** `src/features/shops/hooks/use-shop-roles.ts`
**AC:** `useShopRoles(shopId)` returns `{ data: ShopRole[], isLoading, isError }` and is disabled when `shopId` is falsy or `enabled` is false
**Expert Domains:** state-management

## Phase 2: Permission Matrix and Role Card Components

**Goal:** Build the reusable permission matrix component and the role card component that displays a single role with its permissions.
**Verify:** `pnpm build`

### Task 2.1: Create permission-matrix component

Create `src/features/shops/components/permission-matrix/index.tsx` and `permission-matrix.module.scss`. The component accepts `permissions: ShopPermissions` and `disabled: boolean` props. Render a matrix with rows for each of the 6 features (`listings`, `pricing`, `orders`, `messaging`, `shop_settings`, `members`) and columns for each level (`full`, `view`, `none`). Use visual indicators: checkmark icon (HiCheck from react-icons/hi) for `full`, eye icon (HiEye) for `view`, and dash (HiMinus) for `none`. Each indicator must have an `aria-label` describing the permission (e.g., "Listings: Full access"). When `disabled` is true, the matrix is read-only (no interactive elements). Mobile-first: on small screens, stack each feature as its own row with the level shown inline; on `md`+ use a table/grid layout with feature rows and level columns.
**Files:** `src/features/shops/components/permission-matrix/index.tsx`, `src/features/shops/components/permission-matrix/permission-matrix.module.scss`
**AC:** Component renders all 6 features with correct level indicators; each indicator has an `aria-label`; layout stacks vertically on mobile and uses grid/table on `md`+; `disabled` prop is accepted for future use
**Reuses:** `src/components/indicators/pill/` (for level badges)
**Expert Domains:** scss, nextjs

### Task 2.2: Create role-card component

Create `src/features/shops/components/role-card/index.tsx` and `role-card.module.scss`. The component accepts a `ShopRole` and renders: the role name as a heading, a "System" badge/pill for system roles (using `Pill` from `@/components/indicators/pill/` with `color="default"`), a description paragraph explaining the role's purpose, and the `PermissionMatrix` component with `disabled={true}` for system roles. Role descriptions should be derived from the role slug: Owner = "Full access to all shop features and settings", Manager = "Can manage listings, orders, and messaging but cannot manage members", Contributor = "Can create and manage listings only". Use a lock icon (HiLockClosed from react-icons/hi) next to the system badge. Mobile-first card layout with appropriate padding and spacing using design tokens.
**Files:** `src/features/shops/components/role-card/index.tsx`, `src/features/shops/components/role-card/role-card.module.scss`
**AC:** Component renders role name, system badge with lock icon for system roles, role description, and permission matrix; uses `Pill` for the system badge; card has proper mobile-first spacing
**Reuses:** `src/components/indicators/pill/`, `src/features/shops/components/permission-matrix/`
**Expert Domains:** scss, nextjs

## Phase 3: Upsell Modal, Page, and Navigation

**Goal:** Build the upsell modal, the main roles page, and add the nav item to the side nav. This completes the full feature.
**Verify:** `pnpm build`

### Task 3.1: Create custom-role-upsell-modal component

Create `src/features/shops/components/custom-role-upsell-modal/index.tsx` and `custom-role-upsell-modal.module.scss`. The component wraps the existing `Modal` from `@/components/layout/modal/`. It accepts `isOpen` and `onClose` props. Content: a heading "Custom Roles", a description "Custom roles are available on the Premium plan. Upgrade your shop to create roles with tailored permissions for your team.", and a dismiss button using `Button` from `@/components/controls/button/`. The modal must have `ariaLabel="Custom roles premium upsell"`. No side effects on dismiss.
**Files:** `src/features/shops/components/custom-role-upsell-modal/index.tsx`, `src/features/shops/components/custom-role-upsell-modal/custom-role-upsell-modal.module.scss`
**AC:** Modal opens/closes cleanly; has ARIA label; focus trap works (inherited from Modal); dismiss button closes without side effects; no actual CRUD or subscription logic
**Reuses:** `src/components/layout/modal/`, `src/components/controls/button/`
**Expert Domains:** scss, nextjs

### Task 3.2: Create roles-permissions-page component

Create `src/features/shops/components/roles-permissions-page/index.tsx` and `roles-permissions-page.module.scss`. This is a `'use client'` component that: reads `activeContext` from the context store to get `shopId`, calls `useShopRoles(shopId)` and `useShopPermissions(shopId)`, renders loading/error states matching the pattern in `shop-settings/page.tsx`, displays page title "Roles & Permissions", renders system role cards sorted Owner > Manager > Contributor using the `RoleCard` component, and conditionally shows an "Add Custom Role" button (only for Owner role, determined via `role === 'owner'` from `useShopPermissions`). The button opens the `CustomRoleUpsellModal`. Use the same page layout pattern as `shop-settings.module.scss` (max-width 720px, responsive padding).
**Files:** `src/features/shops/components/roles-permissions-page/index.tsx`, `src/features/shops/components/roles-permissions-page/roles-permissions-page.module.scss`
**AC:** Page renders three system role cards in correct order; "Add Custom Role" button visible only for Owner; button opens upsell modal; loading and error states are handled; layout matches shop settings page pattern
**Reuses:** `src/features/shops/components/role-card/`, `src/features/shops/components/custom-role-upsell-modal/`, `src/components/controls/button/`
**Expert Domains:** state-management, nextjs

### Task 3.3: Create /dashboard/shop/roles page route

Create `src/app/(frontend)/dashboard/shop/roles/page.tsx` that renders the `RolesPermissionsPage` component. Follow the minimal page pattern established by `src/app/(frontend)/dashboard/shop/settings/page.tsx` — the page file is a thin wrapper that imports and renders the feature component.
**Files:** `src/app/(frontend)/dashboard/shop/roles/page.tsx`
**AC:** `/dashboard/shop/roles` renders the `RolesPermissionsPage` component; page builds successfully
**Expert Domains:** nextjs

### Task 3.4: Add "Roles & Permissions" nav item to side nav

Modify `src/components/navigation/side-nav/index.tsx` to add a new entry to the `SHOP_NAV_ITEMS` array. The item should have: `href: '/dashboard/shop/roles'`, `icon: <HiOutlineShieldCheck />` (import from `react-icons/hi`), `label: 'Roles & Permissions'`, `requiredFeature: 'members'`. Place it after "Listings" and before "Shop Settings" in the array. The existing permission-based rendering logic in the side nav will automatically hide it for users without `members: view` or higher.
**Files:** `src/components/navigation/side-nav/index.tsx`
**AC:** "Roles & Permissions" nav item appears in shop context side nav for users with `members: view` or higher; hidden for users without permission; links to `/dashboard/shop/roles`
**Expert Domains:** nextjs

### Task 3.5: Add /dashboard/shop/roles to ShopRouteGuard

Add a new entry to the `GUARDED_ROUTES` array in `src/features/shops/components/shop-route-guard/index.tsx`: `{ pathPrefix: '/dashboard/shop/roles', feature: 'members', level: 'view' }`. This ensures users without `members: view` permission are redirected away from the roles page with an "Access denied" toast.
**Files:** `src/features/shops/components/shop-route-guard/index.tsx`
**AC:** Navigating to `/dashboard/shop/roles` without `members: view` permission redirects to `/dashboard` with an "Access denied" toast
**Expert Domains:** nextjs

## Phase 4: Polish and Accessibility

**Goal:** Ensure WCAG 2.1 AA compliance, proper focus management, responsive behavior, and update the feature CLAUDE.md documentation.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles`

### Task 4.1: Add accessibility attributes to permission-matrix

Review and enhance the permission matrix component for WCAG 2.1 AA compliance. Ensure: each permission indicator row has a clear `aria-label` that combines feature name and level (e.g., "Listings: Full access"), the matrix container has `role="table"` with `aria-label="Permission matrix"` on desktop layout, use `role="row"` and `role="cell"` appropriately, the active level indicator for each feature is visually distinct (not relying on color alone — include icon + text label), and all icons use `aria-hidden="true"` since the `aria-label` on the parent conveys meaning. Ensure 44x44px minimum tap targets on any interactive elements.
**Files:** `src/features/shops/components/permission-matrix/index.tsx`, `src/features/shops/components/permission-matrix/permission-matrix.module.scss`
**AC:** Permission matrix has `role="table"` semantics; each cell has `aria-label`; icons are `aria-hidden`; active level is distinguishable without color; minimum 44px tap targets
**Expert Domains:** scss, nextjs

### Task 4.2: Verify responsive layout of permission matrix

Ensure the permission matrix SCSS uses mobile-first styling: base styles show a stacked card layout (feature name with its level on one line), then at `@include breakpoint(md)` switch to a grid/table layout with column headers (Feature, Full, View, None). Verify spacing uses design tokens (`--space-*` or `--spacing-*`), colors use `--color-*` tokens, and font sizes use `--font-size-*` tokens. No hardcoded pixel values or hex colors.
**Files:** `src/features/shops/components/permission-matrix/permission-matrix.module.scss`, `src/features/shops/components/role-card/role-card.module.scss`, `src/features/shops/components/roles-permissions-page/roles-permissions-page.module.scss`
**AC:** Layout stacks vertically on mobile (< 768px), switches to table grid at `md`; all values use design tokens; no hardcoded colors/sizes/spacing
**Expert Domains:** scss

### Task 4.3: Update shops feature CLAUDE.md

Update `src/features/shops/CLAUDE.md` to document the new components, hooks, service functions, page route, and API route. Add entries to the Components table (PermissionMatrix, RoleCard, CustomRoleUpsellModal, RolesPermissionsPage), Hooks table (useShopRoles), Service Functions table (getShopRoles), and Pages table (/dashboard/shop/roles). Document that the permission matrix is reusable and will be used with `disabled={false}` for future custom role editing.
**Files:** `src/features/shops/CLAUDE.md`
**AC:** CLAUDE.md has entries for all new components, hooks, services, API routes, and pages; notes the permission matrix reusability for future custom roles
