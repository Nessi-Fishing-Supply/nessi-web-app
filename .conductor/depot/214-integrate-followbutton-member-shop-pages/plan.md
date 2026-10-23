# Implementation Plan: #214 — Integrate FollowButton into member profile and shop pages

## Overview

2 phases, 5 total tasks
Estimated scope: small

## Phase 1: Integrate FollowButton into member profile and shop pages

**Goal:** Add the FollowButton component to both public profile pages, hidden on own profile/shop, with server-side follower count passed as initialFollowerCount.
**Verify:** `pnpm build`

### Task 1.1: Add FollowButton to the member profile page

Import `FollowButton` from `@/features/follows` into the member profile server component page. Render it in the header section (below the handle/member-since text, above preferences), conditionally hidden when `isOwnProfile` is true. Pass `targetType="member"`, `targetId={member.id}`, `targetName` as the formatted member name, and `initialFollowerCount={member.follower_count}`. The `member` object already includes `follower_count` because `getMemberBySlugServer` uses `select('*')`. The `currentUserId` and `isOwnProfile` variables are already computed in the page. Use `size="sm"` for the profile context.

**Files:** `src/app/(frontend)/member/[slug]/page.tsx`
**Reuses:** `src/features/follows/components/follow-button/`
**AC:** FollowButton renders on member profile pages when viewing another member's profile; FollowButton is NOT rendered when viewing own profile (isOwnProfile === true); initialFollowerCount is passed from the server-fetched member.follower_count.
**Expert Domains:** nextjs

### Task 1.2: Add FollowButton to the shop page

Import `FollowButton` from `@/features/follows` into the shop page server component. Render it in the header section (inside `.headerInfo`, below the description or shop-since text), conditionally hidden when `isOwnShop` is true. Pass `targetType="shop"`, `targetId={shop.id}`, `targetName={shop.shop_name}`, and `initialFollowerCount={shop.follower_count}`. The `shop` object already includes `follower_count` because `getShopBySlugServer` uses `select('*')`. Use `size="sm"` for the profile context.

**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**Reuses:** `src/features/follows/components/follow-button/`
**AC:** FollowButton renders on shop pages when viewing a shop you do not own; FollowButton is NOT rendered when viewing own shop (isOwnShop === true); initialFollowerCount is passed from the server-fetched shop.follower_count.
**Expert Domains:** nextjs

## Phase 2: Add Followers stat to stats sections

**Goal:** Display the follower count in the stats sections of both pages, making social proof visible alongside existing stats (Sales, Reviews).
**Verify:** `pnpm build`

### Task 2.1: Add Followers stat to the member profile stats section

Add a "Followers" stat item to the existing `.stats` section on the member profile page. Render `member.follower_count` as the stat value with "Followers" as the label, using the same `.statItem` / `.statValue` / `.statLabel` class pattern already used for Sales and Reviews. Place it as the last item in the stats row. The stats section currently only renders when `member.is_seller` is true — move the Followers stat outside of the `is_seller` guard so it appears for all members. If the member is not a seller, render a standalone stats section containing only the Followers stat.

**Files:** `src/app/(frontend)/member/[slug]/page.tsx`
**AC:** Followers stat appears in the stats section for all member profiles (not just sellers); the stat value matches `member.follower_count`; the stat uses the same visual pattern (statItem/statValue/statLabel classes) as Sales and Reviews; for sellers, Followers appears alongside Sales and Reviews; for non-sellers, a stats section with only the Followers stat is rendered.
**Expert Domains:** nextjs, scss

### Task 2.2: Add Followers stat to the shop page stats section

Add a "Followers" stat item to the existing `.stats` section on the shop page. Render `shop.follower_count` as the stat value with "Followers" as the label, using the same `.statItem` / `.statValue` / `.statLabel` class pattern already used for Sales and Reviews. Place it as the last item in the stats row.

**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**AC:** Followers stat appears in the shop page stats section alongside Sales and Reviews; the stat value matches `shop.follower_count`; the stat uses the same visual pattern (statItem/statValue/statLabel classes) as the existing stats.
**Expert Domains:** nextjs

### Task 2.3: Update follows feature CLAUDE.md with integration documentation

Add an "Integrations" section to the follows feature CLAUDE.md documenting where FollowButton is rendered (member profile page, shop page), the props passed in each context, and the own-profile/own-shop hiding behavior. This keeps the feature documentation complete for future developers.

**Files:** `src/features/follows/CLAUDE.md`
**AC:** CLAUDE.md documents both integration points (member profile page path, shop page path); documents the conditional rendering logic (hidden on own profile/shop); documents props passed in each context including initialFollowerCount source.
