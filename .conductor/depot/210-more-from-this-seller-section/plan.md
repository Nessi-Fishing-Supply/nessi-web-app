# Implementation Plan: #210 — More From This Seller section on listing detail page

## Overview

1 phase, 3 total tasks
Estimated scope: small

## Phase 1: Add MoreFromSellerStrip component and wire into listing detail page

**Goal:** Create a drop-in `MoreFromSellerStrip` component that uses the existing `useRecommendations({ context: 'seller' })` hook and `ListingScrollStrip`, then render it on the listing detail page below Similar Items.
**Verify:** `pnpm build`

### Task 1.1: Create MoreFromSellerStrip component

Create a new component following the exact pattern established by `SimilarItemsStrip` and `AlsoLikedStrip`. The component calls `useRecommendations` with `context: 'seller'`, passing `sellerId`, `shopId`, and `excludeListingId`. It derives the display title from the `seller` prop: for `type: 'member'`, use `first_name`; for `type: 'shop'`, use `shop_name`. The title reads `More From {SellerName}`. Returns `null` when loading is complete and no listings are returned (hidden when seller has no other active listings).

**Files:**

- `src/features/listings/components/more-from-seller-strip/index.tsx` (create)

**AC:**

- Component renders `ListingScrollStrip` with dynamic title `More From {name}` where name comes from the `seller` prop
- Component returns `null` when `isLoading` is false and listings array is empty
- Component passes `ariaLabel="More listings from {name}"` to `ListingScrollStrip`
- Component calls `useRecommendations({ context: 'seller', sellerId, shopId, excludeListingId })` with correct params
- Component accepts props: `sellerId: string`, `seller: SellerIdentity`, `shopId?: string`, `excludeListingId: string`

**Reuses:** `src/components/layout/listing-scroll-strip/`, `src/features/listings/hooks/use-recommendations.ts`
**Expert Domains:** nextjs, state-management

### Task 1.2: Export MoreFromSellerStrip from listings barrel

Add the new component to the listings feature barrel export in `index.ts`, matching the pattern used by `SimilarItemsStrip` and `AlsoLikedStrip`. Also add it to the Components table in the feature CLAUDE.md.

**Files:**

- `src/features/listings/index.ts` (modify — add export line)
- `src/features/listings/CLAUDE.md` (modify — add row to Components table)

**AC:**

- `export { default as MoreFromSellerStrip } from './components/more-from-seller-strip'` is present in `index.ts`
- CLAUDE.md Components table includes a `MoreFromSellerStrip` row with accurate description and props summary

**Expert Domains:** nextjs

### Task 1.3: Wire MoreFromSellerStrip into listing detail page

Import `MoreFromSellerStrip` and render it in `listing-detail.tsx` inside the `belowFold` div, directly below the existing `SimilarItemsStrip`. Pass `sellerId` from `listing.seller_id`, `shopId` from `listing.shop_id`, `excludeListingId` as `listing.id`, and `seller` from the component's `seller` prop. The component renders independently of Similar Items — it should not be nested or conditionally gated by the Similar Items strip. Only render when `seller` is not null (same guard pattern used for `SellerStrip`).

**Files:**

- `src/app/(frontend)/listing/[id]/listing-detail.tsx` (modify)

**AC:**

- `MoreFromSellerStrip` is rendered below `SimilarItemsStrip` and above the Report row in the `belowFold` section
- Component is only rendered when `seller` is not null
- Props passed: `sellerId={listing.seller_id}`, `shopId={listing.shop_id ?? undefined}`, `excludeListingId={listing.id}`, `seller={seller}`
- The strip renders independently — it is not wrapped in the same conditional or container as `SimilarItemsStrip`
- `pnpm build` passes with no type errors

**Reuses:** `src/features/listings/components/similar-items-strip/` (pattern reference), `src/features/listings/components/more-from-seller-strip/` (created in Task 1.1)
**Expert Domains:** nextjs
