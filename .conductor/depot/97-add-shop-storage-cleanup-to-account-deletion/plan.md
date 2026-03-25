# Implementation Plan: #97 — Add shop storage cleanup to account deletion route

## Overview

1 phase, 2 total tasks
Estimated scope: small

## Phase 1: Add shop storage cleanup to account deletion

**Goal:** Extend `cleanupUserStorage()` to remove all storage objects associated with shops owned by the deleting user (shop avatars, hero banners, and shop product images).
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 1.1: Add helper to parse storage paths from Supabase public URLs

Add a `parseStoragePath(bucketName: string, publicUrl: string): string | null` helper function at the top of the delete-account route file. This function extracts the storage object path from a full Supabase Storage public URL (e.g., from `https://xxx.supabase.co/storage/v1/object/public/product-images/user-id/123.webp` it extracts `user-id/123.webp`). This is needed because `product_images.image_url` and `shops.hero_banner_url` store full public URLs, but the Storage API `remove()` requires relative object paths within a bucket.
**Files:** `src/app/api/auth/delete-account/route.ts`
**AC:**

- Function correctly extracts the object path after `/storage/v1/object/public/{bucketName}/` from a Supabase public URL
- Returns `null` for URLs that don't match the expected pattern
- No new dependencies introduced
  **Expert Domains:** supabase, nextjs

### Task 1.2: Extend cleanupUserStorage to clean up shop-owned storage objects

Add shop storage cleanup logic to `cleanupUserStorage()` after the existing member cleanup. The function should: (1) Query all shops where `owner_id = userId` using the admin client, selecting `id` and `hero_banner_url`. (2) For each shop, delete `avatars/shop-{shopId}.webp` from the `avatars` bucket. (3) For each shop with a non-null `hero_banner_url`, parse the storage path using the helper from Task 1.1 and remove it from the appropriate bucket. (4) For each shop, query `products` where `shop_id = shopId`, then query `product_images` for those product IDs, parse `image_url` values to extract storage paths, and batch-remove them from the `product-images` bucket. All shop cleanup must be best-effort (wrapped in try/catch so failures don't block account deletion). The admin client is already available as a parameter.
**Files:** `src/app/api/auth/delete-account/route.ts`
**AC:**

- After account deletion, `avatars/shop-{shopId}.webp` is removed for each shop owned by the deleted user
- All product image files for shop-owned products (queried via `products.shop_id` then `product_images.product_id`) are removed from the `product-images` bucket
- If `hero_banner_url` is set on any owned shop, the referenced file is removed from storage
- Existing member avatar and member product image cleanup still works unchanged
- Storage cleanup failures for shops do not block account deletion (best-effort, errors logged)
- `pnpm build && pnpm lint && pnpm typecheck` pass
- No new dependencies introduced
  **Expert Domains:** supabase, nextjs
