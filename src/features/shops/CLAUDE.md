# Shops Feature

## Overview

Shops are business entities in Nessi's C2C marketplace, separate from member identity. A member can own or be a member of shops. This feature provides the data layer (types, services, hooks), validations, UI components, and pages for shop management.

## Architecture

- **types/shop.ts** — Database-derived types: `Shop` (from shops Row), `ShopInsert` (Insert minus system fields), `ShopUpdate` (Update minus system fields), `ShopMember` (from shop_members Row with joined `shop_roles` data), `ShopMemberInsert`
- **types/permissions.ts** — Permission model types: `ShopPermissionFeature` (6 feature domains), `ShopPermissionLevel` (`'full' | 'view' | 'none'`), `ShopPermissions` (Record mapping features to levels), `ShopRole` (typed `shop_roles` row with `ShopPermissions` instead of generic `Json`)
- **constants/roles.ts** — System role constants: `SYSTEM_ROLE_IDS` (deterministic UUIDs), `SYSTEM_ROLE_SLUGS`, `DEFAULT_ROLE_ID` (Contributor)
- **utils/check-permission.ts** — Pure permission utility functions: `checkPermission` (returns level, defaults to `'none'`), `hasAccess` (true for `'full'` or `'view'`), `hasFullAccess` (true only for `'full'`)
- **services/shop.ts** — Direct Supabase queries via browser client (RLS handles authorization)
- **services/shop-server.ts** — Server-side Supabase queries via server client (for server components, e.g., public shop page)
- **hooks/use-shops.ts** — Tanstack Query hooks for data fetching and mutations
- **validations/shop.ts** — Zod schemas: `createShopSchema` (name, slug, description) and `updateShopSchema` (partial, all fields optional)

## Service Functions

| Function                                  | Purpose                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `getShop(id)`                             | Fetch shop by ID, returns `Shop \| null`                                                                    |
| `getShopBySlug(slug)`                     | Fetch shop by URL slug (excludes soft-deleted), returns `Shop \| null`                                      |
| `getShopsByOwner(memberId)`               | Fetch all shops owned by a member, returns `Shop[]`                                                         |
| `getShopsByMember(memberId)`              | Fetch all shops a member belongs to (any role), returns `Shop[]`                                            |
| `createShop(data)`                        | Insert a new shop row, returns created `Shop`                                                               |
| `updateShop(id, data)`                    | Update allowed shop fields, returns updated `Shop`                                                          |
| `deleteShop(id)`                          | Calls `DELETE /api/shops/{id}` for server-side deletion with storage cleanup, returns `void`                |
| `updateShopSlug(shopId, slug)`            | Calls `POST /api/shops/slug` to atomically update the shop's slug via the slugs table, returns `void`       |
| `getShopMembers(shopId)`                  | Fetch all members of a shop with joined `shop_roles` data (name, slug, permissions), returns `ShopMember[]` |
| `addShopMember(shopId, memberId, roleId)` | Add a member to a shop with a role UUID, returns created `ShopMember`                                       |
| `removeShopMember(shopId, memberId)`      | Remove a member from a shop                                                                                 |
| `transferOwnership(shopId, newOwnerId)`   | Transfer shop ownership to another member, updates owner_id                                                 |
| `checkShopSlugAvailable(slug)`            | Slug uniqueness check against shared slugs table, returns `boolean`                                         |

### Server-side Service Functions (`services/shop-server.ts`)

| Function                    | Purpose                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| `getShopBySlugServer(slug)` | Server-side fetch shop by slug (for server components), returns `Shop \| null` |

## Hooks

| Hook                         | Query Key                                            | Purpose                                                  |
| ---------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `useShop(id)`                | `['shops', id]`                                      | Fetch shop by ID                                         |
| `useShopBySlug(slug)`        | `['shops', 'slug', slug]`                            | Fetch shop by slug                                       |
| `useShopsByOwner(memberId)`  | `['shops', 'owner', memberId]`                       | Fetch all shops owned by a member                        |
| `useShopsByMember(memberId)` | `['shops', 'member', memberId]`                      | Fetch all shops a member belongs to                      |
| `useShopMembers(shopId)`     | `['shops', shopId, 'members']`                       | Fetch all members of a shop                              |
| `useShopSlugCheck(slug)`     | `['shops', 'slug-check', slug]`                      | Slug availability check (enabled when slug is non-empty) |
| `useCreateShop()`            | mutation, invalidates `['shops']`                    | Create a new shop                                        |
| `useUpdateShop()`            | mutation, invalidates `['shops']`                    | Update shop fields                                       |
| `useDeleteShop()`            | mutation, invalidates `['shops']`                    | Delete a shop via API route with storage cleanup         |
| `useUpdateShopSlug()`        | mutation, invalidates `['shops']`                    | Update a shop's slug via `POST /api/shops/slug`          |
| `useAddShopMember()`         | mutation, invalidates `['shops', shopId, 'members']` | Add a member to a shop                                   |
| `useRemoveShopMember()`      | mutation, invalidates `['shops', shopId, 'members']` | Remove a member from a shop                              |
| `useTransferOwnership()`     | mutation, invalidates `['shops']`                    | Transfer shop ownership to another member                |

## Components

| Component                  | Location                                               | Purpose                                                                                                    |
| -------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `ShopCreationForm`         | `components/shop-creation-form/`                       | Multi-field form with slug auto-generation, availability check, and context switching on submit            |
| `ShopDetailsSection`       | `components/shop-settings/shop-details-section/`       | Inline-edit section for shop name, slug, description, and avatar (uses InlineEdit + AvatarUpload)          |
| `ShopSubscriptionSection`  | `components/shop-settings/shop-subscription-section/`  | Stripe subscription placeholder (Coming Soon)                                                              |
| `OwnershipTransferSection` | `components/shop-settings/ownership-transfer-section/` | Two-step confirmation modal for transferring shop ownership                                                |
| `ShopDeletionSection`      | `components/shop-settings/shop-deletion-section/`      | Danger zone with type-to-confirm deletion modal                                                            |
| `HeroBannerUpload`         | `components/hero-banner-upload/`                       | Hero banner image picker with crop UI (uses ImageCropper + Modal); uploads via POST /api/shops/hero-banner |

