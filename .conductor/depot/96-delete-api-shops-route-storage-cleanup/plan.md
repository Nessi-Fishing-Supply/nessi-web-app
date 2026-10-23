# Implementation Plan: #96 — Create DELETE /api/shops/[id] route with storage cleanup

## Overview

1 phase, 2 total tasks
Estimated scope: small

## Phase 1: Create DELETE API route with storage cleanup

**Goal:** Add a server-side DELETE endpoint that cleans up all shop storage objects (avatar, hero banner, product images) before soft-deleting the shop row
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 1.1: Create DELETE /api/shops/[id]/route.ts with storage cleanup and soft delete

Create the DELETE API route following the established pattern from `src/app/api/auth/delete-account/route.ts`. The route must authenticate the caller via the server Supabase client, verify shop ownership, perform best-effort storage cleanup using the admin client, then soft-delete the shop row.

**Storage cleanup steps (all best-effort, wrapped in try/catch):**

1. Delete shop avatar at `avatars/shop-{shopId}.webp` from the `avatars` bucket
2. If `hero_banner_url` is non-null, parse the storage path using the same `parseStoragePath` pattern from `delete-account/route.ts` and remove from the appropriate bucket
3. Query `products` table for rows where `shop_id` matches, then query `product_images` for those product IDs, parse each `image_url` to extract storage paths, and remove from `product-images` bucket

**Auth and authorization pattern** (from `src/app/api/shops/avatar/route.ts`):

- Use `createClient()` from `@/libs/supabase/server` for session auth (`supabase.auth.getUser()`)
- Use `createAdminClient()` from `@/libs/supabase/admin` for storage operations and the soft-delete update (bypasses RLS)
- Verify `shop.owner_id === user.id` for 403 check
- Filter `deleted_at IS NULL` when fetching shop for 404 check

**Response codes:**

- 401: No authenticated session
- 403: Authenticated but not shop owner
- 404: Shop not found or already soft-deleted
- 500: Soft-delete DB error
- 200: `{ success: true }`

**Files:** `src/app/api/shops/[id]/route.ts` (create)
**AC:**

- DELETE /api/shops/{id} returns 401 if no authenticated session
- Returns 403 if caller is not shop owner
- Returns 404 if shop does not exist or is already soft-deleted
- Removes `avatars/shop-{shopId}.webp` from avatars bucket
- Parses `hero_banner_url` (if non-null) and removes file from storage
- Queries products by `shop_id`, then `product_images` by product IDs, removes all matching files from `product-images` bucket
- Soft-deletes shop row by setting `deleted_at` to current ISO timestamp
- Storage cleanup failures are caught and logged but do not block the soft delete
- `pnpm build && pnpm lint && pnpm typecheck` pass
  **Expert Domains:** supabase, nextjs

### Task 1.2: Update shops feature CLAUDE.md to document the new DELETE endpoint

Add documentation for the new `DELETE /api/shops/[id]` route to `src/features/shops/CLAUDE.md`. Add an entry in the existing documentation pattern covering the endpoint path, authentication requirements, storage cleanup behavior (best-effort), soft-delete semantics, and response codes. Update the "Key Patterns" section to note that shop deletion now uses a server-side API route (not direct Supabase) for storage cleanup, similar to account deletion.

**Files:** `src/features/shops/CLAUDE.md` (update)
**AC:**

- CLAUDE.md documents `DELETE /api/shops/[id]` with auth, ownership check, storage cleanup steps, soft-delete behavior, and response codes
- "Key Patterns" section updated to note server-side deletion route for storage cleanup
- Documentation is consistent with the existing avatar upload API documentation format
  **Expert Domains:** supabase
