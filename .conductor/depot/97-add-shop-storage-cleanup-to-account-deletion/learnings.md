# Learnings — #97

## Phase 1

- Shop avatars are stored at `avatars/shop-{shopId}.webp` — confirmed from `src/features/shops/CLAUDE.md`
- Hero banner upload isn't implemented yet but the schema field `hero_banner_url` exists — cleanup handles it proactively
- Shop product images are stored under the **uploader's** user ID path (`product-images/{uploader_user_id}/{timestamp}.webp`), not under a shop-specific folder. Must query through `products.shop_id` → `product_images.product_id` → `image_url` to find them
- The `product_images` and `product-images` bucket have different naming: table uses underscore, bucket uses hyphen
