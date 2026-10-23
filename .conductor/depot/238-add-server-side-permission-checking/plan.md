# Implementation Plan: #238 — Add server-side permission checking middleware

## Overview

3 phases, 7 total tasks
Estimated scope: medium

## Phase 1: Permission Helper Foundation

**Goal:** Create the `requireShopPermission` and `getShopMemberWithRole` helper functions in `src/libs/shop-permissions.ts` with all auth, context parsing, and permission comparison logic.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create the shop-permissions helper module

Create `src/libs/shop-permissions.ts` with two exported functions:

1. `getShopMemberWithRole(userId, shopId)` -- uses the admin Supabase client (`src/libs/supabase/admin.ts`) to query `shop_members` joined with `shop_roles` for the given user and shop. Returns the member row with typed `ShopRole` (cast from `Json` to `ShopPermissions`) or `null` if not found.

2. `requireShopPermission(request, feature, level)` -- orchestrates the full permission check: (a) authenticates via server Supabase client (`getUser()`), returns 401 `NextResponse` if no session; (b) parses `X-Nessi-Context` header to extract `shopId` (format: `shop:{shopId}`), returns 403 if header missing or not shop context; (c) calls `getShopMemberWithRole` to look up the member+role, returns 403 if not a member; (d) checks owner bypass (`is_system === true && slug === 'owner'`), passes immediately; (e) compares permission levels using numeric mapping (`none=0, view=1, full=2`), returns 403 if the user's level for the requested feature is below the required level; (f) on success returns `{ user, shopId, member }`.

All error responses must use `AUTH_CACHE_HEADERS` from `src/libs/api-headers.ts` and the structured `{ error: string }` pattern. Import permission types (`ShopPermissionFeature`, `ShopPermissionLevel`, `ShopRole`, `ShopPermissions`) from `src/features/shops/types/permissions.ts` and the `ShopMemberRow` type from `src/features/shops/types/shop.ts`.

**Files:** `src/libs/shop-permissions.ts`
**AC:**

- Module exports `requireShopPermission` and `getShopMemberWithRole`
- `requireShopPermission` returns `{ user, shopId, member }` on success where `member` includes the joined `shop_roles` data typed as `ShopRole`
- Returns 401 `NextResponse` when no authenticated session
- Returns 403 `NextResponse` when `X-Nessi-Context` header is missing or not in `shop:{id}` format
- Returns 403 `NextResponse` when user is not a member of the shop
- Returns 403 `NextResponse` when user's permission level for the feature is below required
- Owner role (identified by `is_system && slug === 'owner'`) always passes regardless of feature/level
- All error responses include `AUTH_CACHE_HEADERS`
- `pnpm typecheck` passes
  **Expert Domains:** supabase, nextjs

### Task 1.2: Export a PermissionResult type for consumer convenience

Add a named export type `ShopPermissionResult` to `src/libs/shop-permissions.ts` representing the success return shape: `{ user: User; shopId: string; member: ShopMemberRow & { shop_roles: ShopRole } }`. This gives API route consumers a single import for both the function and its return type. (This can be done inline in the same file created in Task 1.1, but is called out as a separate acceptance criterion.)

**Files:** `src/libs/shop-permissions.ts`
**AC:**

- `ShopPermissionResult` type is exported and matches the success return shape
- Type uses `User` from `@supabase/supabase-js`
  **Expert Domains:** supabase

## Phase 2: Unit Tests

**Goal:** Create comprehensive unit tests for `requireShopPermission` and `getShopMemberWithRole` covering all branches: no session, non-member, insufficient permission, sufficient permission, and owner bypass.
**Verify:** `pnpm build && pnpm test:run`

### Task 2.1: Create unit tests for shop-permissions

Create `src/libs/__tests__/shop-permissions.test.ts` with Vitest tests. Mock `@/libs/supabase/server` (`createClient` returning a mock with `auth.getUser()`), `@/libs/supabase/admin` (`createAdminClient` returning a mock with `.from().select().eq().eq().single()`), and `next/server` (`NextResponse.json`). Use `vi.mock()` for module mocking.

Test cases for `requireShopPermission`:

1. Returns 401 when `getUser()` returns no user
2. Returns 403 when `X-Nessi-Context` header is missing
3. Returns 403 when `X-Nessi-Context` header is `member` (not shop context)
4. Returns 403 when user is not a shop member (query returns null)
5. Returns 403 when user has insufficient permission (e.g., role has `view` for `members` but `full` is required)
6. Returns success with user+shopId+member when permission is sufficient (e.g., role has `full` for `listings`, `full` required)
7. Returns success when user has `full` and only `view` is required (higher level passes)
8. Owner bypass: returns success even when the feature permission is technically `none`, because role has `is_system: true` and `slug: 'owner'`

Test cases for `getShopMemberWithRole`: 9. Returns null when no matching shop_members row 10. Returns the member+role data when found

Follow the test style from `src/features/shops/utils/__tests__/check-permission.test.ts` (describe/it blocks, direct assertions).

**Files:** `src/libs/__tests__/shop-permissions.test.ts`
**AC:**

- All 10 test cases listed above are implemented and pass
- Mocks are properly set up for Supabase server client, admin client, and NextResponse
- `pnpm test:run` passes with all tests green
  **Expert Domains:** supabase, nextjs

## Phase 3: Reference Implementation

**Goal:** Update the shop members API route to use `requireShopPermission` as the reference implementation, replacing the manual `owner_id` check.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test:run`

### Task 3.1: Refactor the members POST route to use requireShopPermission

Update `src/app/api/shops/[id]/members/route.ts` to replace the manual auth and `shop.owner_id === user.id` check with a single call to `requireShopPermission(request, 'members', 'full')`. The route currently: (1) authenticates via `createClient`, (2) queries `shops` for `owner_id`, (3) compares `owner_id === user.id`. Replace all of that with:

```
const result = await requireShopPermission(request, 'members', 'full');
if (result instanceof NextResponse) return result;
const { user, shopId, member } = result;
```

If `requireShopPermission` returns a `NextResponse` (error case), return it immediately. On success, proceed with the existing `admin.from('shop_members').insert(...)` logic.

**Files:** `src/app/api/shops/[id]/members/route.ts`
**AC:**

- Route imports and calls `requireShopPermission(request, 'members', 'full')`
- No more direct `shop.owner_id === user.id` check in the route
- Returns 401/403 from the helper for unauthorized/forbidden cases
- Successful member addition still works as before
- `pnpm build && pnpm typecheck && pnpm lint` all pass
  **Expert Domains:** supabase, nextjs

### Task 3.2: Verify the requireShopPermission return type handles both success and error paths cleanly

Ensure that `requireShopPermission` returns a discriminated type or uses `NextResponse | ShopPermissionResult` so that API route consumers can easily distinguish success from error. The recommended pattern is to return `NextResponse | ShopPermissionResult` and let the consumer check with `if (result instanceof NextResponse) return result;`. Verify this pattern works cleanly in the members route. If the types need adjustment in `src/libs/shop-permissions.ts`, update them.

**Files:** `src/libs/shop-permissions.ts`, `src/app/api/shops/[id]/members/route.ts`
**AC:**

- The return type of `requireShopPermission` is `Promise<NextResponse | ShopPermissionResult>`
- The members route uses `instanceof NextResponse` to check for error responses
- TypeScript narrows the type correctly after the check (no type assertions needed)
- `pnpm typecheck` passes
  **Expert Domains:** nextjs
