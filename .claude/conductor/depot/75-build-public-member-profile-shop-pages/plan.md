# Implementation Plan: #75 — Build public member profile and shop pages with slug routing

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: Server-side data fetching functions
**Goal:** Create server-side service functions that fetch member, shop, and product data using the Supabase server client, since existing services use the browser client and cannot be used in server components.
**Verify:** `pnpm build`

### Task 1.1: Add server-side member fetch by slug
Create a server-side function to fetch a member by slug using the Supabase server client (`@/libs/supabase/server`). The existing `getMemberBySlug` in `src/features/members/services/member.ts` uses the browser client (`@/libs/supabase/client`) and cannot be called from server components. Create a new server services file following the same query pattern (filter `deleted_at IS NULL`, return `null` for PGRST116 errors).

**Files:** `src/features/members/services/member-server.ts`
**AC:**
- Exports `getMemberBySlugServer(slug: string): Promise<Member | null>` using `createClient` from `@/libs/supabase/server`
- Filters out soft-deleted members (`deleted_at IS NULL`)
- Returns `null` for non-existent slugs (PGRST116 error code)
- Uses the same `Member` type from `@/features/members/types/member`
**Expert Domains:** supabase, nextjs

### Task 1.2: Add server-side shop fetch by slug
Create a server-side function to fetch a shop by slug using the Supabase server client. Mirrors the existing `getShopBySlug` pattern but uses the server client for server component compatibility.

**Files:** `src/features/shops/services/shop-server.ts`
**AC:**
- Exports `getShopBySlugServer(slug: string): Promise<Shop | null>` using `createClient` from `@/libs/supabase/server`
- Filters out soft-deleted shops (`deleted_at IS NULL`)
- Returns `null` for non-existent slugs (PGRST116 error code)
- Uses the same `Shop` type from `@/features/shops/types/shop`
**Expert Domains:** supabase, nextjs

### Task 1.3: Add server-side product fetch by member and by shop
Create server-side functions to fetch visible products (with images) by `member_id` or `shop_id`. These are needed by both public pages to render product grids. Query `products` with `product_images(*)` join, filtering `is_visible = true`. Follow the same pattern as `getProduct` in `src/app/(frontend)/item/[id]/page.tsx` which queries products server-side with a join.

**Files:** `src/features/products/services/product-server.ts`
**AC:**
- Exports `getProductsByMemberServer(memberId: string): Promise<ProductWithImages[]>` — fetches products where `member_id` matches and `is_visible = true`, with `product_images(*)` join
- Exports `getProductsByShopServer(shopId: string): Promise<ProductWithImages[]>` — fetches products where `shop_id` matches, with `product_images(*)` join
- Both use `createClient` from `@/libs/supabase/server`
- Both use the `ProductWithImages` type from `@/features/products/types/product`
- Returns empty array (not null) when no products found
**Expert Domains:** supabase, nextjs

## Phase 2: Member profile page
**Goal:** Build the `/member/[slug]` server-rendered page with generateMetadata, conditional buyer/seller content, and responsive styles.
**Verify:** `pnpm build`

### Task 2.1: Create member profile page component
Build the server component page at `/member/[slug]`. Fetch the member by slug using `getMemberBySlugServer`; call `notFound()` if null. Render a centered layout with: avatar (using `next/image` with `fill` in a circular container), `display_name`, `@{slug}` handle, "Member since {date}" from `created_at`, and fishing preferences (`primary_species`, `primary_technique`) rendered as `Pill` components. If `is_seller === true`, also fetch products via `getProductsByMemberServer` and render a product grid using the existing `ProductCard` component (which is a client component — this is fine as a child of a server component). Show seller stats: `review_count`, `total_transactions`, `response_time_hours`. Show "No listings yet" empty state if seller has zero products. Include `generateMetadata()` returning `title: display_name`, `description` with member info, and OG image from `avatar_url`. Follow the `params: Promise<{ slug: string }>` pattern established in `src/app/(frontend)/item/[id]/page.tsx`.

**Files:** `src/app/(frontend)/member/[slug]/page.tsx`
**AC:**
- Server component (no `'use client'` directive)
- `generateMetadata()` returns `title: member.display_name` (uses template `%s | Nessi`), description, and OG image
- Renders avatar with `next/image` using `fill` layout, `sizes="120px"`, and `object-fit: cover`
- Shows display_name, @slug handle, member since date
- Shows fishing preferences as Pill components (species and techniques)
- When `is_seller === false`: no products section rendered
- When `is_seller === true`: renders product grid with ProductCard components, shows stats (review_count, total_transactions, response_time_hours)
- Shows "No listings yet" when seller has zero products
- Calls `notFound()` for non-existent or soft-deleted slugs
- `params` uses `Promise<{ slug: string }>` pattern
**Reuses:** `src/components/indicators/pill/`, `src/features/products/components/product-card/`
**Expert Domains:** nextjs, supabase

