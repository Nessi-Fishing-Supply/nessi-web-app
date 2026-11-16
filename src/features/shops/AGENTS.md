# Shops Feature

## Overview

Shops are business entities in Nessi's C2C marketplace, separate from member identity. A member can own or be a member of shops. This feature provides the data layer (types, services, hooks), validations, UI components, and pages for shop management.

## Architecture

- **types/shop.ts** — Database-derived types: `Shop` (from shops Row), `ShopInsert` (Insert minus system fields), `ShopUpdate` (Update minus system fields), `ShopMember` (from shop_members Row with joined `shop_roles` data), `ShopMemberInsert`
- **types/permissions.ts** — Permission model types: `ShopPermissionFeature` (6 feature domains), `ShopPermissionLevel` (`'full' | 'view' | 'none'`), `ShopPermissions` (Record mapping features to levels), `ShopRole` (typed `shop_roles` row with `ShopPermissions` instead of generic `Json`)
- **constants/roles.ts** — System role constants: `SYSTEM_ROLE_IDS` (deterministic UUIDs), `SYSTEM_ROLE_SLUGS`, `DEFAULT_ROLE_ID` (Contributor)
- **constants/limits.ts** — Membership limits: `MAX_SHOPS_PER_MEMBER = 5` (max shops a member can belong to, owned + member-of combined), `MAX_MEMBERS_PER_SHOP = 5` (max members + pending invites per shop)
- **utils/check-permission.ts** — Pure permission utility functions: `checkPermission` (returns level, defaults to `'none'`), `hasAccess` (true for `'full'` or `'view'`), `hasFullAccess` (true only for `'full'`), `meetsLevel` (true if user's level >= required level — used by `requireShopPermission` in `src/libs/shop-permissions.ts`)
- **utils/get-relative-time.ts** — `getRelativeTime(dateString)` — returns human-readable relative time ("just now", "2 days ago", etc.), used by PendingInvitesList for invite sent timestamps
- **utils/check-member-shop-limit.ts** — Reusable server-side utility: `checkMemberShopLimit(memberId: string)` returns `{ withinLimit: boolean; currentCount: number; maxCount: number }`. Uses admin client with head-only count query on `shop_members`. Does NOT import from `next/server` — designed for reuse by invite endpoints (#252, #253).
- **types/invite.ts** — `ShopInvite` (raw row from `shop_invites`), `ShopInviteWithInviter` (includes joined inviter name from `members`), `InvitePageData` (invite details for the accept page — no invitee email, includes `shopAvatarUrl`, `inviterName`, `roleName`)
- **validations/invite.ts** — `validateInviteInput({ email, roleId })` — validates email format, role validity, prevents Owner role invites
- **services/shop.ts** — Direct Supabase queries via browser client (RLS handles authorization)
- **services/shop-invites.ts** — Client-side service functions for invite CRUD (`getShopInvites`, `createShopInvite`, `resendShopInvite`, `revokeShopInvite`, `acceptShopInvite`) using `get`/`post`/`del` from `@/libs/fetch`
- **services/shop-ownership-transfer.ts** — Client-side service functions for ownership transfer flow (`initiateOwnershipTransfer`, `getOwnershipTransfer`, `cancelOwnershipTransfer`, `getOwnershipTransferByToken`, `acceptOwnershipTransfer`). Shop-scoped functions use `get`/`post`/`del` from `@/libs/fetch`; token-based functions use raw `fetch` (no `X-Nessi-Context`)
- **services/shop-server.ts** — Server-side Supabase queries via server client (for server components, e.g., public shop page)
- **hooks/use-shops.ts** — Tanstack Query hooks for data fetching and mutations
- **hooks/use-shop-invites.ts** — Tanstack Query hooks for invite operations (`useShopInvites`, `useCreateInvite`, `useResendInvite`, `useRevokeInvite`)
- **hooks/use-ownership-transfer.ts** — Tanstack Query hooks for ownership transfer operations (`useOwnershipTransfer`, `useOwnershipTransferByToken`, `useInitiateOwnershipTransfer`, `useCancelOwnershipTransfer`, `useAcceptOwnershipTransfer`)
- **validations/shop.ts** — Zod schemas: `createShopSchema` (name, slug, description) and `updateShopSchema` (partial, all fields optional)

## Service Functions

| Function                                      | Purpose                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getShop(id)`                                 | Fetch shop by ID, returns `Shop \| null`                                                                                                                                 |
| `getShopBySlug(slug)`                         | Fetch shop by URL slug (excludes soft-deleted), returns `Shop \| null`                                                                                                   |
| `getShopsByOwner(memberId)`                   | Fetch all shops owned by a member, returns `Shop[]`                                                                                                                      |
| `getShopsByMember(memberId)`                  | Fetch all shops a member belongs to (any role), returns `Shop[]`                                                                                                         |
| `createShop(data)`                            | Insert a new shop row, returns created `Shop`                                                                                                                            |
| `updateShop(id, data)`                        | Update allowed shop fields, returns updated `Shop`                                                                                                                       |
| `deleteShop(id)`                              | Calls `DELETE /api/shops/{id}` for server-side deletion with storage cleanup, returns `void`                                                                             |
| `updateShopSlug(shopId, slug)`                | Calls `POST /api/shops/slug` to atomically update the shop's slug via the slugs table, returns `void`                                                                    |
| `getMyShopRole(shopId)`                       | Fetch the current authenticated user's shop membership with joined `shop_roles` data, returns `ShopMember \| null`                                                       |
| `getShopMembers(shopId)`                      | Fetch all members of a shop with joined `shop_roles` data (name, slug, permissions), returns `ShopMember[]`                                                              |
| `addShopMember(shopId, memberId, roleId)`     | Add a member to a shop with a role UUID, returns created `ShopMember`                                                                                                    |
| `removeShopMember(shopId, memberId)`          | Remove a member from a shop                                                                                                                                              |
| `transferOwnership(shopId, newOwnerId)`       | Initiate ownership transfer request (creates pending record, sends email). Legacy wrapper — prefer `initiateOwnershipTransfer()` from `shop-ownership-transfer.ts`       |
| `checkShopSlugAvailable(slug)`                | Slug uniqueness check against shared slugs table, returns `boolean`                                                                                                      |
| `updateMemberRole(shopId, memberId, roleId)`  | Update a shop member's role via `PATCH /api/shops/{shopId}/members/{memberId}/role`, returns `{ success, roleName }`                                                     |
| `getShopRoles(shopId)`                        | Fetch all roles for a shop (system + custom) via `GET /api/shops/{shopId}/roles`, returns `ShopRole[]`                                                                   |
| `getShopInvites(shopId)`                      | Fetch all invites for a shop via `GET /api/shops/{shopId}/invites`, returns `ShopInviteWithInviter[]`                                                                    |
| `createShopInvite(shopId, { email, roleId })` | Create an invite via `POST /api/shops/{shopId}/invites`, returns `ShopInvite`                                                                                            |
| `resendShopInvite(shopId, inviteId)`          | Resend invite via `POST /api/shops/{shopId}/invites/{inviteId}/resend`, returns `ShopInvite`                                                                             |
| `revokeShopInvite(shopId, inviteId)`          | Revoke invite via `DELETE /api/shops/{shopId}/invites/{inviteId}`, returns `{ success: true }`                                                                           |
| `acceptShopInvite(token)`                     | Accept an invite via `POST /api/invites/{token}/accept` (raw fetch, no auth header — uses cookie session), returns `{ success: true, shopId: string, shopName: string }` |

### Ownership Transfer Service Functions (`services/shop-ownership-transfer.ts`)

| Function                                        | Purpose                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initiateOwnershipTransfer(shopId, newOwnerId)` | Initiate transfer via `POST /api/shops/{shopId}/ownership`, returns `{ success: true }`. Returns 409 if pending transfer exists                                          |
| `getOwnershipTransfer(shopId)`                  | Fetch pending transfer via `GET /api/shops/{shopId}/ownership-transfer`, returns `OwnershipTransfer \| null`                                                             |
| `cancelOwnershipTransfer(shopId)`               | Cancel pending transfer via `DELETE /api/shops/{shopId}/ownership-transfer`, returns `{ success: true }`                                                                 |
| `getOwnershipTransferByToken(token)`            | Fetch transfer details via `GET /api/shops/ownership-transfer/{token}` (raw fetch, no `X-Nessi-Context`), returns `OwnershipTransferWithDetails`                         |
| `acceptOwnershipTransfer(token)`                | Accept transfer via `POST /api/shops/ownership-transfer/{token}/accept` (raw fetch, no `X-Nessi-Context`), returns `{ success: true, shopId: string, shopName: string }` |

### Server-side Service Functions (`services/shop-server.ts`)

| Function                    | Purpose                                                                        |
| --------------------------- | ------------------------------------------------------------------------------ |
| `getShopBySlugServer(slug)` | Server-side fetch shop by slug (for server components), returns `Shop \| null` |

## Hooks

| Hook                                 | Query Key                                                                      | Purpose                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `useShop(id)`                        | `['shops', id]`                                                                | Fetch shop by ID                                                                        |
| `useShopBySlug(slug)`                | `['shops', 'slug', slug]`                                                      | Fetch shop by slug                                                                      |
| `useShopsByOwner(memberId)`          | `['shops', 'owner', memberId]`                                                 | Fetch all shops owned by a member                                                       |
| `useShopsByMember(memberId)`         | `['shops', 'member', memberId]`                                                | Fetch all shops a member belongs to                                                     |
| `useShopMembers(shopId)`             | `['shops', shopId, 'members']`                                                 | Fetch all members of a shop                                                             |
| `useShopPermissions(shopId)`         | `['shops', shopId, 'my-permissions']`                                          | Current user's permissions and role for a shop (hooks/use-shop-permissions.ts)          |
| `useShopSlugCheck(slug)`             | `['shops', 'slug-check', slug]`                                                | Slug availability check (enabled when slug is non-empty)                                |
| `useCreateShop()`                    | mutation, invalidates `['shops']`                                              | Create a new shop                                                                       |
| `useUpdateShop()`                    | mutation, invalidates `['shops']`                                              | Update shop fields                                                                      |
| `useDeleteShop()`                    | mutation, invalidates `['shops']`                                              | Delete a shop via API route with storage cleanup                                        |
| `useUpdateShopSlug()`                | mutation, invalidates `['shops']`                                              | Update a shop's slug via `POST /api/shops/slug`                                         |
| `useAddShopMember()`                 | mutation, invalidates `['shops', shopId, 'members']`                           | Add a member to a shop                                                                  |
| `useUpdateMemberRole()`              | mutation, invalidates `['shops', shopId, 'members']`                           | Update a member's role with optimistic cache update and rollback on error               |
| `useRemoveShopMember()`              | mutation, invalidates `['shops', shopId, 'members']`                           | Remove a member from a shop                                                             |
| `useTransferOwnership()`             | mutation, invalidates `['shops']`                                              | Legacy — initiates ownership transfer request (prefer `useInitiateOwnershipTransfer()`) |
| `useShopRoles(shopId)`               | `['shops', shopId, 'roles']`                                                   | Fetch all roles for a shop                                                              |
| `useShopInvites(shopId)`             | `['shops', shopId, 'invites']`                                                 | Fetch all invites for a shop with inviter names                                         |
| `useCreateInvite()`                  | mutation, invalidates `['shops', shopId, 'invites']`                           | Create a shop invite and send email                                                     |
| `useResendInvite()`                  | mutation, invalidates `['shops', shopId, 'invites']`                           | Resend invite email with new token and reset expiry                                     |
| `useRevokeInvite()`                  | mutation, invalidates `['shops', shopId, 'invites']`                           | Revoke a pending invite                                                                 |
| `useAcceptInvite()`                  | mutation, invalidates `['shops', 'member', userId]` and `['shops']` on success | Accept an invite by token — used on the public invite page                              |
| `useOwnershipTransfer(shopId)`       | `['shops', shopId, 'ownership-transfer']`                                      | Fetch pending ownership transfer for a shop                                             |
| `useOwnershipTransferByToken(token)` | `['shops', 'ownership-transfer', token]`                                       | Fetch transfer details by token (transferee view)                                       |
| `useInitiateOwnershipTransfer()`     | mutation, invalidates `['shops', shopId, 'ownership-transfer']`                | Initiate an ownership transfer request                                                  |
| `useCancelOwnershipTransfer()`       | mutation, invalidates `['shops', shopId, 'ownership-transfer']`                | Cancel a pending ownership transfer                                                     |
| `useAcceptOwnershipTransfer()`       | mutation, invalidates `['shops']`                                              | Accept an ownership transfer by token                                                   |

## Components

| Component                  | Location                                               | Purpose                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ShopCreationForm`         | `components/shop-creation-form/`                       | Multi-field form with slug auto-generation, availability check, and context switching on submit                                                                                                              |
| `ShopDetailsSection`       | `components/shop-settings/shop-details-section/`       | Inline-edit section for shop name, slug, description, and avatar (uses InlineEdit + AvatarUpload)                                                                                                            |
| `ShopSubscriptionSection`  | `components/shop-settings/shop-subscription-section/`  | Stripe subscription placeholder (Coming Soon)                                                                                                                                                                |
| `OwnershipTransferSection` | `components/shop-settings/ownership-transfer-section/` | Two-state UI: initiation form (member select + two-step confirm → `useInitiateOwnershipTransfer`) or pending status card (Pill badge, transferee name, expiry, cancel button → `useCancelOwnershipTransfer`) |
| `TransferAccept`           | `components/transfer-accept/`                          | Client component for `/shop/transfer/[token]` acceptance page — accept/decline buttons for pending transfers, expired state message                                                                          |
| `ShopDeletionSection`      | `components/shop-settings/shop-deletion-section/`      | Danger zone with type-to-confirm deletion modal                                                                                                                                                              |
| `HeroBannerUpload`         | `components/hero-banner-upload/`                       | Hero banner image picker with crop UI (uses ImageCropper + Modal); uploads via POST /api/shops/hero-banner                                                                                                   |
| `ShopRouteGuard`           | `components/shop-route-guard/`                         | Client-side route guard — redirects to /dashboard with toast when user lacks permission for a shop route                                                                                                     |
| `PermissionMatrix`         | `components/permission-matrix/`                        | Reusable matrix showing 6 features × 3 levels with visual indicators; accepts `disabled` prop (true for system roles, false for future custom role editing)                                                  |
| `RoleCard`                 | `components/role-card/`                                | Card displaying a single role: name, system badge, description, and embedded PermissionMatrix                                                                                                                |
| `CustomRoleUpsellModal`    | `components/custom-role-upsell-modal/`                 | Placeholder modal for "Add Custom Role" — premium plan upsell gate                                                                                                                                           |
| `RoleSelect`               | `components/role-select/`                              | Standalone native `<select>` for assigning roles — filters out Owner, supports loading/disabled states, 44px tap target                                                                                      |
| `RolesPermissionsPage`     | `components/roles-permissions-page/`                   | Full page component for /dashboard/shop/roles — renders role cards, Owner-only add button                                                                                                                    |
| `InviteAccept`             | `components/invite-accept/`                            | Client component, auth-gated accept UI for public invite page — uses `useAuth()` for post-login reactivity, maps API error codes to user-facing messages                                                     |
| `InviteMemberModal`        | `components/invite-member-modal/`                      | Modal with email input + RoleSelect for creating shop invites — Owner-only, validates via `validateInviteInput`, handles 409 inline errors                                                                   |
| `PendingInvitesList`       | `components/pending-invites-list/`                     | Renders pending/expired/revoked invites with status badges (Pill), relative timestamps, Resend/Revoke actions with confirmation modal — Owner-only                                                           |

## Pages

| Route                      | Description                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/dashboard/shop/create`   | Shop creation page — renders `ShopCreationForm`                                                                                                                                                                                                                          |
| `/dashboard/shop/settings` | Shop settings page — shop details (name, slug, avatar, hero banner), subscription, and deletion. Owner sees all, Manager sees details read-only, Contributor redirected by ShopRouteGuard                                                                                |
| `/dashboard/shop/roles`    | Roles & Permissions page — system roles with permission matrices, member management with role dropdowns, ownership transfer, and "Add Custom Role" upsell (Owner-only)                                                                                                   |
| `/shop/[slug]`             | Public shop page — server-rendered with SEO metadata, product grid, shop stats                                                                                                                                                                                           |
| `/invite/[token]`          | Public invite acceptance page — server component using admin client to fetch invite data, renders `InviteAccept`. Unauthenticated users see a sign-in prompt. Invalid tokens → 404.                                                                                      |
| `/shop/transfer/[token]`   | Ownership transfer acceptance page — server component using admin client to fetch transfer data, validates user is intended recipient, renders `TransferAccept`. Auth required via proxy.ts guard. Invalid/wrong-user tokens → 404. Expired tokens show expired message. |

## Avatar Upload API

`POST /api/shops/avatar`

- Requires `requireShopPermission(request, 'shop_settings', 'full')` — validates via `X-Nessi-Context` header
- Accepts `file` (image) + `shopId` in `multipart/form-data`
- Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- Processes with `sharp`: resizes to 200x200, converts to WebP at 80% quality
- Uses admin client for storage upload (bypasses RLS; ownership verified in handler)
- Stores at `shops/{shopId}/avatar.webp` in the `profile-assets` bucket
- Returns `{ url: string }`

## Hero Banner Upload API

`POST /api/shops/hero-banner`

- Requires `requireShopPermission(request, 'shop_settings', 'full')` — validates via `X-Nessi-Context` header
- Accepts `file` (image) + `shopId` in `multipart/form-data`
- Validates MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- Processes with `sharp`: resizes to max 1200x400 (fit inside, no upscale), converts to WebP at 85% quality
- Uses admin client for storage upload (bypasses RLS; ownership verified in handler)
- Stores at `shops/{shopId}/hero-banner.webp` in the `profile-assets` bucket
- Returns `{ url: string }`

## Shop Deletion API

`DELETE /api/shops/[id]`

- Requires `requireShopPermission(request, 'shop_settings', 'full', { expectedShopId })` — Owner-only via permission bypass
- Returns 401 (no session), 403 (insufficient permissions), 404 (not found or already soft-deleted)
- Performs best-effort storage cleanup before soft delete:
  - Removes shop assets at `shops/{shopId}/avatar.webp` and hero banner from `profile-assets` bucket
  - Queries shop-owned products → `product_images`, removes files from `listing-images` bucket
- Storage cleanup failures are caught and logged but do not block the soft delete
- Soft-deletes the shop row (`deleted_at = now()`) using the admin client
- Uses `parseStoragePath` helper to extract storage paths from Supabase public URLs
- Pattern mirrors `src/app/api/auth/delete-account/route.ts` (account deletion with storage cleanup)
- Returns `{ success: true }` on 200

## Invite API

`POST /api/shops/[id]/invites` — Create invite

- Requires `requireShopPermission(request, 'members', 'full', { expectedShopId })` — Owner-only
- Accepts `{ email, roleId }` in request body
- Validates email format and role validity (no Owner role invites)
- Enforces 5-member cap (`shop_members` count + pending `shop_invites` count >= `MAX_MEMBERS_PER_SHOP`)
- Checks for duplicate pending invites and existing membership
- Inserts `shop_invites` row with 7-day expiry, sends invite email via Resend
- Email failure is logged but does not block the 201 response
- Returns 201 with invite data, 400 for validation errors, 409 for cap/duplicate/existing member

`GET /api/shops/[id]/invites` — List invites

- Requires `requireShopPermission(request, 'members', 'view', { expectedShopId })` — Owner and Manager
- Returns all invites with inviter names (joined on `members` via `invited_by` FK), ordered by `created_at` DESC

`POST /api/shops/[id]/invites/[inviteId]/resend` — Resend invite

- Requires `requireShopPermission(request, 'members', 'full', { expectedShopId })` — Owner-only
- Regenerates token and resets `expires_at` to 7 days from now
- Resends invite email with new token (invalidates old links)
- Returns 200 with updated invite, 404 if not found, 400 if not pending

`DELETE /api/shops/[id]/invites/[inviteId]` — Revoke invite

- Requires `requireShopPermission(request, 'members', 'full', { expectedShopId })` — Owner-only
- Sets invite status to `revoked`
- Returns 200 with `{ success: true }`, 404 if not found, 400 if not pending

`POST /api/invites/[token]/accept` — Accept invite

- Auth required — returns 401 if no session (note: route is under `/api/invites/`, not `/api/shops/`)
- No `X-Nessi-Context` header required
- Looks up invite by token via admin client (bypasses RLS for read)
- Returns 404 if token not found
- Returns 400 with `{ error, code }` for non-pending invites: `code: 'INVITE_EXPIRED'`, `'INVITE_REVOKED'`, or `'INVITE_ALREADY_ACCEPTED'`
- Enforces `MAX_MEMBERS_PER_SHOP` (409 `MEMBER_LIMIT_REACHED`) and `MAX_SHOPS_PER_MEMBER` (409 `SHOP_LIMIT_REACHED`)
- Returns 409 `ALREADY_MEMBER` if user is already a shop member
- On success: inserts `shop_members` row, sets invite `status = 'accepted'`, returns 200 `{ success: true, shopId, shopName }`

## Roles API

`GET /api/shops/[id]/roles`

- Requires `requireShopPermission(request, 'members', 'view', { expectedShopId })` — any member with at least view access to the members domain can fetch roles
- Returns system roles and shop-specific custom roles for the given shop
- Response: `ShopRole[]` JSON with `AUTH_CACHE_HEADERS`

## Member Role Assignment API

`PATCH /api/shops/[id]/members/[memberId]/role`

- Requires `requireShopPermission(request, 'members', 'full', { expectedShopId })` — Owner-only
- Accepts `{ roleId: string }` in request body
- Validates: roleId exists and belongs to shop (or is system role), cannot assign Owner role, cannot change Owner member's role
- Returns `{ success: true, roleName: string }` on 200
- Returns 400 for invalid roleId, assigning Owner role, or changing Owner's role
- Returns 403 for non-Owner callers
- Returns 401 for unauthenticated requests

## Ownership Transfer API

### Database

`shop_ownership_transfers` table stores transfer requests. Schema: `id` (uuid PK), `shop_id` (FK to shops ON DELETE CASCADE), `from_member_id` (FK to members ON DELETE CASCADE), `to_member_id` (FK to members ON DELETE CASCADE), `token` (uuid UNIQUE), `status` (text: 'pending', 'accepted', 'cancelled'), `created_at` (timestamptz), `expires_at` (timestamptz). Partial unique index on `(shop_id) WHERE status = 'pending'` enforces one pending transfer per shop. RLS: authenticated users can SELECT where they are from/to member.

### Flow

1. **Initiate**: Owner calls `POST /api/shops/{id}/ownership` with `{ newOwnerId }` → creates pending record, sends email with acceptance link to `{APP_URL}/shop/transfer/{token}`. Returns 409 if pending transfer already exists.
2. **View**: Any shop member can check for pending transfer via `GET /api/shops/{id}/ownership-transfer` → returns transfer record or 404.
3. **Cancel**: Owner cancels via `DELETE /api/shops/{id}/ownership-transfer` → sets status to 'cancelled'.
4. **Accept**: Transferee accepts via `POST /api/shops/ownership-transfer/{token}/accept` → atomic ownership swap: `shops.owner_id` updated, new owner promoted to Owner role, old owner demoted to Manager.
5. **Expiry**: Transfers expire after 7 days, checked at query time (`expires_at > now()`). No background job.

### Endpoints

`POST /api/shops/[id]/ownership` — Initiate transfer (refactored from instant swap)

- Requires `requireShopPermission(request, 'members', 'full', { expectedShopId })` — Owner-only
- Accepts `{ newOwnerId }`, validates new owner is a shop member
- Returns 409 if pending transfer already exists
- Sends ownership transfer email via Resend (failure logged, does not block response)
- Returns 200 `{ success: true }`

`GET /api/shops/[id]/ownership-transfer` — Fetch pending transfer

- Requires `requireShopPermission(request, 'members', 'view', { expectedShopId })`
- Returns pending, non-expired transfer or 404

`DELETE /api/shops/[id]/ownership-transfer` — Cancel pending transfer

- Requires `requireShopPermission(request, 'members', 'full', { expectedShopId })` — Owner-only
- Sets status to 'cancelled', returns 404 if none pending

`GET /api/shops/ownership-transfer/[token]` — Fetch transfer by token

- Auth via server Supabase client only — no `X-Nessi-Context` required
- Returns `OwnershipTransferWithDetails` (shop name, member names, expiry)
- Returns 401 (unauthenticated), 403 (wrong user), 410 (expired), 404 (invalid/non-pending)

`POST /api/shops/ownership-transfer/[token]/accept` — Accept transfer

- Auth via server Supabase client only — no `X-Nessi-Context` required
- Validates: token exists (404), pending (404), not expired (410), user is `to_member_id` (403)
- Performs atomic swap: `shops.owner_id`, new owner → Owner role, old owner → Manager role
- Returns 200 `{ success: true, shopId, shopName }`
- Uses `SYSTEM_ROLE_IDS` constants for role assignment

### Email Template

`src/features/email/templates/ownership-transfer.ts` — `ownershipTransferRequest({ shopName, ownerName, token })` returns `EmailTemplate`. CTA links to `{APP_URL}/shop/transfer/{token}`. Includes 7-day expiry notice and safe-to-ignore disclaimer.

## Shared Components Reused

- `InlineEdit` from `@/components/controls/inline-edit`
- `Modal` from `@/components/layout/modal`
- `AvatarUpload` from `@/components/controls/avatar-upload` — accepts configurable `uploadUrl` and `extraFormData` props
- `ImageCropper` from `@/components/controls/image-cropper` — used by `HeroBannerUpload` to let users crop the banner before upload
- `Button` from `@/components/controls/button`
- Toast context from `@/components/indicators/toast/context`

## Key Patterns

- **Direct Supabase access** — Most services use the browser client (`@/libs/supabase/client`) directly, with RLS policies enforcing authorization. Exceptions: `deleteShop()` calls the API route for server-side storage cleanup, and avatar uploads go through `POST /api/shops/avatar` for server-side image processing.
- **Standardized API authorization** — All shop API routes (except `POST /api/shops` for creation) use `requireShopPermission` from `src/libs/shop-permissions.ts` instead of manual `owner_id` checks. Routes with `shopId` in URL params pass `{ expectedShopId }` to prevent privilege escalation. Routes with `shopId` in the request body validate it matches `result.shopId` after the permission check.
- **Database-derived types** — `Shop` type comes from `Database['public']['Tables']['shops']['Row']` and `ShopMember` from `Database['public']['Tables']['shop_members']['Row']`, ensuring type safety with the schema.
- **System-managed fields** — `ShopInsert` and `ShopUpdate` omit fields managed by database triggers or system processes (id, created_at, updated_at, deleted_at).
- **Soft delete** — Shops are soft-deleted via the `deleted_at` column. Queries that list or fetch active shops filter `deleted_at IS NULL`.
- **Slug uniqueness** — Shop slugs are checked for uniqueness against the shared `slugs` table (not just the shops table), since slugs are a cross-entity namespace shared with member slugs. The `generateSlug` utility in `src/features/shared/utils/slug.ts` handles auto-generating a slug from a display name.
- **Avatar upload via API route** — Unlike standard shop CRUD (direct Supabase), avatar uploads go through `POST /api/shops/avatar` for server-side image processing with `sharp`.
- **Server-side deletion with storage cleanup** — Shop deletion uses `DELETE /api/shops/[id]` (server-side API route with admin client) to clean up storage objects before soft-deleting. The `deleteShop()` service function calls this API route via `fetch`. This parallels the account deletion pattern in `src/app/api/auth/delete-account/route.ts`.
- **Shop membership limit** — Members can belong to a maximum of 5 shops (owned + member-of combined). Enforced at the application layer via `checkMemberShopLimit` in `POST /api/shops` (returns 409 `SHOP_LIMIT_REACHED`). Invite creation (#252) and invite acceptance (#253) endpoints should also call this utility before adding a membership. The limit is defined in `constants/limits.ts` — no database-level constraint.
- **Deleted role fallback** — When a member's `role_id` references a deleted custom role (not found in the `useShopRoles` data), both the role badge and the `RoleSelect` dropdown default to "Contributor" (`SYSTEM_ROLE_IDS.CONTRIBUTOR`). This avoids runtime errors and ensures graceful degradation without requiring a database migration.
- **PermissionMatrix reusability** — The `PermissionMatrix` component is designed for reuse. In the current Roles & Permissions page it always renders with `disabled={true}` (system roles are read-only). When custom role editing is implemented, it will render with `disabled={false}` to allow inline permission level changes.

## Invite Auto-Accept (New User Registration)

When an unauthenticated user lands on `/invite/[token]`, the `InviteAccept` component shows both "Sign Up" and "Sign In" buttons. The "Sign Up" button navigates to `?register=true&invite={token}`, which the Navbar detects and stores in component state.

### Flow

1. User clicks "Sign Up" on invite page → URL gets `?register=true&invite={token}`
2. Navbar's `useEffect` detects params → stores `inviteToken` in state, opens register modal, cleans URL
3. `inviteToken` is threaded: Navbar → `RegisterForm` → `OtpInput` (via props)
4. After `verifyOtp()` succeeds in `OtpInput`, if `inviteToken` is present, `acceptShopInvite(inviteToken)` is called
5. On accept success: `onInviteAccepted({ shopName })` callback fires → Navbar shows "You've joined {shopName}!" toast and redirects to `/dashboard`
6. On accept failure: error is silently caught — account creation is never blocked. Navbar shows an error toast suggesting manual acceptance.

### Key Design Decisions

- **URL query params** for token transport — no localStorage, no context providers
- **Invite token lives in Navbar component state** — cleaned up when modal closes or user switches to login
- **Failure is never blocking** — all accept calls are wrapped in try/catch
- **`acceptShopInvite`** is reused from `services/shop-invites.ts` (same function used by the manual accept button)

## Shop Roles

Shop member roles are stored in the `shop_roles` table with a FK from `shop_members.role_id`. Three system roles are seeded with deterministic UUIDs:

| Role        | UUID                                   | Permissions                                                                       |
| ----------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| Owner       | `11111111-1111-1111-1111-111111111101` | Full access to all 6 domains                                                      |
| Manager     | `11111111-1111-1111-1111-111111111102` | Full on listings/pricing/orders/messaging, view on shop_settings, none on members |
| Contributor | `11111111-1111-1111-1111-111111111103` | Full on listings only                                                             |

Use `SYSTEM_ROLE_IDS` from `constants/roles.ts` to reference these UUIDs in application code — never hardcode the UUID strings directly. Use `checkPermission`, `hasAccess`, `hasFullAccess`, and `meetsLevel` from `utils/check-permission.ts` to check a member's effective permission level for a feature — never hardcode permission logic for specific roles.

System roles have `shop_id IS NULL` and `is_system = true`. Future custom roles will have a `shop_id` FK to a specific shop. RLS allows all authenticated users to read system roles; custom roles are only visible to members of that shop.

## Server-Side Permission Middleware

API routes that require shop-level authorization use `requireShopPermission` from `src/libs/shop-permissions.ts`. This replaces manual `owner_id` checks with role-based permission checking.

### Usage Pattern

```ts
import { requireShopPermission } from '@/libs/shop-permissions';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const result = await requireShopPermission(request, 'members', 'full', {
    expectedShopId: shopId,
  });
  if (result instanceof NextResponse) return result;

  const { user, shopId: contextShopId, member } = result;
  // ... route logic
}
```

### How It Works

1. Authenticates via server Supabase client (`getUser()`) — returns 401 if no session
2. Parses `X-Nessi-Context` header (format: `shop:{shopId}`) — returns 403 if missing/invalid
3. Validates `expectedShopId` matches the context header shopId (prevents privilege escalation) — returns 403 on mismatch
4. Queries `shop_members` joined with `shop_roles` via admin client (bypasses RLS)
5. Owner bypass: `is_system === true && slug === 'owner'` always passes
6. Permission check: uses `meetsLevel()` to compare user's level against required level

### Key Types

- `ShopPermissionResult` — success return: `{ user, shopId, member }` where `member` includes typed `shop_roles`
- `RequireShopPermissionOptions` — `{ expectedShopId?: string }` for URL param validation
- Return type is `Promise<NextResponse | ShopPermissionResult>` — use `instanceof NextResponse` to discriminate

### Important

- Always pass `{ expectedShopId: shopId }` when the route has a shop ID in the URL params — this prevents a caller from having context for Shop A but operating on Shop B
- The helper is stateless — no caching across requests
- Owner bypass uses the role's `is_system` + `slug` fields, NOT `shops.owner_id`
