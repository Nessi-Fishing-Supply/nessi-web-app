# Implementation Plan: #257 — Ownership Transfer Request/Accept/Cancel Backend

## Overview

4 phases, 15 total tasks
Estimated scope: large

## Phase 1: Database Migration and Types

**Goal:** Create the `shop_ownership_transfers` table with RLS policies and regenerate TypeScript types
**Verify:** `pnpm build`

### Task 1.1: Create `shop_ownership_transfers` table migration

Create the `shop_ownership_transfers` table via Supabase MCP. The table stores pending ownership transfer requests with token-based acceptance. Schema: `id` (uuid PK, default gen_random_uuid()), `shop_id` (uuid FK to shops ON DELETE CASCADE, NOT NULL), `from_member_id` (uuid FK to members ON DELETE CASCADE, NOT NULL), `to_member_id` (uuid FK to members ON DELETE CASCADE, NOT NULL), `token` (uuid UNIQUE NOT NULL, default gen_random_uuid()), `status` (text NOT NULL, default 'pending', CHECK in ('pending', 'accepted', 'cancelled')), `created_at` (timestamptz default now()), `expires_at` (timestamptz NOT NULL). Add a partial unique index on `(shop_id) WHERE status = 'pending'` to enforce one pending transfer per shop. Add RLS policies: authenticated users can SELECT rows where they are `from_member_id` or `to_member_id`. All mutations go through admin client in API routes, so no INSERT/UPDATE/DELETE RLS policies needed for authenticated users.
**Files:** Supabase migration (applied via MCP)
**AC:** Table exists with correct columns, FKs, partial unique index, and RLS policies. `SELECT` from the table works for authenticated users who are from/to member.
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.2: Regenerate database types and add `OwnershipTransfer` type

Run `pnpm db:types` to regenerate `src/types/database.ts` with the new `shop_ownership_transfers` table. Then add the `OwnershipTransfer` type to `src/features/shops/types/shop.ts`, derived from `Database['public']['Tables']['shop_ownership_transfers']['Row']`, following the same pattern as `Shop` and `ShopMember` types. Also add `OwnershipTransferWithDetails` type that includes joined shop name and member names (used by the token-based lookup endpoint for the accept page).
**Files:** `src/types/database.ts` (regenerated), `src/features/shops/types/shop.ts`
**AC:** `OwnershipTransfer` type exists and matches the database row. `OwnershipTransferWithDetails` includes `shopName`, `fromMemberName`, `toMemberName`, `expiresAt`, `status` fields. `pnpm typecheck` passes.
**Expert Domains:** supabase

## Phase 2: Email Template and Service Functions

**Goal:** Create the ownership transfer email template and all client-side service functions that call the new API routes
**Verify:** `pnpm build`

### Task 2.1: Create ownership transfer email template

Create `src/features/email/templates/ownership-transfer.ts` following the exact pattern of `invite-to-shop.ts`. The template function `ownershipTransferRequest` accepts `{ shopName, ownerName, token }` and returns an `EmailTemplate`. The email body should inform the recipient that `ownerName` wants to transfer ownership of `shopName` to them, with a CTA button linking to `{NEXT_PUBLIC_APP_URL}/shop/transfer/{token}`, a fallback link, an expiry note ("This link expires in 7 days"), and a safe-to-ignore disclaimer. Use `escapeHtml()` on all user-provided strings and `emailLayout()` for the branded shell.
**Files:** `src/features/email/templates/ownership-transfer.ts`
**AC:** Template function exports correctly, uses `emailLayout`, escapes HTML, generates accept URL with token. Subject line is descriptive (e.g., "Ownership transfer request for {shopName} on Nessi").
**Expert Domains:** nextjs

### Task 2.2: Create ownership transfer service functions

Create `src/features/shops/services/shop-ownership-transfer.ts` with client-side service functions that call the API routes via the `get`/`post`/`del` helpers from `@/libs/fetch` (which automatically attach `X-Nessi-Context` header). Functions: `initiateOwnershipTransfer(shopId, newOwnerId)` calls `POST /api/shops/{shopId}/ownership` with `{ newOwnerId }`, returns `{ success: true }`. `getOwnershipTransfer(shopId)` calls `GET /api/shops/{shopId}/ownership-transfer`, returns `OwnershipTransfer | null`. `cancelOwnershipTransfer(shopId)` calls `DELETE /api/shops/{shopId}/ownership-transfer`, returns `{ success: true }`. For token-based endpoints (no `X-Nessi-Context`), use raw `fetch` with cookie session (same pattern as `acceptShopInvite` in `shop-invites.ts`): `getOwnershipTransferByToken(token)` calls `GET /api/shops/ownership-transfer/{token}`, returns `OwnershipTransferWithDetails`. `acceptOwnershipTransfer(token)` calls `POST /api/shops/ownership-transfer/{token}/accept`, returns `{ success: true, shopId, shopName }`.
**Files:** `src/features/shops/services/shop-ownership-transfer.ts`
**AC:** All 5 functions exported. Shop-scoped functions use `get`/`post`/`del` from `@/libs/fetch`. Token-based functions use raw `fetch` (no `X-Nessi-Context`). Error handling follows `acceptShopInvite` pattern with `Object.assign(new Error(...), { code })`.
**Expert Domains:** nextjs

