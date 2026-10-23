# Implementation Plan: #324 — Block Enforcement

## Overview

3 phases, 9 total tasks
Estimated scope: medium

## Phase 1: Database Migration and Shared Utility

**Goal:** Add the RLS policy allowing blocked users to query their own block status, then create the shared `isBlockedByServer` utility that all enforcement points depend on.
**Verify:** `pnpm build`

### Task 1.1: Add RLS SELECT policy for blocked_id on member_blocks

Create a new Supabase migration that adds a SELECT policy allowing authenticated users to query rows where `blocked_id = auth.uid()`. This enables the server client (which operates under the user's JWT) to check whether the current viewer has been blocked by a content owner — without using the admin client.
**MCP:** supabase
**Files:** `supabase/migrations/20260330100000_member_blocks_blocked_select_policy.sql`
**AC:** New policy `member_blocks_select_blocked` exists on `member_blocks` with `FOR SELECT TO authenticated USING (blocked_id = (SELECT auth.uid()))`. Existing policies are NOT modified. Migration applies cleanly.
**Expert Domains:** supabase

### Task 1.2: Create isBlockedByServer utility in block-server.ts

Add an `isBlockedByServer(viewerId: string | null, ownerId: string)` function to `src/features/blocks/services/block-server.ts`. The function returns `false` immediately for null viewerId (unauthenticated) and for self-view (viewerId === ownerId). Otherwise it queries `member_blocks` where `blocker_id = ownerId` AND `blocked_id = viewerId` using the server client. Returns `true` if a row exists, `false` otherwise. Export from the barrel `src/features/blocks/index.ts`.
**Files:** `src/features/blocks/services/block-server.ts`, `src/features/blocks/index.ts`
**AC:** `isBlockedByServer(null, 'any')` returns `false`. `isBlockedByServer('A', 'A')` returns `false`. When a block row exists with `blocker_id = ownerX, blocked_id = viewerY`, `isBlockedByServer('viewerY', 'ownerX')` returns `true`. When no row exists, returns `false`. Function is exported from `src/features/blocks/index.ts`.
**Expert Domains:** supabase

## Phase 2: Page-Level Enforcement

**Goal:** Wire `isBlockedByServer` into the three public detail pages so blocked users see `notFound()` — indistinguishable from a non-existent entity.
**Verify:** `pnpm build`

### Task 2.1: Enforce block check on member profile page

In `src/app/(frontend)/member/[slug]/page.tsx`, after resolving the member and the current user, call `isBlockedByServer(currentUserId, member.id)`. If blocked, call `notFound()`. Apply the same check in `generateMetadata` so OG metadata also returns the "not found" metadata when blocked. The `createClient` call already exists in the page — reuse it to get the user ID.
**Files:** `src/app/(frontend)/member/[slug]/page.tsx`
**AC:** When member A blocks member B, member B visiting `/member/{A-slug}` sees the not-found page. Unauthenticated users are not affected. Member A viewing their own profile is not affected. `generateMetadata` returns `{ title: 'Member Not Found' }` when blocked.
**Expert Domains:** nextjs, supabase

### Task 2.2: Enforce block check on shop page

In `src/app/(frontend)/shop/[slug]/page.tsx`, after resolving the shop and the current user, call `isBlockedByServer(currentUserId, shop.owner_id)`. If blocked, call `notFound()`. Apply the same check in `generateMetadata`. The shop entity has `owner_id` which is the member who owns the shop — this is the blocker identity.
**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**AC:** When member A (shop owner) blocks member B, member B visiting `/shop/{A-shop-slug}` sees the not-found page. Unauthenticated users are not affected. Shop owner viewing their own shop is not affected. `generateMetadata` returns `{ title: 'Shop Not Found' }` when blocked.
**Expert Domains:** nextjs, supabase

### Task 2.3: Enforce block check on listing detail page

In `src/app/(frontend)/listing/[id]/page.tsx`, after resolving the listing (which includes `seller_id` from `getListingWithSellerServer`), call `isBlockedByServer(currentUserId, listing.seller_id)`. If blocked, call `notFound()`. Apply the same check in `generateMetadata`. The listing's `seller_id` is the member identity of the seller.
**Files:** `src/app/(frontend)/listing/[id]/page.tsx`
**AC:** When seller A blocks member B, member B visiting `/listing/{A-listing-id}` sees the not-found page. Unauthenticated users are not affected. Seller viewing their own listing is not affected. `generateMetadata` returns `{ title: 'Listing Not Found' }` when blocked.
**Expert Domains:** nextjs, supabase

## Phase 3: Cart Enforcement and Documentation

**Goal:** Prevent blocked users from adding blocked sellers' listings to cart, flag blocked items during cart validation, and update feature documentation.
**Verify:** `pnpm build`

### Task 3.1: Add block check to addToCartServer

In `src/features/cart/services/cart-server.ts`, import `isBlockedByServer` and add a block check in `addToCartServer` after fetching the listing (step 1) and before the duplicate check (step 3). Check `isBlockedByServer(userId, listing.seller_id)`. If blocked, throw `new Error('Seller has blocked you')`. This uses `seller_id` (the member who listed the item), consistent with the listing page enforcement.
**Files:** `src/features/cart/services/cart-server.ts`
**AC:** When seller A blocks member B, `addToCartServer(B, listingByA, ...)` throws `'Seller has blocked you'`. Non-blocked users are unaffected. The check uses `seller_id`, not `shop_id`.
**Expert Domains:** supabase

### Task 3.2: Handle blocked error in cart API route

In `src/app/api/cart/route.ts`, add a catch clause in the POST handler for the `'Seller has blocked you'` error message, returning a 403 status with the error message. This matches the existing error handling pattern (specific error messages mapped to HTTP status codes).
**Files:** `src/app/api/cart/route.ts`
**AC:** `POST /api/cart` with a blocked seller's listing returns `{ error: 'Seller has blocked you' }` with HTTP 403. Other error paths are unchanged.
**Expert Domains:** nextjs

### Task 3.3: Add batch block check to validateCartServer

In `src/features/cart/services/cart-server.ts`, add a batch block check to `validateCartServer`. After fetching all cart items, collect unique `seller_id` values. Perform a single query on `member_blocks` where `blocker_id IN (sellerIds)` AND `blocked_id = userId` to get all sellers who have blocked the current user. Then in the validation loop, if the item's `seller_id` is in the blocked set, push the item to `removed` with `reason: 'blocked'`. Add `'blocked'` to the `reason` union type in `CartValidationResult` in `src/features/cart/types/cart.ts`.
**Files:** `src/features/cart/services/cart-server.ts`, `src/features/cart/types/cart.ts`
**AC:** When seller A blocks member B, `validateCartServer(B)` returns A's listings in the `removed` array with `reason: 'blocked'`. The block check is a single batch query (no N+1). The `'blocked'` reason is added to the `CartValidationResult` removed reason union type. Non-blocked items are unaffected.
**Expert Domains:** supabase

### Task 3.4: Update blocks feature documentation

Update `src/features/blocks/CLAUDE.md` to document the block enforcement system: the new RLS policy, the `isBlockedByServer` utility (signature, behavior, usage), and the enforcement points (member profile, shop page, listing detail, cart add, cart validate). Add the new export to the directory structure section.
**Files:** `src/features/blocks/CLAUDE.md`
**AC:** CLAUDE.md documents: (1) the new `member_blocks_select_blocked` RLS policy, (2) `isBlockedByServer` function signature and all four return-false cases, (3) all five enforcement points with file paths, (4) the `'blocked'` cart validation reason.
**Expert Domains:** supabase