### Task 2.2: Create member profile styles
Create the SCSS module for the member profile page. Mobile-first design: single column, centered layout. Avatar is a circle (120px on mobile, 160px on tablet+). Fishing preferences wrap horizontally as pills. Product grid uses CSS Grid: 1 column on mobile, 2 at `md`, 3 at `lg`. Stats section uses a horizontal row of stat items. Use design tokens from `src/styles/variables/` for all spacing, colors, typography, and radii. Import breakpoints mixin for responsive overrides.

**Files:** `src/app/(frontend)/member/[slug]/member-profile.module.scss`
**AC:**
- Mobile-first: base styles target smallest viewport
- Avatar container: 120px circle on mobile, 160px at `md` breakpoint, `position: relative` for `next/image` `fill`
- Product grid: `grid-template-columns: 1fr` base, `repeat(2, 1fr)` at `md`, `repeat(3, 1fr)` at `lg`
- Uses `@include breakpoint()` mixin for all responsive overrides
- Uses CSS custom property tokens for spacing, colors, typography, radii, shadows
- No hardcoded hex colors, pixel spacing, or font sizes
- Stats section: horizontal flex with gap
- Fishing preferences: flex-wrap row for pills
**Expert Domains:** scss

## Phase 3: Shop page
**Goal:** Build the `/shop/[slug]` server-rendered page with generateMetadata, product grid, and placeholder sections for premium features.
**Verify:** `pnpm build`

### Task 3.1: Create shop page component
Build the server component page at `/shop/[slug]`. Fetch the shop by slug using `getShopBySlugServer`; call `notFound()` if null. Render a wider layout with: shop avatar (using `next/image`), `shop_name`, `@{slug}` handle, `description`, and shop stats (`review_count`, `total_transactions`). Fetch products via `getProductsByShopServer` and render a product grid using `ProductCard`. Show "No listings yet" empty state if no products. Add placeholder comment sections for premium features (hero banner, brand colors, verified badge) that are out of scope. Include `generateMetadata()` with `title: shop_name`, description from `shop.description`, and OG image from `avatar_url`.

**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**AC:**
- Server component (no `'use client'` directive)
- `generateMetadata()` returns `title: shop.shop_name` (uses template `%s | Nessi`), description from `shop.description`, and OG image
- Renders shop avatar with `next/image` using `fill` layout, `sizes="120px"`, and `object-fit: cover`
- Shows shop_name, @slug handle, description
- Renders product grid with ProductCard components
- Shows shop stats: review_count, total_transactions
- Shows "No listings yet" empty state when no products
- Calls `notFound()` for non-existent or soft-deleted slugs
- Has placeholder comments for premium features (hero banner, brand colors, verified badge)
- `params` uses `Promise<{ slug: string }>` pattern
**Reuses:** `src/features/products/components/product-card/`
**Expert Domains:** nextjs, supabase

### Task 3.2: Create shop page styles
Create the SCSS module for the shop page. Mobile-first design with a wider layout than the member profile. Shop header section with avatar, name, handle, and description. Product grid uses CSS Grid: 1 column on mobile, 2 at `sm`, 3 at `md`, 4 at `lg`. Stats in a horizontal row. Use design tokens throughout. The shop page header should be full-width with a background section (placeholder area where a hero banner would go for premium shops).

**Files:** `src/app/(frontend)/shop/[slug]/shop-page.module.scss`
**AC:**
- Mobile-first: base styles target smallest viewport
- Shop header: full-width section with avatar, name, description stacked on mobile, side-by-side at `md`
- Avatar container: 120px circle on mobile, 160px at `md`, `position: relative` for `next/image` `fill`
- Product grid: `grid-template-columns: 1fr` base, `repeat(2, 1fr)` at `sm`, `repeat(3, 1fr)` at `md`, `repeat(4, 1fr)` at `lg`
- Uses `@include breakpoint()` mixin for all responsive overrides
- Uses CSS custom property tokens for spacing, colors, typography, radii, shadows
- No hardcoded hex colors, pixel spacing, or font sizes
- Hero banner placeholder area styled but visually minimal (reserved for premium)
- Stats section: horizontal flex with gap
**Expert Domains:** scss

### Task 3.3: Add not-found pages for member and shop routes
Create `not-found.tsx` files for both `/member/[slug]` and `/shop/[slug]` routes so that `notFound()` renders a contextual 404 message rather than the generic app-level 404. Each should display a simple centered message indicating the member or shop was not found, with a link back to the homepage.

**Files:** `src/app/(frontend)/member/[slug]/not-found.tsx`, `src/app/(frontend)/shop/[slug]/not-found.tsx`
**AC:**
- `/member/[slug]/not-found.tsx` renders "Member not found" message with link to homepage
- `/shop/[slug]/not-found.tsx` renders "Shop not found" message with link to homepage
- Both are server components (no `'use client'`)
- Centered layout, uses design tokens for styling
**Expert Domains:** nextjs
