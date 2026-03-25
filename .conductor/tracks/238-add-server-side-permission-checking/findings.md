# Findings — #238

## [B] ShopId mismatch between URL param and X-Nessi-Context header

**Check:** Code Review
**File:** `src/app/api/shops/[id]/members/route.ts`
**Error:** Route extracts `shopId` from URL params but `requireShopPermission` derives `shopId` from `X-Nessi-Context` header. A caller could have context for SHOP_A (where they're an owner) but POST to `/api/shops/SHOP_B/members`, passing the permission check against SHOP_A while inserting into SHOP_B. This is a privilege escalation vector.
**Fix:** Add a `expectedShopId` parameter to `requireShopPermission` that validates the header-derived shopId matches the route param. Return 403 on mismatch.

## [W] Permission level comparison duplicates check-permission.ts logic

**Check:** Code Review
**File:** `src/libs/shop-permissions.ts` (lines 20-24, 103-108)
**Error:** The `PERMISSION_LEVELS` numeric mapping duplicates logic from `src/features/shops/utils/check-permission.ts`. The shops CLAUDE.md says to use those utilities rather than hardcoding permission logic.
**Fix:** Add a `meetsLevel` function to `check-permission.ts` and import it, or document the intentional duplication.

## [W] Missing test for permission level 'none' on a feature

**Check:** Code Review
**File:** `src/libs/__tests__/shop-permissions.test.ts`
**Error:** Tests cover insufficient permission (view vs full required) but not the case where the permission is literally 'none' (e.g., manager checking 'members' feature with 'view' required).
**Fix:** Add a test case for this scenario.

## [I] Test assertions could verify response body content

## [I] Consider adding JSDoc to requireShopPermission

## [I] The request parameter is only used for the context header
