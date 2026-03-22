# Implementation Plan: #25 — Listing detail page rebuild

## Overview
4 phases, 16 total tasks
Estimated scope: large

**Note:** The ticket references `/item/[id]` but the actual route in the codebase is `/listing/[id]` at `src/app/(frontend)/listing/[id]/`. All file paths below use the correct route. The ticket also references `src/app/(frontend)/item/[id]/item-id-page.tsx` — the actual file is `src/app/(frontend)/listing/[id]/item-id-page.tsx`.

## Phase 1: Foundation — types, server query, and seller data fetching
**Goal:** Extend the server-side data layer to fetch seller profile data alongside the listing, and define the prop types needed by the new client component.
**Verify:** `pnpm build`

### Task 1.1: Add server-side seller profile query to listing-server service
Add a function `getListingWithSellerServer(id)` to `src/features/listings/services/listing-server.ts` that fetches the listing with photos (reusing the existing query pattern) and also fetches the seller's member profile (first_name, last_name, avatar_url, slug, created_at, is_seller) by joining on `seller_id`. Return a combined type. Also add a `SellerProfile` type to `src/features/listings/types/listing.ts` representing the subset of member fields needed for the detail page (first_name, last_name, avatar_url, slug, created_at). Add a `ListingDetailData` type combining `ListingWithPhotos` and `{ seller: SellerProfile | null }`.
**Files:** `src/features/listings/services/listing-server.ts`, `src/features/listings/types/listing.ts`, `src/features/listings/index.ts`
**AC:** `getListingWithSellerServer(id)` returns listing with photos and seller profile data in a single call; types are exported from the barrel; `pnpm typecheck` passes.
**Expert Domains:** supabase, nextjs

### Task 1.2: Add Swiper global styles for the listing detail photo gallery
Add a new Swiper class `.swiper__listing-detail` to `src/styles/utilities/swiper.scss` following the existing `.swiper__product-card` pattern. This gallery variant should: always show pagination dots (not hover-gated), show navigation arrows on hover at desktop only, support full-width slides. The pagination dots should be visible by default (opacity: 1). Navigation arrows should use the same pill style but only appear at `lg` breakpoint via `@include breakpoint(lg)`.
**Files:** `src/styles/utilities/swiper.scss`
**AC:** `.swiper__listing-detail` class exists with always-visible pagination, desktop-only navigation arrows, and full-width slides. `pnpm lint:styles` passes.
**Expert Domains:** scss

## Phase 2: Core components — photo gallery, lightbox, and seller strip
**Goal:** Build the three reusable listing-detail components that will be assembled into the page in Phase 3.
**Verify:** `pnpm build`

### Task 2.1: Create photo gallery component with Swiper carousel
Create `src/features/listings/components/photo-gallery/index.tsx` and `photo-gallery.module.scss`. The component receives `photos: ListingPhoto[]` and `title: string` props. It renders a Swiper carousel with the `swiper__listing-detail` global class, using `Navigation` and `Pagination` modules. Features: (1) full-width on mobile with 1:1 aspect ratio container, max 500px height on desktop; (2) dot pagination via Swiper; (3) photo count overlay ("3/7") in bottom-right with semi-transparent dark background and white text — update the count on slide change via Swiper's `onSlideChange`; (4) each slide renders `next/image` with `fill`, `sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 600px"`, `objectFit: cover`, `priority` on first image; (5) `Favorite` component (from `src/components/controls/favorite/`) positioned top-right as 44x44px tap target; (6) clicking/tapping a slide calls an `onPhotoTap(index)` callback prop. Import Swiper CSS (`swiper/css`, `swiper/css/navigation`, `swiper/css/pagination`). Mobile-first SCSS.
**Files:** `src/features/listings/components/photo-gallery/index.tsx`, `src/features/listings/components/photo-gallery/photo-gallery.module.scss`
**Reuses:** `src/components/controls/favorite/` (Favorite component), Swiper pattern from `src/features/listings/components/listing-card/index.tsx`
**AC:** PhotoGallery renders swipeable carousel with dot pagination, photo count overlay, favorite button, and fires onPhotoTap callback; `pnpm build` passes.
**Expert Domains:** nextjs, scss

