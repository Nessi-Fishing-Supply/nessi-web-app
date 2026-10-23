# Implementation Plan: #252 — Create shop invite API routes

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Types, constants, and validation utilities

**Goal:** Define the ShopInvite type, add the MAX_MEMBERS_PER_SHOP constant, and create an email validation helper reusable across the invite API routes.
**Verify:** `pnpm typecheck && pnpm build`

### Task 1.1: Create ShopInvite type from database types

Define a `ShopInvite` type derived from `Database['public']['Tables']['shop_invites']['Row']` and a `ShopInviteWithInviter` type that includes the joined inviter name fields from the `members` table. Follow the pattern in `src/features/shops/types/shop.ts` where `ShopMember` extends the row type with joined relations.
**Files:** `src/features/shops/types/invite.ts`
**AC:** `ShopInvite` is the raw row type. `ShopInviteWithInviter` extends it with `members: { first_name: string | null; last_name: string | null } | null`. Both types are exported.
**Expert Domains:** supabase

### Task 1.2: Add MAX_MEMBERS_PER_SHOP constant to limits file

Add `MAX_MEMBERS_PER_SHOP = 5` to the existing limits constants file. This represents the maximum combined count of `shop_members` rows plus `shop_invites` rows with `status = 'pending'` for a single shop. The existing `MAX_SHOPS_PER_MEMBER` constant is a different limit (how many shops a member can join).
**Files:** `src/features/shops/constants/limits.ts`
**AC:** `MAX_MEMBERS_PER_SHOP` is exported with value `5`. Existing `MAX_SHOPS_PER_MEMBER` constant is unchanged.
**Expert Domains:** supabase

### Task 1.3: Create validateInviteInput server-side validation utility

Create a pure validation function for the POST create invite endpoint. Validates: (1) `email` is present and matches `EMAIL_REGEX` from `src/features/auth/validations/server.ts`, (2) `roleId` is present and is one of the values in `SYSTEM_ROLE_IDS` (excluding OWNER — owners cannot be invited). Returns `string | null` (error message or null on success). Follow the pattern of `validateRegisterInput` in the auth validations.
**Files:** `src/features/shops/validations/invite.ts`
**AC:** `validateInviteInput({ email, roleId })` returns `null` for valid input, returns specific error strings for missing email, invalid email format, missing roleId, invalid roleId, and attempting to assign Owner role. Imports `EMAIL_REGEX` from `@/features/auth/validations/server` and `SYSTEM_ROLE_IDS` from `@/features/shops/constants/roles`.
**Expert Domains:** nextjs

## Phase 2: API routes (create, list, resend, revoke)

**Goal:** Implement the four API endpoints under `src/app/api/shops/[id]/invites/` with full permission checking, cap enforcement, email sending, and error handling.
**Verify:** `pnpm typecheck && pnpm build`

### Task 2.1: Create POST /api/shops/[id]/invites route (create invite)

Implement the create invite endpoint. Steps: (1) `requireShopPermission(request, 'members', 'full', { expectedShopId })`, (2) parse and validate body with `validateInviteInput`, (3) check 5-member cap — count `shop_members` WHERE `shop_id` + count `shop_invites` WHERE `shop_id` AND `status = 'pending'`, return 409 with `MEMBER_LIMIT_REACHED` if >= `MAX_MEMBERS_PER_SHOP`, (4) check email is not already a member — join `shop_members` with `members` on `member_id` then match `auth.users` email via admin `auth.admin.listUsers`, or query `auth.users` by email then check `shop_members` — use admin client, (5) check no duplicate pending invite — query `shop_invites` WHERE `shop_id` AND `email` AND `status = 'pending'`, return 409, (6) get inviter name from `members` table using `result.user.id`, (7) insert into `shop_invites` with admin client, (8) get role name from `shop_roles` for the email template, (9) send email using `sendEmail` + `inviteToShop` template, (10) return 201 with invite data. Use `AUTH_CACHE_HEADERS` on all responses.
**Files:** `src/app/api/shops/[id]/invites/route.ts`
**AC:** Returns 201 with invite data on success. Returns 400 for invalid email or role. Returns 409 for duplicate pending invite, existing member, and cap reached (with `MEMBER_LIMIT_REACHED` error code). Returns 401/403 for unauthorized. Email is sent only after successful DB insert. Uses admin client for all DB mutations.
**Expert Domains:** supabase, nextjs

### Task 2.2: Create GET /api/shops/[id]/invites route (list invites)

