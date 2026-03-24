# Implementation Plan: #237 — Add permission types, constants, and checkPermission utility

## Overview
3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Permission types and role constants
**Goal:** Create the permission type system and move role constants to a dedicated constants module, removing the stale `ShopMemberRole` type
**Verify:** `pnpm build`

### Task 1.1: Create permission types file
Create `src/features/shops/types/permissions.ts` with all permission-related types. `ShopPermissionFeature` is a union of the 6 feature domains. `ShopPermissionLevel` is `'full' | 'view' | 'none'`. `ShopPermissions` is a `Record` mapping features to levels. `ShopRole` is derived from the `shop_roles` DB row type but with `permissions` typed as `ShopPermissions` instead of generic `Json`.
**Files:** `src/features/shops/types/permissions.ts`
**AC:**
- `ShopPermissionFeature` type equals `'listings' | 'pricing' | 'orders' | 'messaging' | 'shop_settings' | 'members'`
- `ShopPermissionLevel` type equals `'full' | 'view' | 'none'`
- `ShopPermissions` is `Record<ShopPermissionFeature, ShopPermissionLevel>`
- `ShopRole` extends `shop_roles` Row but overrides `permissions` field from `Json` to `ShopPermissions`
- All types are importable from `@/features/shops/types/permissions`
**Expert Domains:** supabase

### Task 1.2: Create role constants module
Create `src/features/shops/constants/roles.ts` with `SYSTEM_ROLE_IDS` (moved from `types/shop.ts`), `SYSTEM_ROLE_SLUGS`, and `DEFAULT_ROLE_ID`. The UUIDs must exactly match the values already defined in `types/shop.ts` (`11111111-1111-1111-1111-111111111101`, `...102`, `...103`).
**Files:** `src/features/shops/constants/roles.ts`
**AC:**
- `SYSTEM_ROLE_IDS` has keys `OWNER`, `MANAGER`, `CONTRIBUTOR` with the same UUIDs as the current `types/shop.ts` definition
- `SYSTEM_ROLE_SLUGS` equals `{ owner: 'owner', manager: 'manager', contributor: 'contributor' } as const`
- `DEFAULT_ROLE_ID` equals `SYSTEM_ROLE_IDS.CONTRIBUTOR`
- All constants are importable from `@/features/shops/constants/roles`
**Expert Domains:** supabase

### Task 1.3: Update shop types and migrate SYSTEM_ROLE_IDS imports
Remove `ShopMemberRole` type and `SYSTEM_ROLE_IDS` constant from `src/features/shops/types/shop.ts`. Re-export `SYSTEM_ROLE_IDS` from the new constants module to maintain backward compatibility, OR update all consumer imports. Update `ShopMember` type to include joined `shop_roles` data (role name, slug, permissions). All existing consumers of `SYSTEM_ROLE_IDS` must continue to work.

Consumers to update (if not re-exporting):
- `src/app/api/shops/route.ts` (line 4)
- `src/app/api/shops/[id]/ownership/route.ts` (line 4)
- `src/features/shops/components/shop-settings/ownership-transfer-section/index.tsx` (line 10)
- `src/features/shops/components/shop-settings/shop-members-section/index.tsx` (line 10)

**Files:** `src/features/shops/types/shop.ts`, `src/app/api/shops/route.ts`, `src/app/api/shops/[id]/ownership/route.ts`, `src/features/shops/components/shop-settings/ownership-transfer-section/index.tsx`, `src/features/shops/components/shop-settings/shop-members-section/index.tsx`
**AC:**
- `ShopMemberRole` type no longer exists in `types/shop.ts`
- `SYSTEM_ROLE_IDS` is no longer defined in `types/shop.ts` (either re-exported from constants or all imports updated)
- `ShopMember` type includes a `shop_roles` field with `{ name: string; slug: string; permissions: Json } | null`
- All 4 consumer files compile without errors
- `pnpm build` passes
**Expert Domains:** nextjs

## Phase 2: Permission utilities and service updates
**Goal:** Create the `checkPermission` utility functions and update `getShopMembers` to join role data from `shop_roles`
**Verify:** `pnpm build`

