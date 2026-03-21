# Shops Feature

## Overview

Shops are business entities in Nessi's C2C marketplace, separate from member identity. A member can own or be a member of shops. This feature provides the data layer (types, services, hooks), validations, UI components, and pages for shop management.

## Architecture

- **types/shop.ts** — Database-derived types: `Shop` (from shops Row), `ShopInsert` (Insert minus system fields), `ShopUpdate` (Update minus system fields), `ShopMember` (from shop_members Row), `ShopMemberInsert`, `ShopMemberRole` union
- **services/shop.ts** — Direct Supabase queries via browser client (RLS handles authorization)
- **hooks/use-shops.ts** — Tanstack Query hooks for data fetching and mutations
- **validations/shop.ts** — Zod schemas: `createShopSchema` (name, slug, description) and `updateShopSchema` (partial, all fields optional)

## Service Functions

| Function                                | Purpose                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `getShop(id)`                           | Fetch shop by ID, returns `Shop \| null`                                                     |
| `getShopBySlug(slug)`                   | Fetch shop by URL slug (excludes soft-deleted), returns `Shop \| null`                       |
| `getShopsByOwner(memberId)`             | Fetch all shops owned by a member, returns `Shop[]`                                          |
| `getShopsByMember(memberId)`            | Fetch all shops a member belongs to (any role), returns `Shop[]`                             |
| `createShop(data)`                      | Insert a new shop row, returns created `Shop`                                                |
| `updateShop(id, data)`                  | Update allowed shop fields, returns updated `Shop`                                           |
| `deleteShop(id)`                        | Calls `DELETE /api/shops/{id}` for server-side deletion with storage cleanup, returns `void` |
| `getShopMembers(shopId)`                | Fetch all members of a shop with their roles, returns `ShopMember[]`                         |
| `addShopMember(shopId, memberId, role)` | Add a member to a shop with a given role, returns created `ShopMember`                       |
| `removeShopMember(shopId, memberId)`    | Remove a member from a shop                                                                  |
| `transferOwnership(shopId, newOwnerId)` | Transfer shop ownership to another member, updates owner_id                                  |
| `checkShopSlugAvailable(slug)`          | Slug uniqueness check against shared slugs table, returns `boolean`                          |

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
| `useAddShopMember()`         | mutation, invalidates `['shops', shopId, 'members']` | Add a member to a shop                                   |
| `useRemoveShopMember()`      | mutation, invalidates `['shops', shopId, 'members']` | Remove a member from a shop                              |
| `useTransferOwnership()`     | mutation, invalidates `['shops']`                    | Transfer shop ownership to another member                |

## Components

| Component                  | Location                                               | Purpose                                                                                           |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `ShopCreationForm`         | `components/shop-creation-form/`                       | Multi-field form with slug auto-generation, availability check, and context switching on submit   |
| `ShopDetailsSection`       | `components/shop-settings/shop-details-section/`       | Inline-edit section for shop name, slug, description, and avatar (uses InlineEdit + AvatarUpload) |
| `ShopSubscriptionSection`  | `components/shop-settings/shop-subscription-section/`  | Stripe subscription placeholder (Coming Soon)                                                     |
| `OwnershipTransferSection` | `components/shop-settings/ownership-transfer-section/` | Two-step confirmation modal for transferring shop ownership                                       |
| `ShopDeletionSection`      | `components/shop-settings/shop-deletion-section/`      | Danger zone with type-to-confirm deletion modal                                                   |

## Pages

| Route                      | Description                                                                       |
| -------------------------- | --------------------------------------------------------------------------------- |
| `/dashboard/shop/create`   | Shop creation page — renders `ShopCreationForm`                                   |
| `/dashboard/shop/settings` | Shop settings page — shop context only; owner sees transfer and deletion sections |

## Avatar Upload API

`POST /api/shops/avatar`

- Requires authenticated session + shop owner verification
- Accepts `file` (image) + `shopId` in `multipart/form-data`
- Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- Processes with `sharp`: resizes to 200x200, converts to WebP at 80% quality
- Stores at `avatars/shop-{shopId}.webp` in the `avatars` bucket
- Returns `{ avatarUrl: string }`

## Shop Deletion API

`DELETE /api/shops/[id]`

- Requires authenticated session + shop owner verification (`owner_id === user.id`)
- Returns 401 (no session), 403 (not owner), 404 (not found or already soft-deleted)
- Performs best-effort storage cleanup before soft delete:
  - Removes shop avatar at `avatars/shop-{shopId}.webp`
  - Parses `hero_banner_url` (if non-null) and removes from `avatars` bucket
  - Queries shop-owned products → `product_images`, removes files from `product-images` bucket
- Storage cleanup failures are caught and logged but do not block the soft delete
- Soft-deletes the shop row (`deleted_at = now()`) using the admin client
- Uses `parseStoragePath` helper to extract storage paths from Supabase public URLs
- Pattern mirrors `src/app/api/auth/delete-account/route.ts` (account deletion with storage cleanup)
- Returns `{ success: true }` on 200

## Shared Components Reused

- `InlineEdit` from `@/components/controls/inline-edit`
- `Modal` from `@/components/layout/modal`
- `AvatarUpload` from `@/features/members/components/avatar-upload` — accepts configurable `uploadUrl` and `extraFormData` props
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