### Task 2.2: Create full-screen photo lightbox component
Create `src/features/listings/components/photo-lightbox/index.tsx` and `photo-lightbox.module.scss`. The lightbox is a full-screen overlay (portal to `modal-root`, same pattern as `src/components/layout/modal/`) with: (1) black background (rgb(0 0 0 / 95%)); (2) Swiper carousel for photo navigation, initialized to the `initialIndex` prop; (3) close button (HiOutlineX) top-right, 44x44px, white; (4) photo count ("3 / 7") centered top; (5) focus trap (reuse the keyboard event pattern from the existing Modal component); (6) body scroll lock on open; (7) Escape key closes; (8) images rendered with `next/image` using `fill` and `objectFit: contain` (not cover, so full image is visible). Props: `photos: ListingPhoto[]`, `initialIndex: number`, `isOpen: boolean`, `onClose: () => void`, `title: string` (for alt text).
**Files:** `src/features/listings/components/photo-lightbox/index.tsx`, `src/features/listings/components/photo-lightbox/photo-lightbox.module.scss`
**Reuses:** Portal pattern from `src/components/layout/modal/index.tsx`
**AC:** PhotoLightbox renders full-screen overlay via portal, supports swipe navigation, shows photo count, traps focus, locks scroll, closes on Escape; `pnpm build` passes.
**Expert Domains:** nextjs, scss

### Task 2.3: Create seller info strip component
Create `src/features/listings/components/seller-strip/index.tsx` and `seller-strip.module.scss`. The component receives `seller: SellerProfile` (the type from Task 1.1). Renders a horizontal strip with: (1) 24px round avatar using `next/image` (fallback to initials circle if no avatar_url, using `getMemberInitials` from `src/features/members/utils/format-name.ts`); (2) display name via `formatMemberName` from `src/features/members/utils/format-name.ts`; (3) "New seller" text badge if `created_at` is within the last 30 days; (4) "View shop" link aligned right (links to `/user/${seller.slug}`). Mobile-first, single row, vertically centered. The strip has a subtle top/bottom border (1px solid var(--color-gray-100)).
**Files:** `src/features/listings/components/seller-strip/index.tsx`, `src/features/listings/components/seller-strip/seller-strip.module.scss`
**Reuses:** `formatMemberName`, `getMemberInitials` from `src/features/members/utils/format-name.ts`
**AC:** SellerStrip renders avatar, name, optional "New seller" badge, and "View shop" link; handles missing avatar gracefully; `pnpm build` passes.
**Expert Domains:** nextjs, scss

### Task 2.4: Create expandable section component for description and details
Create `src/features/listings/components/expandable-section/index.tsx` and `expandable-section.module.scss`. A reusable accordion-style section with: (1) header row with title text and chevron icon (HiChevronDown from react-icons/hi), rotates 180deg when open; (2) content area with CSS `max-height` transition for smooth expand/collapse animation; (3) props: `title: string`, `children: ReactNode`, `defaultExpanded?: boolean`, `maxCollapsedLines?: number` (for text truncation mode); (4) when `maxCollapsedLines` is set, content shows N lines with `-webkit-line-clamp` when collapsed and a "Read more" / "Show less" text toggle instead of chevron; (5) accessible: `aria-expanded` on the toggle button, content region has `id` linked via `aria-controls`. Two modes: accordion mode (chevron, for Condition Details, Fishing History) and text truncation mode (line-clamp with "Read more", for Description).
**Files:** `src/features/listings/components/expandable-section/index.tsx`, `src/features/listings/components/expandable-section/expandable-section.module.scss`
**AC:** ExpandableSection supports both accordion and text-truncation modes, animates smoothly, has correct ARIA attributes; `pnpm build` passes.
**Expert Domains:** nextjs, scss

### Task 2.5: Export new components from listings barrel file
Add exports for `PhotoGallery`, `PhotoLightbox`, `SellerStrip`, and `ExpandableSection` to `src/features/listings/index.ts`. Also export the new `SellerProfile` and `ListingDetailData` types.
**Files:** `src/features/listings/index.ts`
**AC:** All four new components and two new types are importable from `@/features/listings`; `pnpm build` passes.

## Phase 3: Page rebuild — assemble the detail page
**Goal:** Rebuild the server component (page.tsx) and client component (listing-detail.tsx) to compose all Phase 2 components into the full marketplace layout with SEO metadata.
**Verify:** `pnpm build`