### Task 2.3: Remove `transferOwnership` from `shop.ts` service

Remove the `transferOwnership(shopId, newOwnerId)` function from `src/features/shops/services/shop.ts` and its import in `src/features/shops/hooks/use-shops.ts`. The existing `POST /api/shops/{id}/ownership` endpoint will be refactored in Phase 3 to initiate a transfer instead of completing one instantly, and the new `initiateOwnershipTransfer` in `shop-ownership-transfer.ts` replaces it. Update imports in any file that references `transferOwnership`.
**Files:** `src/features/shops/services/shop.ts`, `src/features/shops/hooks/use-shops.ts`
**AC:** `transferOwnership` no longer exists in `shop.ts`. No import references to it remain. `pnpm typecheck` passes. `useTransferOwnership` hook is removed from `use-shops.ts` (it will be replaced in Phase 4).

## Phase 3: API Routes

**Goal:** Refactor the existing ownership POST endpoint and create all new ownership transfer API routes
**Verify:** `pnpm build`

### Task 3.1: Refactor `POST /api/shops/[id]/ownership` to initiate transfer

Refactor the existing route to create a pending transfer record instead of performing an instant swap. Keep the `requireShopPermission(request, 'members', 'full')` guard. Parse `newOwnerId` from request body. Verify `newOwnerId` is a shop member (existing check). Use admin client to: (1) check for existing pending transfer for this shop (return 409 if exists), (2) generate token via `crypto.randomUUID()`, compute `expires_at` (7 days), insert into `shop_ownership_transfers`, (3) look up transferee's email from `auth.users` via `admin.auth.admin.getUserById(newOwnerId)`, (4) look up owner name from `members` table, shop name from `shops` table, (5) send email using `sendEmail` + `ownershipTransferRequest` template (failure logged but does not block response). Return `{ success: true }` on 200.
**Files:** `src/app/api/shops/[id]/ownership/route.ts`
**AC:** POST creates a pending record and returns success. Returns 409 if pending transfer already exists. Sends email with acceptance link. Uses `AUTH_CACHE_HEADERS`. Does NOT perform instant ownership swap.
**Expert Domains:** supabase, nextjs

### Task 3.2: Create `GET /api/shops/[id]/ownership-transfer` route

Create route at `src/app/api/shops/[id]/ownership-transfer/route.ts`. Use `requireShopPermission(request, 'members', 'view', { expectedShopId })`. Query `shop_ownership_transfers` via admin client for the shop where `status = 'pending'` and `expires_at > now()`. Return the transfer record or 404 if none found. Include `AUTH_CACHE_HEADERS`.
**Files:** `src/app/api/shops/[id]/ownership-transfer/route.ts`
**AC:** Returns pending transfer with member details or 404. Expired transfers (past `expires_at`) are treated as not found. Requires `members: view` permission.
**Expert Domains:** supabase, nextjs

### Task 3.3: Create `DELETE /api/shops/[id]/ownership-transfer` route

Add DELETE handler to `src/app/api/shops/[id]/ownership-transfer/route.ts` (same file as Task 3.2). Use `requireShopPermission(request, 'members', 'full', { expectedShopId })` (Owner-only). Find pending transfer for this shop via admin client, return 404 if none. Update status to `'cancelled'`. Return `{ success: true }` with `AUTH_CACHE_HEADERS`.
**Files:** `src/app/api/shops/[id]/ownership-transfer/route.ts`
**AC:** DELETE sets status to cancelled. Returns 404 if no pending transfer. Owner-only via `members: full`. Uses `AUTH_CACHE_HEADERS`.
**Expert Domains:** supabase, nextjs

### Task 3.4: Create `GET /api/shops/ownership-transfer/[token]` route

