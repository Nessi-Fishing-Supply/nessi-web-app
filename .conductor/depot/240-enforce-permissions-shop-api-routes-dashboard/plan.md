# Implementation Plan: #240 — Enforce permissions on shop API routes and dashboard pages

## Overview
3 phases, 10 total tasks
Estimated scope: medium

## Phase 1: Enforce `requireShopPermission` on all shop API routes
**Goal:** Replace manual `owner_id` checks with role-based `requireShopPermission` middleware on all in-scope API routes, so server-side authorization is enforced consistently.
**Verify:** `pnpm build`

### Task 1.1: Migrate DELETE /api/shops/[id] to use requireShopPermission
Replace the manual `createClient` + `getUser` + `owner_id` check in the shop deletion route with `requireShopPermission(request, 'shop_settings', 'full')`. The route already has `shopId` from URL params, so pass `{ expectedShopId: shopId }`. Remove the `createClient` import (no longer needed for auth) and the manual shop ownership query — the permission middleware handles authentication and authorization. Keep the `createAdminClient` usage for storage cleanup and soft-delete. Preserve `parseStoragePath` and all storage/listing cleanup logic unchanged.
**Files:** `src/app/api/shops/[id]/route.ts`
**AC:** DELETE returns 401 without session, 403 for Manager/Contributor roles, 200 for Owner. `AUTH_CACHE_HEADERS` present on all responses. Storage cleanup and soft-delete logic unchanged.
**Expert Domains:** nextjs, supabase

### Task 1.2: Migrate DELETE /api/shops/[id]/members/[memberId] to use requireShopPermission
Replace the manual `createClient` + `getUser` + `owner_id` check with `requireShopPermission(request, 'members', 'full', { expectedShopId: shopId })`. Preserve the self-removal logic: after the permission check passes, also allow the case where `memberId === user.id` (a member removing themselves). For this, restructure the logic: first try `requireShopPermission` — if it returns a 403 NextResponse, check if `memberId === result.user?.id` as a fallback (self-removal). Since `requireShopPermission` returns NextResponse on failure (no user info), the self-removal fallback needs the user from a separate auth check. The cleanest approach: authenticate the user first via `requireShopPermission` with `members: 'full'`, and if it fails with 403, do a secondary check — if the authenticated user's ID matches `memberId`, allow the self-removal. Alternatively, since self-removal is a special case, keep a lightweight auth check alongside: call `requireShopPermission` first, and if it succeeds, proceed. If it returns a NextResponse, parse the status — if 403, do a manual auth + self-removal check. Remove the manual `shop.owner_id` check entirely.
**Files:** `src/app/api/shops/[id]/members/[memberId]/route.ts`
**AC:** DELETE returns 403 for a Contributor trying to remove another member, 200 for Owner removing any member, 200 for any member removing themselves. `AUTH_CACHE_HEADERS` present on all responses.
**Expert Domains:** nextjs, supabase

### Task 1.3: Migrate POST /api/shops/[id]/ownership to use requireShopPermission
Replace the manual `createClient` + `getUser` + `owner_id` check with `requireShopPermission(request, 'members', 'full', { expectedShopId: shopId })`. The Owner bypass in `requireShopPermission` ensures only the owner (system role with `slug === 'owner'`) passes this check, which matches the existing behavior. Remove the manual shop query for `owner_id` verification — `requireShopPermission` handles it. Keep the `newOwnerId` validation, existing member check, and the atomic ownership transfer logic (updating `shops.owner_id`, new owner role to Owner, current owner role to Manager) unchanged.
**Files:** `src/app/api/shops/[id]/ownership/route.ts`
**AC:** POST returns 403 for Manager, 200 for Owner with valid newOwnerId. `AUTH_CACHE_HEADERS` on all responses. Ownership transfer logic unchanged.
**Expert Domains:** nextjs, supabase

### Task 1.4: Migrate POST /api/shops/avatar to use requireShopPermission
Replace the manual `createClient` + `getUser` + `owner_id` check with `requireShopPermission`. Since this route receives `shopId` from `formData` (not URL params), the permission check needs the shopId extracted from the form body first. Restructure: parse formData to get `shopId` first, then call `requireShopPermission(request, 'shop_settings', 'full')` — but note that `requireShopPermission` reads the `X-Nessi-Context` header for the shop context, not the form body. The `expectedShopId` option should be set to the `shopId` from formData to prevent privilege escalation (context says Shop A but form says Shop B). The `request` body can only be read once, so read `formData` before calling `requireShopPermission`, or clone the request. Since `requireShopPermission` does not read the body (only headers), reading formData after is fine. Actually, `requireShopPermission` only reads headers, so the order does not matter — call `requireShopPermission` first (with no `expectedShopId`), then read formData, then validate `shopId` matches `result.shopId`. Remove the manual `supabase.from('shops').select('owner_id')` query. Keep all sharp image processing and storage upload logic unchanged.
**Files:** `src/app/api/shops/avatar/route.ts`
**AC:** POST returns 403 for Contributor, 200 for Owner/Manager-with-full-shop_settings (only Owner in current system roles). Image processing and upload logic unchanged. `AUTH_CACHE_HEADERS` on all responses.
**Expert Domains:** nextjs, supabase