### Task 3.1: Rebuild the server component page.tsx with enhanced data fetching and SEO metadata
Rewrite `src/app/(frontend)/listing/[id]/page.tsx` to: (1) use `getListingWithSellerServer(id)` from Task 1.1 to fetch listing + seller in one call; (2) call `notFound()` if listing is null, or if `status` is not `active` and not `sold` (drafts, archived, deleted should 404); (3) enhance `generateMetadata` — title format: `"{Title} — {Condition Label} | Nessi"` (lookup condition label from `CONDITION_TIERS`), description: first 160 chars of listing description or fallback `"{Title} — {Price} on Nessi"`, OG image from `cover_photo_url`; (4) pass `listing` and `seller` as separate props to the new `ListingDetail` client component; (5) also pass `currentUserId` by reading the Supabase server client session (`supabase.auth.getUser()`) — this is needed for the "is seller viewing own listing" check.
**Files:** `src/app/(frontend)/listing/[id]/page.tsx`
**AC:** Page fetches listing+seller, returns 404 for non-active/non-sold listings, generates correct metadata with condition in title, passes currentUserId to client component; `pnpm typecheck` passes.
**Expert Domains:** nextjs, supabase

### Task 3.2: Create the listing-detail client component with full marketplace layout
Create `src/app/(frontend)/listing/[id]/listing-detail.tsx` as a `'use client'` component. Props: `listing: ListingWithPhotos`, `seller: SellerProfile | null`, `currentUserId: string | null`. Layout structure (mobile-first, single column):

1. **PhotoGallery** — full width, with `onPhotoTap` opening the lightbox
2. **PhotoLightbox** — controlled by `isLightboxOpen` state and `lightboxIndex`
3. **Price and Condition row** — price (large, bold, `formatPrice`) on left, `ConditionBadge` (size="md") on right
4. **Title** — 2-line truncated with "...show more" via ExpandableSection in text-truncation mode (maxCollapsedLines=2)
5. **SellerStrip** — seller info
6. **Description** — ExpandableSection in text-truncation mode (maxCollapsedLines=3, defaultExpanded=false)
7. **Condition Details** — ExpandableSection accordion showing the full condition tier description text
8. **Fishing History** — ExpandableSection accordion (placeholder content for now: "No fishing history provided")
9. **Shipping estimate** — static text "Shipping: calculated at checkout"
10. **"Report this listing"** link at bottom (no functionality, just renders the link)
11. **Sticky Buy Now bar** — fixed bottom on mobile, 56px, primary color, "Buy Now — Coming Soon" text, disabled state with `cursor: not-allowed`; hidden at lg breakpoint
12. **"Make Offer"** text link above Buy Now bar — disabled, grayed out
13. **"Message Seller"** text link below Buy Now bar — disabled, grayed out

**Sold state:** If `listing.status === 'sold'`, replace Buy Now with a "This listing has sold" banner (full-width, muted background).

**Seller viewing own listing:** If `currentUserId === listing.seller_id`, hide Buy Now / Make Offer / Message Seller; show "Edit listing" button linking to `/dashboard/listings/${listing.id}/edit`.

**View count:** `useEffect` on mount fires `incrementViewCount(listing.id)` from `useIncrementViewCount` hook (fire-and-forget, no error handling needed).

**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`, `src/app/(frontend)/listing/[id]/listing-detail.module.scss`
**Reuses:** `src/features/listings/components/photo-gallery/`, `src/features/listings/components/photo-lightbox/`, `src/features/listings/components/seller-strip/`, `src/features/listings/components/expandable-section/`, `src/features/listings/components/condition-badge/`, `src/features/listings/utils/format.ts` (formatPrice), `src/features/listings/hooks/use-listings.ts` (useIncrementViewCount), `src/components/controls/button/` (Button component)
**AC:** Full listing detail renders with all sections; sold state shows banner; seller sees "Edit listing" instead of Buy Now; view count fires on mount; disabled actions show "Coming Soon" state; `pnpm build` passes.
**Expert Domains:** nextjs, scss, state-management

### Task 3.3: Delete old files (item-id-page.tsx and item.module.scss)
Remove `src/app/(frontend)/listing/[id]/item-id-page.tsx` and `src/app/(frontend)/listing/[id]/item.module.scss` as they are fully replaced by `listing-detail.tsx` and `listing-detail.module.scss`.
**Files:** `src/app/(frontend)/listing/[id]/item-id-page.tsx` (delete), `src/app/(frontend)/listing/[id]/item.module.scss` (delete)
**AC:** Old files are removed; no imports reference them; `pnpm build` passes.

## Phase 4: Polish — desktop layout, edge cases, and accessibility
**Goal:** Add the two-column desktop layout, refine edge cases, ensure accessibility compliance, and verify all acceptance criteria.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 4.1: Add two-column desktop layout at lg breakpoint
Update `src/app/(frontend)/listing/[id]/listing-detail.module.scss` to add a two-column layout at the `lg` breakpoint: gallery column takes 60% width on the left, details column takes 40% on the right. The details column should be `position: sticky` with `top: var(--space-md)` so it stays visible while scrolling the gallery. The sticky Buy Now bar should be hidden at `lg` (replaced by an inline Buy Now button in the details column). Wrap the listing-detail component's JSX in appropriate container divs with `.desktopLayout`, `.galleryColumn`, and `.detailsColumn` classes.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.module.scss`, `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:** At lg breakpoint, page renders in two columns (60/40), details column is sticky, sticky bottom bar is hidden and replaced by inline button; mobile layout unchanged; `pnpm lint:styles` passes.
**Expert Domains:** scss

### Task 4.2: Add location display, brand/model info, and shipping details
Enhance `src/app/(frontend)/listing/[id]/listing-detail.tsx` to display additional listing fields when present: (1) location (city, state) shown below the seller strip as subtle text; (2) brand and model shown as a detail row if either is set (e.g., "Brand: Shimano | Model: Stradic CI4+"); (3) shipping info section: if `shipping_paid_by` is set, show "Seller pays shipping" or "Buyer pays shipping" with price if `shipping_price_cents` is set; otherwise show "Shipping: calculated at checkout". (4) quantity badge if `quantity > 1` (e.g., "3 available"). Add corresponding SCSS.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`, `src/app/(frontend)/listing/[id]/listing-detail.module.scss`
**AC:** Location, brand/model, shipping details, and quantity display correctly when data is present; absent fields are gracefully omitted; `pnpm build` passes.
**Expert Domains:** nextjs, scss