Create route at `src/app/api/shops/ownership-transfer/[token]/route.ts`. This is a token-based endpoint that does NOT use `requireShopPermission` or `X-Nessi-Context`. Authenticate via server Supabase client (`getUser()`), return 401 if no session. Look up transfer by token via admin client with joined data: shop name (from `shops`), from-member name (from `members`), to-member name (from `members`). Verify `user.id === transfer.to_member_id`, return 403 if not. Check `expires_at` — return 410 if expired. Check `status === 'pending'` — return 404 for non-pending. Return transfer details as `OwnershipTransferWithDetails` shape. Follow the pattern of `src/app/api/invites/[token]/accept/route.ts` for auth handling.
**Files:** `src/app/api/shops/ownership-transfer/[token]/route.ts`
**AC:** Returns transfer details for the correct transferee. 401 for unauthenticated. 403 for wrong user. 410 for expired. 404 for invalid/non-pending token. No `X-Nessi-Context` required.
**Expert Domains:** supabase, nextjs

### Task 3.5: Create `POST /api/shops/ownership-transfer/[token]/accept` route

Create route at `src/app/api/shops/ownership-transfer/[token]/accept/route.ts`. Token-based endpoint, no `X-Nessi-Context`. Authenticate via server client. Look up transfer by token via admin client. Validate: token exists (404), status is pending (404), not expired (410), `user.id === to_member_id` (403). On validation pass, perform the atomic ownership swap (moved from the old `POST /api/shops/[id]/ownership` logic): (1) update `shops.owner_id` to `to_member_id`, (2) set new owner's `shop_members.role_id` to `SYSTEM_ROLE_IDS.OWNER`, (3) set old owner's `shop_members.role_id` to `SYSTEM_ROLE_IDS.MANAGER`, (4) set transfer status to `'accepted'`. Use `Promise.all` for the swap operations as the original route does. Return `{ success: true, shopId, shopName }` with `AUTH_CACHE_HEADERS`.
**Files:** `src/app/api/shops/ownership-transfer/[token]/accept/route.ts`
**AC:** Performs atomic ownership swap on valid accept. Returns 410 for expired, 403 for wrong user, 404 for invalid token. Old owner demoted to Manager, new owner promoted to Owner. Transfer status set to accepted. Uses `SYSTEM_ROLE_IDS` constants.
**Expert Domains:** supabase, nextjs

## Phase 4: Hooks and Documentation

**Goal:** Create Tanstack Query hooks for all ownership transfer operations and update feature documentation
**Verify:** `pnpm build`

### Task 4.1: Create ownership transfer query hooks

Create `src/features/shops/hooks/use-ownership-transfer.ts` with Tanstack Query hooks. Query hooks: `useOwnershipTransfer(shopId)` with query key `['shops', shopId, 'ownership-transfer']`, calls `getOwnershipTransfer`, enabled when shopId is truthy. `useOwnershipTransferByToken(token)` with query key `['shops', 'ownership-transfer', token]`, calls `getOwnershipTransferByToken`, enabled when token is truthy. Mutation hooks: `useInitiateOwnershipTransfer()` calls `initiateOwnershipTransfer`, on success invalidates `['shops', shopId, 'ownership-transfer']`. `useCancelOwnershipTransfer()` calls `cancelOwnershipTransfer`, on success invalidates `['shops', shopId, 'ownership-transfer']`. `useAcceptOwnershipTransfer()` calls `acceptOwnershipTransfer`, on success invalidates `['shops']` broadly (ownership changed). Follow the patterns in `use-shop-invites.ts` for structure.
**Files:** `src/features/shops/hooks/use-ownership-transfer.ts`
**AC:** All 5 hooks exported. Query keys match the spec. Mutations invalidate correct query keys. `useAuth` used for `useAcceptOwnershipTransfer` to get user ID for broader invalidation. `pnpm typecheck` passes.
**Expert Domains:** state-management

### Task 4.2: Update `src/features/shops/CLAUDE.md` with ownership transfer documentation

Update the shops feature CLAUDE.md to document: (1) the new `shop_ownership_transfers` table and its purpose, (2) new service functions in `services/shop-ownership-transfer.ts`, (3) new hooks in `hooks/use-ownership-transfer.ts` with their query keys, (4) new API routes (`GET/DELETE /api/shops/[id]/ownership-transfer`, `GET /api/shops/ownership-transfer/[token]`, `POST /api/shops/ownership-transfer/[token]/accept`), (5) the refactored `POST /api/shops/[id]/ownership` behavior (initiate vs instant), (6) the email template in `email/templates/ownership-transfer.ts`. Remove documentation of the old `transferOwnership` service function and `useTransferOwnership` hook. Add the new types to the types table.
**Files:** `src/features/shops/CLAUDE.md`
**AC:** CLAUDE.md accurately documents all new service functions, hooks, API routes, and types. Old `transferOwnership`/`useTransferOwnership` references are removed or updated. New flow (request/accept/cancel) is clearly described.
