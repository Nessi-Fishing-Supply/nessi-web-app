# Products Feature

## Overview

Product management feature with CRUD operations, image uploads via Supabase Storage, and product display components.

## Architecture

- **services/product.ts** — Client-side product API functions (CRUD + image upload via fetch wrapper)
- **services/product-server.ts** — Server-side product queries via Supabase server client (for server components, e.g., public profile/shop pages)
- **types/product.ts** — Database-derived types (Product, ProductImage, ProductWithImages)
- **hooks/use-products.ts** — Tanstack Query hooks (`useAllProducts`, `useUserProducts`)

## API Routes

Product API routes live in `src/app/api/products/`:

- `route.ts` — GET all products, POST create product
- `[id]/route.ts` — GET/PUT/DELETE single product
- `user/route.ts` — GET current user's products
- `upload/route.ts` — POST image upload: validates MIME type + 5MB limit, resizes via Sharp (max 1200x1200, `fit: inside`), converts to WebP 85%, stores to Supabase Storage

## Components

- **product-card** — Product display card with image carousel (Swiper), pricing, reviews, favorites
- **add-product-form** — Form for creating new products with multi-image upload
- **product-reviews** — Star rating display component
- **favorite** — Heart toggle button component

## Key Patterns

- **Image pipeline:** Upload validates → Sharp resizes to max 1200x1200 → WebP 85% → stored as `.webp` in `product-images` bucket → rendered via `next/image` with `fill` + `sizes`
- Product card uses `next/image` with `fill` layout inside Swiper slides — parent `.slide` div has `position: relative; width: 100%; height: 100%`
- Product detail uses `next/image` with `width`/`height` + `sizes` + `priority` on first image (LCP)
- **Never use raw `<img>` for product images** — always `next/image` for automatic WebP/AVIF srcset via Vercel
- Product types derived from Supabase database schema via `@/types/database`
- Data fetching uses Tanstack Query hooks, not `useEffect` + `useState`