Add the GET handler to the same route file created in Task 2.1. Steps: (1) `requireShopPermission(request, 'members', 'view', { expectedShopId })`, (2) query `shop_invites` WHERE `shop_id` with a join on `members` (via `invited_by`) to get inviter `first_name` and `last_name`, ordered by `created_at` DESC, (3) return the array with `AUTH_CACHE_HEADERS`. Use admin client for the query to bypass RLS (consistent with the POST handler in the same file).
**Files:** `src/app/api/shops/[id]/invites/route.ts`
**AC:** Returns 200 with array of invites including inviter names. Results are ordered by `created_at` DESC. Returns 401/403 for unauthorized. Uses `AUTH_CACHE_HEADERS`.
**Expert Domains:** supabase, nextjs

### Task 2.3: Create POST /api/shops/[id]/invites/[inviteId]/resend route

Implement the resend endpoint. Steps: (1) `requireShopPermission(request, 'members', 'full', { expectedShopId })`, (2) fetch the invite by `id` and `shop_id` using admin client, (3) return 404 if not found, (4) return 400 if status is not `pending`, (5) update `expires_at` to NOW() + 7 days using admin client, (6) get shop name from `shops` table, inviter name from `members` table, role name from `shop_roles` table for the email template, (7) resend email using `sendEmail` + `inviteToShop` template with the existing `token`, (8) return 200 with updated invite. Use `AUTH_CACHE_HEADERS` on all responses.
**Files:** `src/app/api/shops/[id]/invites/[inviteId]/resend/route.ts`
**AC:** Returns 200 with updated invite on success. Returns 404 if invite not found. Returns 400 if invite status is not `pending`. Resets `expires_at` to 7 days from now. Resends email with same token. Returns 401/403 for unauthorized.
**Expert Domains:** supabase, nextjs

### Task 2.4: Create DELETE /api/shops/[id]/invites/[inviteId] route (revoke)

Implement the revoke endpoint. Steps: (1) `requireShopPermission(request, 'members', 'full', { expectedShopId })`, (2) fetch the invite by `id` and `shop_id` using admin client, (3) return 404 if not found, (4) return 400 if status is not `pending`, (5) update status to `revoked` using admin client, (6) return 200 with `{ success: true }`. Use `AUTH_CACHE_HEADERS` on all responses.
**Files:** `src/app/api/shops/[id]/invites/[inviteId]/route.ts`
**AC:** Returns 200 with `{ success: true }` on success. Returns 404 if invite not found. Returns 400 if invite status is not `pending`. Sets status to `revoked` in DB. Returns 401/403 for unauthorized.
**Expert Domains:** supabase, nextjs

## Phase 3: Client-side services and Tanstack Query hooks

**Goal:** Create the client-side service functions and Tanstack Query hooks for consuming the invite API routes from components.
**Verify:** `pnpm typecheck && pnpm build`

### Task 3.1: Create shop invite service functions

Create client-side service functions using the `get`, `post`, and `del` helpers from `src/libs/fetch.ts`. Follow the pattern of existing functions in `src/features/shops/services/shop.ts` (e.g., `getShopRoles` uses `get`, `updateMemberRole` uses `patch`). Functions: `getShopInvites(shopId)` returns `ShopInviteWithInviter[]`, `createShopInvite(shopId, { email, roleId })` returns `ShopInvite`, `resendShopInvite(shopId, inviteId)` returns `ShopInvite`, `revokeShopInvite(shopId, inviteId)` returns `{ success: true }`.
**Files:** `src/features/shops/services/shop-invites.ts`
**AC:** All four functions are exported. `getShopInvites` uses `get`. `createShopInvite` uses `post`. `resendShopInvite` uses `post`. `revokeShopInvite` uses `del`. All functions are typed with the correct return types from `src/features/shops/types/invite.ts`.
**Expert Domains:** state-management

### Task 3.2: Create Tanstack Query hooks for shop invites

Create query and mutation hooks following the pattern in `src/features/shops/hooks/use-shops.ts`. Hooks: `useShopInvites(shopId)` with query key `['shops', shopId, 'invites']`, `useCreateInvite()` mutation that invalidates `['shops', shopId, 'invites']` on success, `useResendInvite()` mutation that invalidates the same key, `useRevokeInvite()` mutation that invalidates the same key. All mutations should accept `shopId` in their variables object for proper cache invalidation.
**Files:** `src/features/shops/hooks/use-shop-invites.ts`
**AC:** `useShopInvites(shopId)` returns a query result with `ShopInviteWithInviter[]` data. `useCreateInvite()` accepts `{ shopId, email, roleId }` and invalidates `['shops', shopId, 'invites']` on success. `useResendInvite()` accepts `{ shopId, inviteId }` and invalidates the same key. `useRevokeInvite()` accepts `{ shopId, inviteId }` and invalidates the same key. All hooks follow existing patterns (useQuery/useMutation from `@tanstack/react-query`).
**Expert Domains:** state-management
