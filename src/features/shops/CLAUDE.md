# Shops Feature

## Overview

Shops are business entities in Nessi's C2C marketplace, separate from member identity. A member can own or be a member of shops. This feature provides the data layer: types, services, and hooks for shop management.

## Architecture

- **types/shop.ts** — Database-derived types: `Shop` (from shops Row), `ShopInsert` (Insert minus system fields), `ShopUpdate` (Update minus system fields), `ShopMember` (from shop_members Row), `ShopMemberInsert`, `ShopMemberRole` union
- **services/shop.ts** — Direct Supabase queries via browser client (RLS handles authorization)
- **hooks/use-shops.ts** — Tanstack Query hooks for data fetching and mutations

## Service Functions

| Function                                    | Purpose                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `getShop(id)`                               | Fetch shop by ID, returns `Shop \| null`                                           |
| `getShopBySlug(slug)`                       | Fetch shop by URL slug (excludes soft-deleted), returns `Shop \| null`             |
| `getShopsByOwner(memberId)`                 | Fetch all shops owned by a member, returns `Shop[]`                                |
| `getShopsByMember(memberId)`                | Fetch all shops a member belongs to (any role), returns `Shop[]`                   |
| `createShop(data)`                          | Insert a new shop row, returns created `Shop`                                      |
| `updateShop(id, data)`                      | Update allowed shop fields, returns updated `Shop`                                 |
| `deleteShop(id)`                            | Soft delete via `deleted_at = now()`, returns updated `Shop`                       |
| `getShopMembers(shopId)`                    | Fetch all members of a shop with their roles, returns `ShopMember[]`               |
| `addShopMember(shopId, memberId, role)`     | Add a member to a shop with a given role, returns created `ShopMember`             |
| `removeShopMember(shopId, memberId)`        | Remove a member from a shop                                                        |
| `transferOwnership(shopId, newOwnerId)`     | Transfer shop ownership to another member, updates owner_id                        |
| `checkShopSlugAvailable(slug)`              | Slug uniqueness check against shared slugs table, returns `boolean`                |

## Hooks

| Hook                              | Query Key                            | Purpose                                                        |
| --------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| `useShop(id)`                     | `['shops', id]`                      | Fetch shop by ID                                               |
| `useShopBySlug(slug)`             | `['shops', 'slug', slug]`            | Fetch shop by slug                                             |
| `useShopsByOwner(memberId)`       | `['shops', 'owner', memberId]`       | Fetch all shops owned by a member                              |
| `useShopsByMember(memberId)`      | `['shops', 'member', memberId]`      | Fetch all shops a member belongs to                            |
| `useShopMembers(shopId)`          | `['shops', shopId, 'members']`       | Fetch all members of a shop                                    |
| `useShopSlugCheck(slug)`          | `['shops', 'slug-check', slug]`      | Slug availability check (enabled when slug is non-empty)       |
| `useCreateShop()`                 | mutation, invalidates `['shops']`    | Create a new shop                                              |
| `useUpdateShop()`                 | mutation, invalidates `['shops']`    | Update shop fields                                             |
| `useDeleteShop()`                 | mutation, invalidates `['shops']`    | Soft delete a shop                                             |
| `useAddShopMember()`              | mutation, invalidates `['shops', shopId, 'members']` | Add a member to a shop                      |
| `useRemoveShopMember()`           | mutation, invalidates `['shops', shopId, 'members']` | Remove a member from a shop                 |
| `useTransferOwnership()`          | mutation, invalidates `['shops']`    | Transfer shop ownership to another member                      |

## Key Patterns

- **Direct Supabase access** — Services use the browser client (`@/libs/supabase/client`) directly, not axios/API routes. RLS policies enforce that members can only manage their own shops.
- **Database-derived types** — `Shop` type comes from `Database['public']['Tables']['shops']['Row']` and `ShopMember` from `Database['public']['Tables']['shop_members']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `ShopInsert` and `ShopUpdate` omit fields managed by database triggers or system processes (id, created_at, updated_at, deleted_at).
- **Soft delete** — Shops are soft-deleted via the `deleted_at` column. Queries that list or fetch active shops filter `deleted_at IS NULL`.
- **Slug uniqueness** — Shop slugs are checked for uniqueness against the shared `slugs` table (not just the shops table), since slugs are a cross-entity namespace shared with member slugs.
- **No UI components** — This domain contains only the data layer. No React components live here yet.
- **No API routes** — Shops use direct Supabase queries with RLS for authorization. No server-side API routes are needed for standard CRUD.