### Task 4.3: Add accessibility attributes and screen reader support
Audit and enhance accessibility across all new components: (1) PhotoGallery: `aria-roledescription="carousel"`, `aria-label="Listing photos"`, each slide has `role="group"` with `aria-roledescription="slide"` and `aria-label="Photo {n} of {total}"`; (2) PhotoLightbox: `role="dialog"`, `aria-modal="true"`, `aria-label="Full-screen photo viewer"`; (3) Favorite button: add `aria-label="Add to watchlist"` / `aria-label="Remove from watchlist"` based on state, add `aria-pressed` attribute; (4) Sticky Buy Now: `aria-disabled="true"` in addition to `disabled`; (5) Photo count overlay: `aria-hidden="true"` (decorative, screen reader gets info from slide aria-labels); (6) "Read more" toggles: `aria-expanded` state; (7) All disabled action links: `aria-disabled="true"`, `tabindex="-1"`. Verify the existing Favorite component gets the aria-label update (modify if needed).
**Files:** `src/features/listings/components/photo-gallery/index.tsx`, `src/features/listings/components/photo-lightbox/index.tsx`, `src/components/controls/favorite/index.tsx`, `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:** All interactive elements have appropriate ARIA attributes; carousel has roledescription; lightbox has dialog role; favorite has pressed state and label; disabled actions are aria-disabled; `pnpm lint` passes.
**Expert Domains:** nextjs

### Task 4.4: Handle empty and edge-case states
Add handling for edge cases in `listing-detail.tsx` and `photo-gallery`: (1) listing with zero photos — show a placeholder image/empty state in the gallery area (no carousel); (2) listing with exactly one photo — render single image without Swiper (no dots, no navigation, no count overlay); (3) missing description — hide the description ExpandableSection entirely; (4) missing seller data (seller is null) — show "Seller unavailable" in the seller strip area; (5) ensure price formatting handles edge cases (0 cents → "$0.00"). Update PhotoGallery to conditionally render Swiper only when photos.length > 1.
**Files:** `src/features/listings/components/photo-gallery/index.tsx`, `src/features/listings/components/photo-gallery/photo-gallery.module.scss`, `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:** Zero photos shows placeholder; single photo renders without carousel; missing description hides section; null seller shows fallback; `pnpm build` passes.
**Expert Domains:** nextjs

### Task 4.5: Update listings feature CLAUDE.md with new components and patterns
Update `src/features/listings/CLAUDE.md` to document: (1) the four new components (PhotoGallery, PhotoLightbox, SellerStrip, ExpandableSection) with their props and purpose; (2) the new `SellerProfile` and `ListingDetailData` types; (3) the `getListingWithSellerServer` service function; (4) the listing detail page architecture (server component fetches data, client component renders, view count on mount). Add entries to the Components and Pages tables.
**Files:** `src/features/listings/CLAUDE.md`
**AC:** CLAUDE.md accurately documents all new components, types, services, and page architecture added in this ticket.
