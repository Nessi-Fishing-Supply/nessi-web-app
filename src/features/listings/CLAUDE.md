# Listings Feature

## Overview

Listings are the core marketplace entities in Nessi — individual items posted for sale by members or shops. This feature provides the full data layer (types, services, hooks), validations, UI components, and pages for creating, editing, and managing listings. Related tickets: #21 (photo infrastructure), #5 (create wizard), #7 (edit wizard).

## Architecture

- **types/listing.ts** — Database-derived types: `ListingCondition`, `ListingCategory` (enum aliases), `Listing` (from listings Row), `ListingInsert`, `ListingUpdate`, `ListingPhoto` (from listing_photos Row), `ListingPhotoInsert`, `ListingWithPhotos` (Listing + photos array)
- **constants/condition.ts** — `CONDITION_TIERS` (6-tier array with labels, descriptions, WCAG AA colors), `CATEGORY_PHOTO_GUIDANCE` (per-category photo tips), `ConditionTier` type
- **services/listing.ts** — Client-side Supabase queries via browser client (RLS handles authorization)
- **services/listing-server.ts** — Server-side Supabase queries via server client (for server components, e.g., public listing detail page)
- **hooks/use-listings.ts** — Tanstack Query hooks for data fetching and mutations
- **validations/listing.ts** — Zod schemas: `createListingSchema`, `updateListingSchema`
- **components/photo-manager/** — Multi-photo upload, reorder, and delete UI for listing creation and editing
- **components/condition-badge/** — Color-coded pill displaying condition tier with hover/tap popover description
- **components/condition-selector/** — Vertical radio list for selecting condition tier in create wizard, with category-specific photo guidance accordion
- **components/condition-filter/** — Multi-select checkbox group for filtering listings by condition, with optional count badges

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
  - Thumbnail: resizes to max 400x400 (`fit: 'inside'`, `withoutEnlargement: true`), WebP 80%
- Stores both at `{user_id}/{listing_id}/{timestamp}.webp` and `{user_id}/{listing_id}/{timestamp}_thumb.webp` in the `listing-photos` bucket
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

## Hooks

| Hook                            | Query Key                                | Purpose                                               |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `useListing(id)`                | `['listings', id]`                       | Fetch listing by ID with photos                       |
| `useListingsByMember(memberId)` | `['listings', 'member', memberId]`       | Fetch active listings for a member                    |
| `useListingsByShop(shopId)`     | `['listings', 'shop', shopId]`           | Fetch active listings for a shop                      |
| `useListingPhotos(listingId)`   | `['listings', listingId, 'photos']`      | Fetch ordered photos for a listing                    |
| `useCreateListing()`            | mutation, invalidates `['listings']`     | Create a new listing (draft)                          |
| `useUpdateListing()`            | mutation, invalidates `['listings']`     | Update listing fields                                 |
| `useDeleteListing()`            | mutation, invalidates `['listings']`     | Soft-delete a listing                                 |
| `useUploadListingPhoto()`       | mutation, invalidates listing photos key | Upload photo via `POST /api/listings/upload`          |
| `useDeleteListingPhoto()`       | mutation, invalidates listing photos key | Delete photo via `DELETE /api/listings/upload/delete` |
| `useReorderListingPhotos()`     | mutation, invalidates listing photos key | Update position values after drag-to-reorder          |

## Components

| Component           | Location                         | Purpose                                                                                                 |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `PhotoManager`      | `components/photo-manager/`      | Multi-photo upload, drag-to-reorder, and delete UI. Used in create and edit wizards.                    |
| `ConditionBadge`    | `components/condition-badge/`    | Color-coded pill with popover description. Props: `condition`, `size` (`sm`/`md`).                      |
| `ConditionSelector` | `components/condition-selector/` | Vertical radio list for wizard. Props: `value`, `onChange`, optional `category` for accordion guidance. |
| `ConditionFilter`   | `components/condition-filter/`   | Multi-select checkbox group for search. Props: `selected`, `onChange`, optional `counts`.               |

## Pages (planned)

| Route                           | Description                                                               |
| ------------------------------- | ------------------------------------------------------------------------- |
| `/dashboard/listings/create`    | Multi-step create wizard (ticket #5): photos → details → pricing → review |
| `/dashboard/listings/[id]/edit` | Edit wizard for existing listings (ticket #7)                             |
| `/dashboard/listings`           | Listing management dashboard (seller's active/draft/archived listings)    |
| `/listing/[id]`                 | Public listing detail page — server-rendered with SEO metadata            |

## Key Patterns

- **Direct Supabase access** — Most services use the browser client (`@/libs/supabase/client`) directly, with RLS policies enforcing authorization. Photo uploads and deletes go through API routes for server-side image processing and storage cleanup.
- **Database-derived types** — `Listing` from `Database['public']['Tables']['listings']['Row']`, `ListingPhoto` from `Database['public']['Tables']['listing_photos']['Row']`.
- **System-managed fields** — `ListingInsert` and `ListingUpdate` omit fields managed by the database (id, created_at, updated_at, deleted_at, view_count, favorite_count, inquiry_count, search_vector).
- **Soft delete** — Listings are soft-deleted via the `deleted_at` column. Active queries filter `deleted_at IS NULL`.
- **Photo ordering** — `listing_photos.position` is 0-based. The photo at position 0 is the cover photo, whose URL is denormalized to `listings.cover_photo_url` for fast list queries.
- **Draft-first flow** — Listings begin as `status: 'draft'` during the create wizard. The listing row is created before photos are uploaded so `listing_id` is available as the storage path segment. Status transitions to `'active'` on final publish.
- **Context-aware seller identity** — `seller_id` is always `auth.users.id`. `member_id` or `shop_id` is set based on the active context from the Zustand context store (`@/features/context/`), determining which identity the listing is attributed to.
- **Image pipeline** — Upload validates → Sharp resizes full + thumbnail → WebP → stored in `listing-photos` bucket → rendered via `next/image` with `fill` + `sizes`.

## Related Features

- `src/features/context/` — Zustand store for member/shop identity switching; determines `member_id`/`shop_id` on listing creation
- `src/features/shops/` — Shop entity; `shop_id` FK on listings
- `src/features/members/` — Member profile; `member_id` FK on listings
- `src/features/products/` — Legacy product system being replaced by listings (see migration notes in ticket #20)
