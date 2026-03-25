# Implementation Plan: #239 — Add permission-aware dashboard side nav and client-side route guard

## Overview

3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Service and Hook Foundation

**Goal:** Add the data layer for fetching the current user's shop role and permissions, exposing them via a Tanstack Query hook.
**Verify:** `pnpm build`

### Task 1.1: Add getMyShopRole service function

Add a `getMyShopRole(shopId: string)` function to the existing shop service file. This function queries `shop_members` joined with `shop_roles` for the current authenticated user's membership in the given shop, using the browser Supabase client (RLS ensures only the user's own row is returned). It returns the `ShopMember` row (with joined `shop_roles` data) or `null` if the user is not a member.
**Files:** `src/features/shops/services/shop.ts`
**AC:** `getMyShopRole('some-shop-id')` returns the current user's `ShopMember` with `shop_roles.permissions` populated, or `null` if not a member. Uses the same Supabase browser client and join pattern as the existing `getShopMembers` function.
**Expert Domains:** supabase

### Task 1.2: Create useShopPermissions hook

Create a Tanstack Query hook `useShopPermissions(shopId: string)` that calls `getMyShopRole` and returns `{ permissions, role, isLoading }`. The `permissions` field is the typed `ShopPermissions` object extracted from the joined `shop_roles.permissions` column (cast from `Json`). The `role` field is the role slug string (e.g., `'owner'`, `'manager'`, `'contributor'`). Query key is `['shops', shopId, 'my-permissions']`. Follow the same patterns as existing hooks in `use-shops.ts` (enabled parameter, direct service call in queryFn).
**Files:** `src/features/shops/hooks/use-shop-permissions.ts`
**AC:** Hook returns `{ permissions: ShopPermissions, role: string | null, isLoading: boolean }`. When `shopId` is empty or user is not a member, `permissions` defaults to all `'none'` and `role` is `null`. Query key matches `['shops', shopId, 'my-permissions']`.
**Expert Domains:** state-management

## Phase 2: Permission-Aware Side Nav

**Goal:** Filter shop-context nav items based on the current user's resolved permissions, hiding items where the user has no access.
**Verify:** `pnpm build`

### Task 2.1: Define nav item permission mapping

Add a constant mapping of shop nav items to their required permission feature within the side nav component file. Each shop-context nav item (except Dashboard, which is always visible) maps to a `ShopPermissionFeature`: "Listings" maps to `'listings'`, "Shop Settings" maps to `'shop_settings'`. This mapping is used to filter which items render.
**Files:** `src/components/navigation/side-nav/index.tsx`
**AC:** A typed array/config of shop nav items exists, each with `href`, `icon`, `label`, and optional `requiredFeature: ShopPermissionFeature`. Dashboard has no `requiredFeature` (always shown).

### Task 2.2: Integrate useShopPermissions into SideNav

Import `useShopPermissions` into the SideNav component. When in shop context, call the hook with the active `shopId`. Filter the shop nav items: for each item with a `requiredFeature`, call `hasAccess(permissions, feature)` from `@/features/shops/utils/check-permission.ts` and only render the item if it returns `true`. Dashboard is always rendered. Do not block the entire nav while permissions load — show all items during loading (optimistic, avoids layout shift), then filter once loaded. Import `hasAccess` from the existing utility (do NOT duplicate logic).
**Files:** `src/components/navigation/side-nav/index.tsx`
**AC:** Contributor (listings=full, shop_settings=none) sees Dashboard and Listings only. Manager (listings=full, shop_settings=view) sees Dashboard, Listings, and Shop Settings. Owner (all=full) sees all items. Nav renders immediately without blocking on permission load.
**Reuses:** `src/features/shops/utils/check-permission.ts` (`hasAccess`)

## Phase 3: Client-Side Route Guard

**Goal:** Redirect users who navigate directly to shop dashboard routes they lack permission for, with a toast notification.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 3.1: Define route-to-permission mapping

Create a constant that maps shop dashboard route path prefixes to their required `ShopPermissionFeature` and minimum `ShopPermissionLevel`. For example: `/dashboard/shop/settings` requires `shop_settings` at `'view'` level, `/dashboard/listings` requires `'listings'` at `'view'` level. This mapping is consumed by the route guard to determine if the current user can access the current route.
**Files:** `src/features/shops/components/shop-route-guard/index.tsx`
**AC:** A typed constant maps route prefixes to `{ feature: ShopPermissionFeature, level: ShopPermissionLevel }`. At minimum, `/dashboard/shop/settings` and `/dashboard/listings` are mapped.

### Task 3.2: Create ShopRouteGuard component

Create the `ShopRouteGuard` component that wraps shop dashboard route content. It reads the current pathname via `usePathname()`, the active context from the context store, and calls `useShopPermissions(shopId)`. If in shop context and permissions are loaded, it checks if the current route matches a guarded path. If the user lacks sufficient permission (using `meetsLevel` from the existing utility), it calls `router.push('/dashboard')` and shows an error toast via `useToast()` with a message like "You don't have permission to access this page." The component renders `children` while loading (no blocking) and renders `children` if the user has permission or is not in shop context.
**Files:** `src/features/shops/components/shop-route-guard/index.tsx`
**AC:** Navigating to `/dashboard/shop/settings` as a Contributor triggers `router.push('/dashboard')` and displays an error toast. Uses `router.push` (not `replace`) so user can navigate back. Does not block dashboard render while permissions load. Renders children normally when user has sufficient permission.
**Reuses:** `src/features/shops/utils/check-permission.ts` (`meetsLevel`), `src/components/indicators/toast/context` (`useToast`)
**Expert Domains:** nextjs, state-management

### Task 3.3: Integrate ShopRouteGuard into dashboard layout

Wrap the dashboard layout's `{children}` with the `ShopRouteGuard` component. This ensures all dashboard routes are guarded when in shop context. The guard is a thin wrapper that passes children through when not in shop context or when the user has permission, so it has zero impact on non-shop routes.
**Files:** `src/app/(frontend)/dashboard/layout.tsx`
**AC:** Dashboard layout renders `<ShopRouteGuard>{children}</ShopRouteGuard>` around the main content area. `pnpm build && pnpm typecheck && pnpm lint` all pass.
**Expert Domains:** nextjs

### Task 3.4: Remove redundant context guard from shop settings page

The shop settings page (`page.tsx`) currently has its own `useEffect` that redirects to `/dashboard` when not in shop context. This is now handled by the `ShopRouteGuard` at the layout level with better permission granularity. Remove the redundant `useEffect` redirect from the settings page. Additionally, the owner-only gating on `OwnershipTransferSection` and `ShopDeletionSection` (currently checking `shop.owner_id === user.id`) should remain as-is for now since those are component-level visibility concerns, not route-level guards.
**Files:** `src/app/(frontend)/dashboard/shop/settings/page.tsx`
**AC:** The `useEffect` that redirects non-shop-context users is removed. The page still renders correctly when accessed with proper shop context and permissions. Owner-only sections remain gated by `owner_id` check.
**Expert Domains:** nextjs
