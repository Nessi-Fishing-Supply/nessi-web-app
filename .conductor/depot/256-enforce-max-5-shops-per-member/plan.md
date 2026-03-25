# Implementation Plan: #256 — Enforce max 5 shops per member with reusable utility

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Foundation — constant, utility, and unit tests

**Goal:** Create the `MAX_SHOPS_PER_MEMBER` constant, the `checkMemberShopLimit` utility, and unit tests — all independently buildable with no route changes.
**Verify:** `pnpm build && pnpm test:run`

### Task 1.1: Create MAX_SHOPS_PER_MEMBER constant

Add a `limits.ts` constants file alongside the existing `roles.ts` in the shops constants directory. Export `MAX_SHOPS_PER_MEMBER = 5` as a named constant. This follows the same pattern as `constants/roles.ts` — a small file exporting domain-specific constants.
**Files:** `src/features/shops/constants/limits.ts`
**AC:** `MAX_SHOPS_PER_MEMBER` is exported and equals `5`. File imports cleanly via `@/features/shops/constants/limits`.
**Expert Domains:** nextjs

### Task 1.2: Create checkMemberShopLimit utility

Create `src/features/shops/utils/check-member-shop-limit.ts` exporting an async function `checkMemberShopLimit(memberId: string)` that returns `{ withinLimit: boolean; currentCount: number; maxCount: number }`. The function must use `createAdminClient` from `@/libs/supabase/admin` and query `shop_members` with `.select('*', { count: 'exact', head: true }).eq('member_id', memberId)` for an efficient count-only query. Compare count against `MAX_SHOPS_PER_MEMBER`. The utility must NOT import from `next/server` — it returns a plain object so invite endpoints can reuse it later.
**Files:** `src/features/shops/utils/check-member-shop-limit.ts`
**AC:** Function returns `{ withinLimit: true, currentCount: 0, maxCount: 5 }` when member has no shops, and `{ withinLimit: false, currentCount: 5, maxCount: 5 }` when member has 5 shops. No `next/server` imports.
**Expert Domains:** supabase

### Task 1.3: Add unit tests for checkMemberShopLimit

Create test file following the existing pattern in `src/features/shops/utils/__tests__/check-permission.test.ts`. Mock `createAdminClient` to return controlled count values. Test cases: count 0 (within limit), count 3 (within limit), count 5 (at limit, not within), count 7 (over limit, not within). Also test that `maxCount` always equals `MAX_SHOPS_PER_MEMBER`. Verify `withinLimit` is `true` when `currentCount < MAX_SHOPS_PER_MEMBER` and `false` otherwise.
**Files:** `src/features/shops/utils/__tests__/check-member-shop-limit.test.ts`
**AC:** Four test cases pass covering counts 0, 3, 5, and 7. All assertions verify `withinLimit`, `currentCount`, and `maxCount` fields. `pnpm test:run` passes.
**Expert Domains:** supabase

## Phase 2: Integration — wire into API route and update docs

**Goal:** Integrate the limit check into `POST /api/shops` and update the shops feature CLAUDE.md to document the new constant and utility.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck && pnpm test:run`

### Task 2.1: Integrate checkMemberShopLimit into POST /api/shops

Import `checkMemberShopLimit` into `src/app/api/shops/route.ts`. Insert the check immediately after the auth guard (after the `if (!user)` block, before `request.json()` body parsing). If `withinLimit` is `false`, return a 409 `NextResponse.json` with body `{ error: 'SHOP_LIMIT_REACHED', message: 'Members can belong to a maximum of 5 shops' }` and `AUTH_CACHE_HEADERS`. The success path remains completely unchanged.
**Files:** `src/app/api/shops/route.ts`
**AC:** `POST /api/shops` returns 409 with `{ error: 'SHOP_LIMIT_REACHED' }` when member has 5+ shop memberships. Returns 201 as before when under the limit. Check runs after auth, before body parsing. `AUTH_CACHE_HEADERS` included on 409 response.
**Expert Domains:** supabase, nextjs

### Task 2.2: Update shops feature CLAUDE.md

Add documentation for the new constant and utility to `src/features/shops/CLAUDE.md`. Add `constants/limits.ts` to the Architecture section listing `MAX_SHOPS_PER_MEMBER`. Add `utils/check-member-shop-limit.ts` to the Architecture section documenting its signature and return type. Add a note under Key Patterns about the shop membership limit and that invite endpoints should reuse this utility. Update the `POST /api/shops` documentation (currently not separately documented but referenced in the service layer) to note the 409 response.
**Files:** `src/features/shops/CLAUDE.md`
**AC:** CLAUDE.md documents `MAX_SHOPS_PER_MEMBER` constant, `checkMemberShopLimit` utility with its signature and return type, and mentions the 409 response on `POST /api/shops`. References future reuse by invite endpoints (#252, #253).
**Expert Domains:** nextjs