### Task 2.1: Create checkPermission utility module
Create `src/features/shops/utils/check-permission.ts` with three pure functions: `checkPermission` looks up a feature key in the permissions record and returns the level (defaulting to `'none'` if the key is missing). `hasAccess` returns `true` for `'full'` or `'view'`. `hasFullAccess` returns `true` only for `'full'`. These are pure functions with no API calls or side effects.
**Files:** `src/features/shops/utils/check-permission.ts`
**AC:**
- `checkPermission({ listings: 'full', pricing: 'none' }, 'listings')` returns `'full'`
- `checkPermission({ listings: 'full' }, 'orders')` returns `'none'` (missing key defaults to none)
- `hasAccess(perms, feature)` returns `true` for `'view'` and `'full'`, `false` for `'none'`
- `hasFullAccess(perms, feature)` returns `true` only for `'full'`
- No API calls or imports from supabase client
- All functions are importable from `@/features/shops/utils/check-permission`
**Expert Domains:** supabase

### Task 2.2: Update getShopMembers to join shop_roles
Update the `getShopMembers` function in `src/features/shops/services/shop.ts` to join `shop_roles` data via the `role_id` FK. The select should include `shop_roles(name, slug, permissions)` alongside the existing `members(...)` join. Update the return type cast to match the updated `ShopMember` type.
**Files:** `src/features/shops/services/shop.ts`
**AC:**
- `getShopMembers` select string includes `shop_roles(name, slug, permissions)`
- Return type is `ShopMember[]` which now includes the `shop_roles` join data
- No other service functions are changed
- `pnpm build` passes
**Expert Domains:** supabase

## Phase 3: Tests and documentation
**Goal:** Write unit tests for the permission utilities and update the feature CLAUDE.md
**Verify:** `pnpm build && pnpm test:run`

### Task 3.1: Write unit tests for checkPermission utilities
Create `src/features/shops/utils/__tests__/check-permission.test.ts` with comprehensive tests for all three functions. Test the happy paths, edge cases (missing keys, empty permissions object), and boundary conditions. Follow the existing test patterns in `src/features/shops/services/__tests__/shop.test.ts` (Vitest with describe/it blocks).
**Files:** `src/features/shops/utils/__tests__/check-permission.test.ts`
**AC:**
- Tests cover `checkPermission` returning correct level for present keys
- Tests cover `checkPermission` returning `'none'` for missing keys
- Tests cover `hasAccess` returning `true` for `'full'` and `'view'`, `false` for `'none'`
- Tests cover `hasFullAccess` returning `true` only for `'full'`
- Tests cover edge case of empty permissions object
- All tests pass with `pnpm test:run`
**Expert Domains:** supabase

### Task 3.2: Write unit tests for role constants
Create `src/features/shops/constants/__tests__/roles.test.ts` to verify that the constants have the expected values and that `DEFAULT_ROLE_ID` points to the Contributor UUID. This is a safety net to catch accidental changes to the deterministic UUIDs.
**Files:** `src/features/shops/constants/__tests__/roles.test.ts`
**AC:**
- Test verifies `SYSTEM_ROLE_IDS.OWNER` equals `'11111111-1111-1111-1111-111111111101'`
- Test verifies `SYSTEM_ROLE_IDS.MANAGER` equals `'11111111-1111-1111-1111-111111111102'`
- Test verifies `SYSTEM_ROLE_IDS.CONTRIBUTOR` equals `'11111111-1111-1111-1111-111111111103'`
- Test verifies `DEFAULT_ROLE_ID` equals `SYSTEM_ROLE_IDS.CONTRIBUTOR`
- Test verifies `SYSTEM_ROLE_SLUGS` has correct slug strings
- All tests pass with `pnpm test:run`
**Expert Domains:** supabase

### Task 3.3: Update shops feature CLAUDE.md
Update `src/features/shops/CLAUDE.md` to document the new files: `types/permissions.ts`, `constants/roles.ts`, `utils/check-permission.ts`. Update the existing documentation to remove references to `ShopMemberRole` and note that `SYSTEM_ROLE_IDS` has moved to `constants/roles.ts`. Document the permission utility functions in the service functions table or a new utilities table.
**Files:** `src/features/shops/CLAUDE.md`
**AC:**
- CLAUDE.md lists `types/permissions.ts` with its exported types
- CLAUDE.md lists `constants/roles.ts` with its exported constants
- CLAUDE.md lists `utils/check-permission.ts` with its exported functions
- No references to `ShopMemberRole` remain in CLAUDE.md
- `SYSTEM_ROLE_IDS` documentation points to `constants/roles.ts` as the canonical location