## Pages

| Route                      | Description                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `/dashboard/shop/create`   | Shop creation page — renders `ShopCreationForm`                                   |
| `/dashboard/shop/settings` | Shop settings page — shop context only; owner sees transfer and deletion sections |
| `/shop/[slug]`             | Public shop page — server-rendered with SEO metadata, product grid, shop stats    |

## Avatar Upload API

`POST /api/shops/avatar`

- Requires authenticated session + shop owner verification
- Accepts `file` (image) + `shopId` in `multipart/form-data`
- Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- Processes with `sharp`: resizes to 200x200, converts to WebP at 80% quality
- Uses admin client for storage upload (bypasses RLS; ownership verified in handler)
- Stores at `shops/{shopId}/avatar.webp` in the `profile-assets` bucket
- Returns `{ url: string }`

## Hero Banner Upload API

`POST /api/shops/hero-banner`

- Requires authenticated session + shop owner verification
- Accepts `file` (image) + `shopId` in `multipart/form-data`
- Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- Processes with `sharp`: resizes to max 1200x400 (fit inside, no upscale), converts to WebP at 85% quality
- Uses admin client for storage upload (bypasses RLS; ownership verified in handler)
- Stores at `shops/{shopId}/hero-banner.webp` in the `profile-assets` bucket
- Returns `{ url: string }`

## Shop Deletion API

`DELETE /api/shops/[id]`

- Requires authenticated session + shop owner verification (`owner_id === user.id`)
- Returns 401 (no session), 403 (not owner), 404 (not found or already soft-deleted)
- Performs best-effort storage cleanup before soft delete:
  - Removes shop assets at `shops/{shopId}/avatar.webp` and hero banner from `profile-assets` bucket
  - Queries shop-owned products → `product_images`, removes files from `listing-images` bucket
- Storage cleanup failures are caught and logged but do not block the soft delete
- Soft-deletes the shop row (`deleted_at = now()`) using the admin client
- Uses `parseStoragePath` helper to extract storage paths from Supabase public URLs
- Pattern mirrors `src/app/api/auth/delete-account/route.ts` (account deletion with storage cleanup)
- Returns `{ success: true }` on 200

## Shared Components Reused

- `InlineEdit` from `@/components/controls/inline-edit`
- `Modal` from `@/components/layout/modal`
- `AvatarUpload` from `@/components/controls/avatar-upload` — accepts configurable `uploadUrl` and `extraFormData` props
- `ImageCropper` from `@/components/controls/image-cropper` — used by `HeroBannerUpload` to let users crop the banner before upload
- `Button` from `@/components/controls/button`
- Toast context from `@/components/indicators/toast/context`

## Key Patterns

- **Direct Supabase access** — Most services use the browser client (`@/libs/supabase/client`) directly, with RLS policies enforcing authorization. Exceptions: `deleteShop()` calls the API route for server-side storage cleanup, and avatar uploads go through `POST /api/shops/avatar` for server-side image processing.
- **Database-derived types** — `Shop` type comes from `Database['public']['Tables']['shops']['Row']` and `ShopMember` from `Database['public']['Tables']['shop_members']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `ShopInsert` and `ShopUpdate` omit fields managed by database triggers or system processes (id, created_at, updated_at, deleted_at).
- **Soft delete** — Shops are soft-deleted via the `deleted_at` column. Queries that list or fetch active shops filter `deleted_at IS NULL`.
- **Slug uniqueness** — Shop slugs are checked for uniqueness against the shared `slugs` table (not just the shops table), since slugs are a cross-entity namespace shared with member slugs. The `generateSlug` utility in `src/features/shared/utils/slug.ts` handles auto-generating a slug from a display name.
- **Avatar upload via API route** — Unlike standard shop CRUD (direct Supabase), avatar uploads go through `POST /api/shops/avatar` for server-side image processing with `sharp`.
- **Server-side deletion with storage cleanup** — Shop deletion uses `DELETE /api/shops/[id]` (server-side API route with admin client) to clean up storage objects before soft-deleting. The `deleteShop()` service function calls this API route via `fetch`. This parallels the account deletion pattern in `src/app/api/auth/delete-account/route.ts`.

## Shop Roles

Shop member roles are stored in the `shop_roles` table with a FK from `shop_members.role_id`. Three system roles are seeded with deterministic UUIDs:

| Role        | UUID                                   | Permissions                                                                       |
| ----------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Owner       | `11111111-1111-1111-1111-111111111101` | Full access to all 6 domains                                                      |
| Manager     | `11111111-1111-1111-1111-111111111102` | Full on listings/pricing/orders/messaging, view on shop_settings, none on members |
| Contributor | `11111111-1111-1111-1111-111111111103` | Full on listings only                                                             |

Use `SYSTEM_ROLE_IDS` from `constants/roles.ts` to reference these UUIDs in application code — never hardcode the UUID strings directly. Use `checkPermission`, `hasAccess`, and `hasFullAccess` from `utils/check-permission.ts` to check a member's effective permission level for a feature — never hardcode permission logic for specific roles.

System roles have `shop_id IS NULL` and `is_system = true`. Future custom roles will have a `shop_id` FK to a specific shop. RLS allows all authenticated users to read system roles; custom roles are only visible to members of that shop.
