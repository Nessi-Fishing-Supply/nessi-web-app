# Implementation Plan: #151 — Shop hero banner upload UI

## Overview
3 phases, 8 total tasks
Estimated scope: medium

## Phase 1: API Route for Hero Banner Upload
**Goal:** Create the server-side API route that accepts, validates, processes, and stores hero banner images, and update the shops table via the existing `updateShop` service.
**Verify:** `pnpm build`

### Task 1.1: Create POST /api/shops/hero-banner/route.ts
Create the API route for hero banner uploads, following the exact pattern of `src/app/api/shops/avatar/route.ts`. The route authenticates the user, verifies shop ownership, validates MIME type and 5MB size limit, processes the image with Sharp (resize to max 1200x400 with `fit: 'inside'` and `withoutEnlargement: true`), converts to WebP at 85% quality, and stores at `avatars/shop-hero-{shopId}.webp` with upsert. After successful storage upload, update the shop's `hero_banner_url` column with the public URL using the admin-free server client (RLS allows owner updates). Return `{ url: publicUrl }`.
**Files:** `src/app/api/shops/hero-banner/route.ts`
**AC:**
- POST with valid auth, owner verification, and valid image returns 200 with `{ url: string }` pointing to `avatars/shop-hero-{shopId}.webp`
- Returns 401 without session, 403 if not shop owner, 400 if missing shopId/file/invalid MIME/oversized, 404 if shop not found
- Sharp resizes with `fit: 'inside'`, `withoutEnlargement: true`, max dimensions 1200x400, WebP quality 85
- Updates `hero_banner_url` on the shops row after successful upload
- Uses `AUTH_CACHE_HEADERS` from `@/libs/api-headers` on all responses
**Expert Domains:** supabase, nextjs

## Phase 2: HeroBannerUpload Component and Settings Integration
**Goal:** Build the client-side hero banner upload widget with landscape cropper and integrate it into the shop details settings section.
**Verify:** `pnpm build`

### Task 2.1: Create HeroBannerUpload component
Create a new feature-scoped component at `src/features/shops/components/hero-banner-upload/` since it is tightly coupled to shop domain logic (shop ID, shop-specific upload URL, hero banner URL from shop data). The component provides: a clickable rectangular preview area (landscape ~3:1 aspect ratio), a hidden file input triggered on click, an `ImageCropper` inside a `Modal` with `aspect={3}` and `cropShape="rect"`, upload state management with spinner overlay, and preview of the current banner. Use `react-icons/hi` (`HiPhotograph`) for the empty-state icon. The component accepts props: `shopId: string`, `heroBannerUrl: string | null`, `onUpload: (url: string) => void`, `disabled?: boolean`. It POSTs to `/api/shops/hero-banner` with `file` and `shopId` in FormData, matching the pattern in `AvatarUpload`.
**Files:** `src/features/shops/components/hero-banner-upload/index.tsx`, `src/features/shops/components/hero-banner-upload/hero-banner-upload.module.scss`
**Reuses:** `src/components/controls/image-cropper/` (ImageCropper), `src/components/layout/modal/` (Modal)
**AC:**
- Renders a landscape rectangular click target that opens file picker
- Opens Modal with ImageCropper (aspect=3, cropShape="rect") after file selection
- Uploads cropped blob to `/api/shops/hero-banner` with shopId in FormData
- Calls `onUpload(url)` on success
- Shows spinner overlay during upload, disables interaction
- Shows current banner via `next/image` with `fill` layout and `sizes="(max-width: 768px) 100vw, 600px"` when `heroBannerUrl` is provided
- Shows placeholder with HiPhotograph icon and "Upload banner" text when no banner exists
- All interactive elements have proper `aria-label`, `aria-busy`, focus-visible styles
- SCSS uses only CSS custom property tokens, mobile-first with `@include breakpoint()` for larger viewports
**Expert Domains:** nextjs, scss

### Task 2.2: Integrate HeroBannerUpload into ShopDetailsSection
Add the `HeroBannerUpload` component into `ShopDetailsSection`, positioned below the existing avatar section and above the inline-edit fields. Wire it up: pass `shop.id`, `shop.hero_banner_url`, and an `onUpload` handler that calls `updateShop.mutateAsync` to persist the URL and shows a success toast. Add corresponding SCSS for layout spacing in the existing `shop-details-section.module.scss`.
**Files:** `src/features/shops/components/shop-settings/shop-details-section/index.tsx`, `src/features/shops/components/shop-settings/shop-details-section/shop-details-section.module.scss`
**Reuses:** `src/features/shops/components/hero-banner-upload/` (HeroBannerUpload)
**AC:**
- HeroBannerUpload renders inside ShopDetailsSection below the avatar and above the text fields
- Uploading a banner updates `hero_banner_url` on the shop and shows "Your shop banner has been updated." success toast
- Component is disabled while `updateShop.isPending`
- Layout spacing between avatar section and banner section uses CSS custom property tokens
**Expert Domains:** nextjs, scss

## Phase 3: Public Shop Page Banner Display
**Goal:** Render the hero banner on the public shop page, replacing the existing TODO comment, with proper responsive image handling and fallback.
**Verify:** `pnpm build`

### Task 3.1: Render hero banner on public shop page
Replace the TODO comment at line 55 of `src/app/(frontend)/shop/[slug]/page.tsx` with a conditional hero banner section. When `shop.hero_banner_url` is truthy, render a container div with `position: relative` and a landscape aspect ratio, containing a `next/image` with `fill`, `priority` (it is above the fold / LCP candidate), `sizes="(max-width: 768px) 100vw, 1000px"`, `style={{ objectFit: 'cover' }}`, and descriptive alt text (`"{shop_name} banner"`). When no banner exists, render nothing (no empty container).
**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`, `src/app/(frontend)/shop/[slug]/shop-page.module.scss`
**AC:**
- When `shop.hero_banner_url` is non-null, a banner image renders above the header using `next/image` with `fill` layout
- Image has `priority` prop for LCP optimization
- Image has `sizes="(max-width: 768px) 100vw, 1000px"`
- Banner container has ~3:1 aspect ratio, `border-radius` matching design tokens, `overflow: hidden`
- When `shop.hero_banner_url` is null, no banner markup renders
- SCSS is mobile-first with appropriate breakpoints, uses only CSS custom property tokens
- Alt text is `"{shop.shop_name} banner"`
**Expert Domains:** nextjs, scss

### Task 3.2: Update generateMetadata to include hero banner in OG image
Update the `generateMetadata` function in the shop page to prefer `hero_banner_url` over `avatar_url` for the OpenGraph image when available, since the banner is a wider landscape image better suited for social sharing.
**Files:** `src/app/(frontend)/shop/[slug]/page.tsx`
**AC:**
- When `shop.hero_banner_url` is truthy, it is used as the OG image
- When only `shop.avatar_url` is truthy, it remains the OG image (existing behavior)
- When neither exists, no OG image is set (existing behavior)
**Expert Domains:** nextjs

### Task 3.3: Update shops feature CLAUDE.md
Add documentation for the new hero banner upload API route and HeroBannerUpload component to `src/features/shops/CLAUDE.md`, following the existing documentation patterns for the avatar upload API and AvatarUpload component.
**Files:** `src/features/shops/CLAUDE.md`
**AC:**
- Hero Banner Upload API section documents the route path, auth requirements, Sharp processing parameters, storage path, and response shape
- Components table includes HeroBannerUpload with its location and purpose
- Shared Components Reused section mentions ImageCropper and Modal usage by HeroBannerUpload
