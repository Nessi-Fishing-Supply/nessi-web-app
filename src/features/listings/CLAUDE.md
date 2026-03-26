# Listings Feature

## Overview

Listings are the core marketplace entities in Nessi — individual items posted for sale by members or shops. This feature provides the full data layer (types, services, hooks), validations, UI components, and pages for creating, editing, and managing listings. Related tickets: #21 (photo infrastructure), #5 (create wizard), #7 (edit wizard).

## Architecture

- **types/listing.ts** — Database-derived types: `Listing`, `ListingInsert`, `ListingUpdate`, `ListingStatus`, `ListingWithPhotos`, `ListingDraft`, `ListingCondition`, `ListingCategory`, `SellerProfile`, `ListingDetailData`
- **types/listing-photo.ts** — Photo types: `ListingPhoto`, `ListingPhotoInsert`, `ListingPhotoUpdate`, `UploadResult`
- **types/search.ts** — Search types: `SearchFilters` (URL param-driven filter state), `AutocompleteSuggestion`, `SearchSuggestion`
- **types/recommendation.ts** — Recommendation types: `RecommendationContext` (union of 3 modes), `SimilarParams`, `SellerParams`, `AlsoLikedParams`, `RecommendationsParams` (discriminated union), `RecommendationsResponse`
- **constants/condition.ts** — `CONDITION_TIERS` (6-tier array with labels, descriptions, WCAG AA colors), `CATEGORY_PHOTO_GUIDANCE` (per-category photo tips), `ConditionTier` type
- **constants/category.ts** — `LISTING_CATEGORIES` (10 categories with labels and react-icons), `getCategoryLabel()`, `getCategoryIcon()`
- **`@/features/shared/utils/format.ts`** — `formatPrice(cents)`, `calculateFee(cents)`, `calculateNet(cents)` — shared currency formatters (not listing-specific, lives in shared)
- **services/listing.ts** — Client-side service functions calling API routes via `@/libs/fetch` helpers (`getListings`, `getListingById`, `createListing`, `updateListing`, `deleteListing`, `updateListingStatus`, etc.)
- **services/listing-photo.ts** — Photo upload/delete services calling API routes
- **services/listing-server.ts** — Server-side Supabase queries: `getListingByIdServer`, `getListingWithSellerServer` (listing + seller profile), `getListingsByMemberServer`, `getListingsByShopServer`, `getActiveListingsServer`
- **services/recommendation-server.ts** — Server-side recommendation queries: `getRecommendationsServer` with 3 context modes (similar, seller, also_liked). Uses `CONDITION_TIERS` for adjacent condition filtering in similar mode. Calls `getRecentlyViewedIds` from `@/features/recently-viewed` for also_liked mode.
- **services/recommendation.ts** — Client-side recommendation service: `getRecommendations(params)` calling `GET /api/listings/recommendations` via fetch helper
- **services/search.ts** — Client-side search services: `searchListings()`, `getAutocompleteSuggestions()`, `trackSearchSuggestion()`
- **config/categories.ts** — Category SEO config with `getCategoryBySlug()`, `CATEGORY_MAP`, `VALID_CATEGORY_SLUGS`
- **config/species.ts** — `SPECIES_LIST` (15 common fishing species with value/label pairs), `Species` type
- **config/us-states.ts** — `US_STATES` (50 states + DC, sorted alphabetically by label)
- **hooks/use-listings.ts** — Tanstack Query hooks for listing data fetching and mutations
- **hooks/use-listing-photos.ts** — Tanstack Query hooks for photo upload and delete
- **hooks/use-search.ts** — `useSearchListingsInfinite` (infinite query for search), `useTrackSearchSuggestion` (fire-and-forget mutation)
- **hooks/use-autocomplete.ts** — `useAutocomplete` (debounced query, 200ms, min 3 chars, 30s staleTime)
- **hooks/use-debounced-value.ts** — Generic `useDebouncedValue<T>(value, delay)` hook
- **hooks/use-search-filters.ts** — `useSearchFilters` — reads/writes all filter state from URL params, single source of truth
- **hooks/use-recommendations.ts** — `useRecommendations(args)` — Tanstack Query hook for fetching recommendations with per-context enabled guards and query keys
- **components/photo-manager/** — Multi-photo upload, reorder, and delete UI for listing creation and editing
- **components/condition-badge/** — Color-coded pill displaying condition tier with hover/tap popover description
- **components/condition-selector/** — Vertical radio list for selecting condition tier in create wizard, with category-specific photo guidance accordion
- **components/condition-filter/** — Multi-select checkbox group for filtering listings by condition, with optional count badges
- **components/autocomplete/** — Keyboard-navigable autocomplete dropdown with ARIA listbox roles
- **components/search-overlay/** — Full-screen mobile search overlay with focus trap, scroll lock, portal to `#modal-root`
- **components/filter-panel/** — Desktop 240px left rail + mobile bottom sheet, renders all filter groups
- **components/filter-chip/** — Removable filter pill with accessible X button
- **components/filter-chips/** — Container rendering one chip per active filter + "Clear all filters" link
- **components/category-filter/** — Multi-select checkbox for 10 categories (follows ConditionFilter pattern)
- **components/price-range-filter/** — Dual min/max dollar inputs, debounced 500ms, emits cents
- **components/boolean-filter/** — Label + Toggle row for boolean filters (e.g., "Free shipping")
- **components/state-filter/** — Native select dropdown for US states
- **components/species-filter/** — Multi-select checkbox for 15 species with count badges
- **components/listing-type-filter/** — Multi-select checkbox for Used/Custom/New

## Database Schema

### listings table

| Column               | Type                          | Notes                                             |
| -------------------- | ----------------------------- | ------------------------------------------------- |
| id                   | uuid                          | Primary key                                       |
| seller_id            | uuid                          | FK → auth.users.id (ON DELETE CASCADE)            |
| member_id            | uuid \| null                  | FK → members.id (null if sold via shop context)   |
| shop_id              | uuid \| null                  | FK → shops.id (null if sold via member context)   |
| title                | text                          | Required                                          |
| description          | text \| null                  |                                                   |
| price_cents          | integer                       | Price in cents (e.g., 1999 = $19.99)              |
| category             | listing_category enum         | Required                                          |
| condition            | listing_condition enum        | Required                                          |
| status               | listing_status enum           | draft \| active \| sold \| archived               |
| brand                | text \| null                  |                                                   |
| model                | text \| null                  |                                                   |
| quantity             | integer                       | Default 1                                         |
| weight_oz            | integer \| null               |                                                   |
| shipping_paid_by     | shipping_paid_by enum \| null |                                                   |
| shipping_price_cents | integer \| null               |                                                   |
| cover_photo_url      | text \| null                  | Denormalized from listing_photos for fast queries |
| location_city        | text \| null                  |                                                   |
| location_state       | text \| null                  |                                                   |
| is_visible           | boolean                       | Default true                                      |
| view_count           | integer                       | Incremented on detail page view                   |
| favorite_count       | integer                       | Denormalized from favorites table                 |
| inquiry_count        | integer                       | Denormalized from inquiries table                 |
| search_vector        | tsvector                      | Full-text search, maintained by trigger           |
| published_at         | timestamptz \| null           | Set when status → active                          |
| created_at           | timestamptz                   |                                                   |
| updated_at           | timestamptz                   |                                                   |
| sold_at              | timestamptz \| null           | Set when status → sold                            |
| watcher_count        | integer                       | Watcher count (displayed in quick-edit price)     |
| deleted_at           | timestamptz \| null           | Soft delete                                       |

### listing_photos table

| Column        | Type         | Notes                                              |
| ------------- | ------------ | -------------------------------------------------- |
| id            | uuid         | Primary key                                        |
| listing_id    | uuid         | FK → listings.id (ON DELETE CASCADE)               |
| image_url     | text         | Full-resolution WebP URL in Supabase Storage       |
| thumbnail_url | text \| null | Resized thumbnail WebP URL (generated on upload)   |
| position      | integer      | Display order (0-based); used for photo reordering |
| created_at    | timestamptz  |                                                    |

## API Routes

All listing API routes live in `src/app/api/listings/`:

### Photo Upload

`POST /api/listings/upload`

- Requires authenticated session
- Accepts `file` (image) + `listingId` in `multipart/form-data`
- Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- Processes with `sharp`:
  - Full image: resizes to max 1200x1200 (`fit: 'inside'`, `withoutEnlargement: true`), WebP 85%
  - Thumbnail: resizes to 400x400 (`fit: 'cover'` for square crop), WebP 70%
- Stores both at `{user_id}/{listing_id}/{timestamp}.webp` and `{user_id}/{listing_id}/{timestamp}_thumb.webp` in the `listing-images` bucket
- Inserts a `listing_photos` row with `image_url`, `thumbnail_url`, and `position` (count of existing photos)
- Returns `{ photo: ListingPhoto }`

### Photo Delete

`DELETE /api/listings/upload/delete`

- Requires authenticated session + listing ownership verification
- Accepts `{ photoId: string }` in JSON body
- Removes storage objects for both `image_url` and `thumbnail_url`
- Deletes the `listing_photos` row
- Re-sequences `position` values for remaining photos
- Updates `cover_photo_url` on the parent listing if the deleted photo was position 0
- Returns `{ success: true }`

### Listings CRUD

`GET /api/listings` — Public paginated listing search with filters (`category`, `condition`, `search`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`). Always filters `deleted_at IS NULL` and `status = 'active'`. Returns `{ listings, total, page, limit }`.

`POST /api/listings` — Authenticated. Creates a listing (defaults to `status: 'draft'`). Sets `seller_id` from user.

`GET /api/listings/[id]` — Public. Single listing with photos joined. 404 if not found or soft-deleted.

`PUT /api/listings/[id]` — Authenticated + ownership. Updates listing fields.

`DELETE /api/listings/[id]` — Authenticated + ownership. Soft-delete (sets `deleted_at` and `status: 'deleted'`).

`POST /api/listings/[id]/view` — Public. Increments `view_count` by 1.

`PATCH /api/listings/[id]/status` — Authenticated + ownership. Status transitions: `draft→active` (sets `published_at`), `active→archived`, `active→sold`, `archived→active`, `draft→deleted`.

`GET /api/listings/search` — Public. Full-text search with filters + trigram fallback for typo tolerance. Params: `q`, `category`, `condition`, `price_min`, `price_max`, `location_state`, `free_shipping`, `species`, `listing_type`, `sort`, `page`, `limit`. Falls back to ilike on title/brand when FTS returns 0 results. Returns `{ listings, total, page, limit }`.

`GET /api/listings/autocomplete` — Public. Returns up to 8 suggestions from `search_suggestions` (popularity), listing titles (prefix), and category names. Requires `q` param >= 3 chars.

`POST /api/listings/search-suggestions` — Public. Upserts search term into `search_suggestions` table (increments popularity or inserts with popularity=1). Fire-and-forget from client.

`GET /api/listings/seller` — Authenticated. Returns all listings for the current user (all statuses except soft-deleted). Supports `status` query param filter.

`GET /api/listings/drafts` — Authenticated. Returns user's draft listings.

`POST /api/listings/drafts` — Authenticated. Creates an empty draft with default values.

`DELETE /api/listings/drafts` — Authenticated + ownership. Hard-deletes a draft (only `status: 'draft'`).

`POST /api/listings/[id]/duplicate` — Authenticated + ownership. Creates a new draft by copying fields from any non-deleted listing (active, sold, archived, or draft). Copies: title, description, category, condition, price_cents, shipping_paid_by, shipping_price_cents, weight_oz, brand, model, quantity, location_city, location_state. Does NOT copy: photos, cover_photo_url, published_at, sold_at, counts, search_vector. Uses `X-Nessi-Context` header for member/shop identity on the new draft. Returns 201 with the new `ListingWithPhotos` (empty photos array).

`GET /api/listings/recommendations` — Public. Returns up to 12 recommended listings based on context mode. Params: `context` (required: `similar`, `seller`, or `also_liked`). **similar**: requires `listingId`, `category`, `condition` — returns same-category listings with adjacent condition tiers (using `CONDITION_TIERS` ordering). **seller**: requires `sellerId`, optional `shopId` — returns listings from the same seller/shop. **also_liked**: optional `listingIds` (comma-separated), optional `userId` — resolves recently viewed listings from DB when `userId` is provided (auth check: userId must match authenticated user), then returns listings in matching categories. All modes exclude source listing(s), filter `status='active'` + `deleted_at IS NULL`, and join `listing_photos`. Returns `{ listings, context }`.

## Hooks

| Hook                                 | Query Key                                       | Purpose                                                                                        |
| ------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useListings(filters)`               | `['listings', filters]`                         | Paginated listing search with filters                                                          |
| `useListing(id)`                     | `['listings', id]`                              | Fetch listing by ID with photos                                                                |
| `useSellerListings(status?)`         | `['listings', 'seller', status]`                | Fetch authenticated user's listings                                                            |
| `useDrafts()`                        | `['listings', 'drafts']`                        | Fetch user's draft listings                                                                    |
| `useListingPhotos(listingId)`        | `['listings', listingId, 'photos']`             | Fetch ordered photos for a listing                                                             |
| `useCreateListing()`                 | mutation, invalidates `['listings']`            | Create a new listing                                                                           |
| `useCreateDraft()`                   | mutation, invalidates `['listings']`            | Create an empty draft                                                                          |
| `useDuplicateListing()`              | mutation, invalidates `['listings']`            | Duplicate an existing listing as a new draft (copies all fields except photos)                 |
| `useUpdateListing()`                 | mutation, invalidates `['listings']`            | Update listing fields                                                                          |
| `useDeleteListing()`                 | mutation, invalidates `['listings']`            | Soft-delete a listing                                                                          |
| `useDeleteDraft()`                   | mutation, invalidates `['listings']`            | Hard-delete a draft                                                                            |
| `useUpdateListingStatus()`           | mutation, invalidates `['listings']`            | Change listing status                                                                          |
| `useIncrementViewCount()`            | mutation (fire-and-forget)                      | Increment view count                                                                           |
| `useUploadListingPhoto()`            | mutation, invalidates listing photos key        | Upload photo via `POST /api/listings/upload`                                                   |
| `useDeleteListingPhoto()`            | mutation, invalidates listing photos key        | Delete photo via `DELETE /api/listings/upload/delete`                                          |
| `useListingsInfinite(params)`        | `['listings', 'infinite', { category, sort }]`  | Infinite scroll listing feed with cursor-based pagination                                      |
| `useSearchListingsInfinite(filters)` | `['listings', 'search', filters]`               | Infinite scroll search results with all filter params                                          |
| `useAutocomplete(query)`             | `['autocomplete', debouncedQuery]`              | Debounced (200ms) autocomplete suggestions, enabled >= 2 chars                                 |
| `useRecentSearches()`                | — (localStorage-backed, no query key)           | localStorage-backed recent searches (max 5, SSR-safe)                                          |
| `useTrackSearchSuggestion()`         | mutation (fire-and-forget)                      | Increments search_suggestions popularity counter                                               |
| `useSearchFilters()`                 | — (URL-based, no query key)                     | Reads/writes all filter state from URL params via `useSearchParams` + `useRouter`              |
| `useRecommendations(args)`           | `['listings', 'recommendations', context, ...]` | Fetch recommendations by context (similar, seller, also_liked) with per-context enabled guards |

## Components

| Component               | Location                              | Purpose                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PhotoManager`          | `components/photo-manager/`           | Multi-photo upload, drag-to-reorder, and delete UI. Used in create and edit wizards.                                                                                                                                    |
| `ConditionBadge`        | `components/condition-badge/`         | Color-coded pill with popover description. Props: `condition`, `size` (`sm`/`md`).                                                                                                                                      |
| `ConditionSelector`     | `components/condition-selector/`      | Vertical radio list for wizard. Props: `value`, `onChange`, optional `category` for accordion guidance.                                                                                                                 |
| `ConditionFilter`       | `components/condition-filter/`        | Multi-select checkbox group for search. Props: `selected`, `onChange`, optional `counts`.                                                                                                                               |
| `CategorySelector`      | `components/category-selector/`       | Tile grid for selecting listing category. Props: `value`, `onChange`. `role="radiogroup"` with keyboard nav.                                                                                                            |
| `PhotoGallery`          | `components/photo-gallery/`           | Swiper carousel for listing detail. Props: `photos`, `title`, `onPhotoTap`. Handles 0, 1, and multi-photo states. ARIA carousel roles.                                                                                  |
| `PhotoLightbox`         | `components/photo-lightbox/`          | Full-screen photo viewer via portal. Props: `photos`, `initialIndex`, `isOpen`, `onClose`, `title`. Focus trap, scroll lock, Escape close.                                                                              |
| `SellerStrip`           | `components/seller-strip/`            | Seller info row: avatar (or initials fallback), name, "New seller" badge, "View shop" link. Props: `seller: SellerProfile`.                                                                                             |
| `ExpandableSection`     | `components/expandable-section/`      | Two modes: accordion (chevron toggle, `grid-template-rows` animation) and text truncation (`-webkit-line-clamp` with "Read more").                                                                                      |
| `CreateWizard`          | `components/create-wizard/`           | 5-step listing creation wizard with auto-save, draft resume, and publish/save-draft actions. See below.                                                                                                                 |
| `WizardProgress`        | `components/create-wizard/`           | Horizontal step progress indicator. Props: `currentStep`, `totalSteps`, `shippingSkipped`, `onStepClick` (edit mode).                                                                                                   |
| `EditWizard`            | `components/edit-wizard/`             | Edit wizard: same steps as create, pre-populated via edit store, jumpable steps, partial save (only changed fields).                                                                                                    |
| `ListingRow`            | `components/listing-row/`             | Dashboard listing row: thumbnail, title, price, status pill, stats, actions menu trigger. Mobile card / desktop row layout.                                                                                             |
| `ListingActionsMenu`    | `components/listing-actions-menu/`    | Context-aware action menu (Edit, Mark as Sold, Deactivate/Activate, Delete). Uses Modal as bottom sheet.                                                                                                                |
| `MarkSoldModal`         | `components/mark-sold-modal/`         | Confirmation modal with optional sale price input. Calls `useUpdateListingStatus` with `sold` status.                                                                                                                   |
| `DeleteListingModal`    | `components/delete-listing-modal/`    | Delete confirmation dialog with danger button. Calls `useDeleteListing` (soft delete).                                                                                                                                  |
| `QuickEditPrice`        | `components/quick-edit-price/`        | Compact price editor (Modal). Auto-focused input, live fee calculator, watcher notice. Patches only `price_cents`.                                                                                                      |
| `ListingGrid`           | `components/listing-grid/`            | Responsive grid of listing cards. Props: `listings`, `isLoading`. Used on category browse and search pages.                                                                                                             |
| `ListingSkeleton`       | `components/listing-skeleton/`        | Placeholder card matching ListingGrid item dimensions. Rendered while listings are loading.                                                                                                                             |
| `InfiniteScroll`        | `components/infinite-scroll/`         | Intersection Observer sentinel that triggers `onLoadMore` when scrolled into view. Props: `onLoadMore`, `hasMore`, `isLoading`.                                                                                         |
| `SortSelect`            | `components/sort-select/`             | Dropdown for choosing listing sort order (e.g., newest, price asc/desc). Props: `value`, `onChange`.                                                                                                                    |
| `EmptyState`            | `components/empty-state/`             | Zero-result state with icon, heading, and optional CTA. Used when a category or search returns no listings.                                                                                                             |
| `PriceDisplay`          | `components/price-display/`           | Price with variants: standard ("or offer"), below-avg signal, price drop (strikethrough + %). Watcher count with orange heart.                                                                                          |
| `FeeCalculator`         | `components/fee-calculator/`          | Live fee calculator: listing price → fee → net payout. Shop discount info banner.                                                                                                                                       |
| `SpecTable`             | `components/spec-table/`              | Key-value spec display. Semantic `<dl>`. Filters empty rows. Props: `specs: { key, value }[]`.                                                                                                                          |
| `ShippingRateCard`      | `components/shipping-rate-card/`      | Carrier option selection card. Selected/unselected states. Free shipping variant. Props: `carrier`, `price`, `isSelected`, `onSelect`.                                                                                  |
| `CategoryTile`          | `components/category-tile/`           | 1:1 photo tile with gradient overlay and label. Uses `next/image` + `Link`. Grid: mobile 2-col, desktop 4-col.                                                                                                          |
| `RecentSearches`        | `components/recent-searches/`         | Presentational list of recent search terms with remove + clear all                                                                                                                                                      |
| `SearchQuickCategories` | `components/search-quick-categories/` | Pill-shaped category chip row for search quick-browse                                                                                                                                                                   |
| `DesktopSearchDropdown` | `components/desktop-search-dropdown/` | Multi-section dropdown: recent searches + category chips + autocomplete suggestions                                                                                                                                     |
| `SimilarItemsStrip`     | `components/similar-items-strip/`     | Drop-in strip composing `useRecommendations(similar)` + `ListingScrollStrip`. Returns null on empty. Props: `listingId`, `category`, `condition`.                                                                       |
| `AlsoLikedStrip`        | `components/also-liked-strip/`        | Drop-in strip composing `useRecommendations(also_liked)` + `ListingScrollStrip`. Client-side filters out `excludeListingIds`. Returns null on empty. Props: `userId`, `excludeListingIds?`.                             |
| `MoreFromSellerStrip`   | `components/more-from-seller-strip/`  | Drop-in strip composing `useRecommendations(seller)` + `ListingScrollStrip`. Dynamic title `More From {name}` from `SellerIdentity`. Returns null on empty. Props: `sellerId`, `seller`, `shopId?`, `excludeListingId`. |

## Create Wizard

The listing creation wizard at `/dashboard/listings/new` is a 5-step flow plus review screen:

1. **Photos** — PhotoManager integration; creates a draft on first upload; min 2 photos
2. **Category & Condition** — CategorySelector tile grid + ConditionSelector radio list
3. **Details** — Title (10-80 chars), description (20-2000 chars); live char counters
4. **Pricing** — Dollar-to-cents input with fee calculator (200ms debounce); shipping preference toggle
5. **Shipping** — Weight (lbs+oz), dimensions (LxWxH), payer choice; skipped when "Local pickup only"
6. **Review** — Listing preview card + details summary; "Publish" (→ active, redirect to `/listing/[id]`) or "Save Draft" (→ `/dashboard/listings`)

### Wizard Architecture

- **Store abstraction:** Step components use `WizardStoreContext` (`components/create-wizard/wizard-store-context.tsx`) which defaults to `useCreateWizardStore` but can be overridden by `WizardStoreProvider` for edit mode.
- **Create store:** Zustand store (`stores/create-wizard-store.ts`) with `persist` middleware (localStorage key: `nessi-create-wizard`) and `createSelectors` wrapper
- **Edit store:** Zustand store (`stores/edit-wizard-store.ts`) — no persist middleware, hydrates from server data, tracks `changedFields` set for partial save via `getChangedData()`
- **Validation:** Per-step Yup schemas (`validations/listing.ts`) with `STEP_SCHEMAS` array
- **Draft save:** Explicit "Save draft and exit" button persists wizard state to the API via `useUpdateListing`; Zustand `persist` middleware retains state in localStorage across page refreshes
- **Draft resume:** Server component loads draft by `?draftId=` query param, wizard hydrates store and advances to first incomplete step
- **Step transitions:** CSS `transform: translateX()` slide animation with direction tracking
- **Browser back:** `pushState`/`popstate` integration for wizard step navigation
- **Accessibility:** `aria-live` step announcements, focus management on step change, ARIA radiogroup for category selector, fieldset/legend grouping

## Pages

| Route                           | Description                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/dashboard/listings/new`       | Multi-step create wizard (ticket #24): photos → category → details → pricing → shipping → review |
| `/dashboard/listings/[id]/edit` | Edit wizard for existing listings (ticket #7)                                                    |
| `/dashboard/listings`           | Listing management dashboard (seller's active/draft/archived listings)                           |
| `/listing/[id]`                 | Public listing detail page — server-rendered with SEO metadata                                   |
| `/category/[slug]`              | Category browse page with infinite scroll and sort controls                                      |
| `/search`                       | Search results with FTS, filters, infinite scroll, autocomplete (ticket #28)                     |

## Key Patterns

- **API route architecture** — Client-side services call Next.js API routes via `@/libs/fetch` helpers (`get`, `post`, `put`, `del`, `patch`). API routes use the Supabase server client for auth and database access. Photo uploads and deletes go through separate API routes for server-side image processing.
- **Fee structure** — Under $15: flat $0.99 fee. $15 and above: 6% of price. All prices and fees are in cents.
- **Database-derived types** — `Listing` from `Database['public']['Tables']['listings']['Row']`, `ListingPhoto` from `Database['public']['Tables']['listing_photos']['Row']`.
- **System-managed fields** — `ListingInsert` and `ListingUpdate` omit fields managed by the database (id, created_at, updated_at, deleted_at, view_count, favorite_count, inquiry_count, search_vector).
- **Soft delete** — Listings are soft-deleted via the `deleted_at` column. Active queries filter `deleted_at IS NULL`.
- **Photo ordering** — `listing_photos.position` is 0-based. The photo at position 0 is the cover photo, whose URL is denormalized to `listings.cover_photo_url` for fast list queries.
- **Draft-first flow** — Listings begin as `status: 'draft'` during the create wizard. The listing row is created before photos are uploaded so `listing_id` is available as the storage path segment. Status transitions to `'active'` on final publish.
- **Context-aware seller identity** — `seller_id` is always `auth.users.id`. `member_id` or `shop_id` is set based on the active context from the Zustand context store (`@/features/context/`), determining which identity the listing is attributed to.
- **Image pipeline** — Upload validates → Sharp resizes full + thumbnail → WebP → stored in `listing-images` bucket → rendered via `next/image` with `fill` + `sizes`.
- **URL-as-truth for search filters** — All search filter state lives in URL search params (`?q=...&category=reels,rods&condition=good`). `useSearchFilters` reads params with `useSearchParams()` and updates with `router.replace()`. Sharing a URL preserves the exact filter state. Filter components are standalone controlled components (no react-hook-form).
- **Search FTS + trigram fallback** — Primary search uses PostgreSQL `textSearch()` on the `search_vector` tsvector column. When FTS returns 0 results, falls back to `ilike` on title/brand for typo tolerance (e.g., "Shimamo" → matches "Shimano").
- **Autocomplete** — Three sources: `search_suggestions` table (by popularity), listing title prefix matches, and category name matches. Debounced 200ms on client, min 2 chars. Max 8 suggestions, keyboard navigable.
- **Duplicate-as-draft** — Sellers can duplicate any owned listing (active, sold, archived) as a new draft via `POST /api/listings/[id]/duplicate`. All listing data is copied except photos, counts, timestamps, and search_vector. The new draft opens in the create wizard at Step 1 (photos) because `draftPhotos.length < 2`. Available from the dashboard three-dot menu and the listing detail page owner view.

## Related Features

- `src/features/context/` — Zustand store for member/shop identity switching; determines `member_id`/`shop_id` on listing creation
- `src/features/shops/` — Shop entity; `shop_id` FK on listings
- `src/features/members/` — Member profile; `member_id` FK on listings
- `src/features/products/` — Legacy product system being replaced by listings (see migration notes in ticket #20)