### Task 1.5: Migrate POST /api/shops/hero-banner to use requireShopPermission
Apply the same pattern as Task 1.4. Replace manual `createClient` + `getUser` + `owner_id` check with `requireShopPermission(request, 'shop_settings', 'full')`. Extract `shopId` from formData and validate it matches `result.shopId` from the permission check. Remove the manual shop ownership query. Keep sharp image processing (1200x400, WebP 85%) and storage upload unchanged. Note: after upload, the route updates `shops.hero_banner_url` — this currently uses the user's `supabase` client (RLS). Since we are removing that client, switch to using `admin` client for the update (the permission check already verified authorization).
**Files:** `src/app/api/shops/hero-banner/route.ts`
**AC:** POST returns 403 for Contributor, 200 for Owner. Image processing, storage upload, and `hero_banner_url` update all work correctly. `AUTH_CACHE_HEADERS` on all responses.
**Expert Domains:** nextjs, supabase

### Task 1.6: Migrate POST /api/shops/slug to use requireShopPermission
Replace the manual `createClient` + `getUser` + `owner_id` check with `requireShopPermission(request, 'shop_settings', 'full')`. The route receives `shopId` from the JSON body. Call `requireShopPermission` first (reads only headers), then parse the JSON body. Validate that `body.shopId` matches `result.shopId` from the permission check. Remove the manual `admin.from('shops').select('id, owner_id')` query. Keep the `reserve_slug` RPC call and all error handling (409 for duplicate, 400 for invalid format) unchanged.
**Files:** `src/app/api/shops/slug/route.ts`
**AC:** POST returns 403 for Contributor/Manager, 200 for Owner with valid slug. Slug reservation logic and error codes unchanged. `AUTH_CACHE_HEADERS` on all responses.
**Expert Domains:** nextjs, supabase

## Phase 2: Permission-based rendering on shop settings page
**Goal:** Update the shop settings page and ShopDetailsSection to conditionally render or disable sections based on the current user's permission level, so non-owners see an appropriate subset of settings.
**Verify:** `pnpm build`

### Task 2.1: Add readOnly prop to ShopDetailsSection
Add an optional `readOnly?: boolean` prop to `ShopDetailsSectionProps`. When `readOnly` is true: (1) render `InlineEdit` components with editing disabled — since `InlineEdit` does not have a `readOnly` prop, pass a no-op `onSave` and add a `disabled` or `readOnly` prop to `InlineEdit` (see Task 2.2), (2) hide the `AvatarUpload` upload trigger (pass `disabled={true}`), (3) hide the `HeroBannerUpload` upload trigger (pass `disabled={true}`). The section should still display all current values but prevent any edits.
**Files:** `src/features/shops/components/shop-settings/shop-details-section/index.tsx`
**AC:** When `readOnly={true}`, all inline edit fields display values but cannot be edited, avatar and banner upload controls are disabled. When `readOnly` is false or omitted, behavior is unchanged from current.
**Expert Domains:** nextjs, scss

### Task 2.2: Add readOnly prop to InlineEdit component
Add an optional `readOnly?: boolean` prop to `InlineEditProps`. When `readOnly` is true, the component should render the display value (not the edit input) and hide the pencil/edit button, making the field non-interactive. This is distinct from the `validating` prop — `readOnly` means the user cannot enter edit mode at all.
**Files:** `src/components/controls/inline-edit/index.tsx`
**AC:** When `readOnly={true}`, the pencil icon is hidden, clicking does not enter edit mode, the value is displayed as plain text. When `readOnly` is false or omitted, behavior is unchanged.
**Expert Domains:** nextjs

### Task 2.3: Update shop settings page with permission-based section visibility
Import `useShopPermissions` and use it to conditionally render settings sections based on the user's permissions. Specifically: (1) pass `readOnly={permissions.shop_settings !== 'full'}` to `ShopDetailsSection` — Managers see details as read-only, (2) hide `ShopMembersSection` when `permissions.members === 'none'` (Contributors), (3) hide `OwnershipTransferSection` when `permissions.members !== 'full'` — replaces the current `shop.owner_id === user.id` check, (4) hide `ShopDeletionSection` when `permissions.shop_settings !== 'full'` — replaces the current `shop.owner_id === user.id` check. The `ShopRouteGuard` already redirects Contributors away from `/dashboard/shop/settings` entirely (requires `shop_settings: 'view'`), so Contributors will never reach this page. Remove the direct `shop.owner_id === user.id` checks for showing transfer/deletion sections — replace with permission-based checks. Keep the `useAuth` hook for the loading state but remove the `user` dependency from section visibility logic.
**Files:** `src/app/(frontend)/dashboard/shop/settings/page.tsx`
**AC:** Owner sees all sections (unchanged). Manager sees ShopDetailsSection as read-only, ShopSubscriptionSection, but NOT members/transfer/deletion sections. Contributor is redirected by ShopRouteGuard (never reaches page). `pnpm build` passes.
**Expert Domains:** nextjs, state-management

## Phase 3: Cleanup and verification
**Goal:** Update the shops feature CLAUDE.md to reflect the new permission-based authorization pattern and verify all quality gates pass.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 3.1: Update shops feature CLAUDE.md to reflect permission enforcement
Update `src/features/shops/CLAUDE.md` to document that all shop API routes now use `requireShopPermission` instead of manual `owner_id` checks. Update the Avatar Upload API, Hero Banner Upload API, and Shop Deletion API sections to reference the permission middleware. Add a note in the Key Patterns section about the standardized authorization pattern. Update the shop settings page description to mention permission-based rendering (read-only for Managers, hidden sections for non-owners).
**Files:** `src/features/shops/CLAUDE.md`
**AC:** CLAUDE.md accurately describes the current authorization pattern for all shop API routes and the permission-based rendering on the settings page. No references to manual `owner_id` checks remain in API route documentation.
