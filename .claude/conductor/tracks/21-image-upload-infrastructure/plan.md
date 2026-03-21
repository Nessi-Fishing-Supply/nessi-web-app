# Implementation Plan: #21 — Image upload infrastructure upgrade

## Overview
4 phases, 16 total tasks
Estimated scope: large

## Phase 1: Listings feature scaffold and types
**Goal:** Create the `src/features/listings/` feature directory with types, CLAUDE.md, and the upload service function so subsequent phases have a foundation to build on.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create listings feature directory structure and CLAUDE.md
Create the `src/features/listings/` directory tree following the established pattern from `src/features/products/` and `src/features/shops/`. Include subdirectories for types, services, hooks, and components, plus a CLAUDE.md documenting the feature.
**Files:** `src/features/listings/CLAUDE.md`, `src/features/listings/types/`, `src/features/listings/services/`, `src/features/listings/hooks/`, `src/features/listings/components/`
**AC:** The directory structure exists and CLAUDE.md documents the listing photos architecture, referencing the `listing_photos` table schema and the upload API route.

### Task 1.2: Define ListingPhoto types derived from database schema
Create types derived from `Database['public']['Tables']['listing_photos']` following the pattern in `src/features/products/types/product.ts` and `src/features/shops/types/shop.ts`. Include `ListingPhoto` (Row), `ListingPhotoInsert` (Insert minus system fields), and `ListingPhotoUpdate`. Also define an `UploadResult` type for the API response (`{ url: string; thumbnailUrl: string }`).
**Files:** `src/features/listings/types/listing-photo.ts`
**AC:** Types compile cleanly. `ListingPhoto` maps to `listing_photos` Row. `UploadResult` has `url` and `thumbnailUrl` string fields. `pnpm typecheck` passes.

### Task 1.3: Create listing photo upload service function
Create a client-side service function `uploadListingPhoto(file: File, listingId: string)` that POSTs FormData to `/api/listings/upload` and returns an `UploadResult`. Follow the pattern in `src/features/products/services/product.ts` (`uploadProductImage`), but use the `post` helper from `@/libs/fetch` with FormData (the fetch utility already handles FormData by not setting Content-Type). Also create `deleteListingPhoto(imageUrl: string, thumbnailUrl: string)` that DELETEs via `/api/listings/upload/delete`.
**Files:** `src/features/listings/services/listing-photo.ts`
**AC:** Service functions compile. `uploadListingPhoto` sends FormData with `file` and `listingId` fields to the correct endpoint. `deleteListingPhoto` sends a DELETE request with the URLs. `pnpm typecheck` passes.
**Reuses:** `src/libs/fetch.ts` (`post`, `del`)

## Phase 2: Upload and delete API routes
**Goal:** Implement the server-side upload route with Sharp processing (HEIC support, thumbnail generation, WebP output) and a delete route for removing photos from storage.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 2.1: Create the listings upload API route with Sharp processing
Create `POST /api/listings/upload` following the pattern in `src/app/api/products/upload/route.ts` but with these differences: (1) MIME validation includes `image/heic` and `image/heif` in addition to JPEG/PNG/WebP, (2) 20MB file size limit, (3) Sharp imported dynamically inside the handler (`const sharp = (await import('sharp')).default`) to avoid edge runtime issues, (4) resize to max 2000px on longest edge with `fit: 'inside'` and `withoutEnlargement: true`, (5) WebP compression targeting under 400KB (start at quality 80, the `effort` parameter can help), (6) generate a 400x400 thumbnail with `fit: 'cover'`, (7) store main image at `listings/{listing_id}/{uuid}.webp` and thumbnail at `listings/{listing_id}/thumbs/{uuid}.webp` in the `product-images` bucket, (8) return `{ url, thumbnailUrl }`. Use `crypto.randomUUID()` for the uuid. Auth check via `supabase.auth.getUser()`. Explicitly set `export const runtime = 'nodejs'` to prevent edge runtime selection.
**Files:** `src/app/api/listings/upload/route.ts`
**AC:** Route compiles. Returns 401 without auth. Returns 400 for files over 20MB. Returns 400 for non-image MIME types (e.g., PDF). Returns 200 with `{ url, thumbnailUrl }` for valid JPEG upload. The `url` image is WebP, max 2000px longest edge. The `thumbnailUrl` image is 400x400 WebP. `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 2.2: Create the listings upload delete API route
Create `DELETE /api/listings/upload/delete` that accepts a JSON body with `{ imageUrl: string, thumbnailUrl: string }`, extracts the storage paths from the public URLs (parse the path after `/storage/v1/object/public/product-images/`), and deletes both objects from the `product-images` bucket. Auth check required. Follow the `parseStoragePath` pattern used in shop deletion (`src/app/api/shops/[id]/route.ts`).
**Files:** `src/app/api/listings/upload/delete/route.ts`
**AC:** Route compiles. Returns 401 without auth. Returns 400 if URLs are missing. Returns 200 on successful deletion. Handles missing storage objects gracefully (log warning, don't fail). `pnpm build` passes.
**Expert Domains:** supabase, nextjs

### Task 2.3: Add explicit Node.js runtime config to upload route
Ensure the upload route file includes `export const runtime = 'nodejs'` at the top level and does NOT use any edge-incompatible patterns. Verify Sharp dynamic import works by confirming `pnpm build` succeeds without "Dynamic server usage" or edge runtime errors.
**Files:** `src/app/api/listings/upload/route.ts` (same file as 2.1 — this task is a verification step; if 2.1 already includes the runtime export, this task just confirms the build)
**AC:** `pnpm build` passes with no warnings about Sharp or edge runtime. The route file has `export const runtime = 'nodejs'`.

## Phase 3: Install dnd-kit and build photo manager component
**Goal:** Install drag-and-drop dependencies and build the core photo manager component with upload, reorder, delete, and all interactive states.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 3.1: Install @dnd-kit packages
Install `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` as production dependencies using pnpm.
**Files:** `package.json`, `pnpm-lock.yaml`
**AC:** All three packages are listed in `dependencies` in `package.json`. `pnpm build` passes.

### Task 3.2: Create the photo-thumbnail subcomponent
Create `src/features/listings/components/photo-manager/photo-thumbnail.tsx` — a `'use client'` component that renders a single photo tile in the grid. Props: `photo: ListingPhoto`, `index: number`, `isUploading: boolean`, `uploadProgress: number`, `hasError: boolean`, `onRetry: () => void`, `onDelete: () => void`, `isCover: boolean`, `dragAttributes` and `dragListeners` (from dnd-kit's `useSortable`). The tile shows: (1) the thumbnail image via `next/image` with `fill` layout and `sizes="80px"`, (2) a progress bar overlay when `isUploading`, (3) a red border with retry icon when `hasError`, (4) a "Cover" badge (using the existing Pill component from `@/components/indicators/pill`) when `isCover` (position 0), (5) a delete button (X icon from react-icons). Tile size: 80x80 mobile, 120x120 desktop via `@include breakpoint(md)`. All interactive elements must be 44x44px minimum tap target.
**Files:** `src/features/listings/components/photo-manager/photo-thumbnail.tsx`
**AC:** Component compiles. Renders `next/image` with `fill` and `sizes`. Shows progress bar when uploading. Shows error state with retry. Shows cover badge on position 0. Delete button has `aria-label="Delete photo"`. `pnpm typecheck` passes.
**Reuses:** `src/components/indicators/pill/` (for Cover badge)
**Expert Domains:** nextjs, scss

### Task 3.3: Create the photo manager SCSS module
Create mobile-first styles for the photo manager grid and its child elements. Base styles (mobile): 80x80 tiles in a CSS grid with `grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))`, gap using `--space-xs`. At `md` breakpoint: 120x120 tiles with `minmax(120px, 1fr)`. The drop zone uses dashed border with `--color-neutral-300`, transitions to solid `--color-primary-500` on drag-over. Progress bar uses `--color-primary-500` background. Error state uses `--color-error-500` border. Cover badge positioned absolute top-left. Delete button positioned absolute top-right. Bottom sheet styles for mobile photo source selection (slide-up animation with `--transition-normal`).
**Files:** `src/features/listings/components/photo-manager/photo-manager.module.scss`
**AC:** Styles compile. Mobile-first with `@include breakpoint(md)` for desktop sizes. Uses only design tokens (no hardcoded hex/px for colors/spacing). `pnpm lint:styles` passes.
**Expert Domains:** scss

### Task 3.4: Create the photo manager main component
Create `src/features/listings/components/photo-manager/index.tsx` — a `'use client'` component. Props: `listingId: string`, `photos: ListingPhoto[]`, `onPhotosChange: (photos: ListingPhoto[]) => void`, `maxPhotos?: number` (default 12), `minPhotos?: number` (default 2). Internal state tracks uploads in progress (Map of temp-id to progress/error). Features: (1) Drag-and-drop zone when no photos — full-width with icon and "Drag photos here or tap to upload" text. Clicking opens a hidden file input with `accept="image/jpeg,image/png,image/webp,image/heic,image/heif"` and `multiple`. (2) On file selection, create temporary entries with uploading state, call `uploadListingPhoto` for each file, update progress via XHR (or use the service function and show indeterminate progress), on success replace temp entry with real `ListingPhoto` data and call `onPhotosChange`. (3) Reorderable grid using `DndContext` and `SortableContext` from `@dnd-kit/core` and `@dnd-kit/sortable`, with `closestCenter` collision detection. On drag end, reorder the photos array and call `onPhotosChange` with updated positions. (4) An "Add more" button (shown when photos.length > 0 and < maxPhotos, hidden at limit). (5) Delete handler that shows a confirmation popover/dialog before removing. (6) Failed upload retry: on error, show retry icon, retry up to 3 times then show error message. (7) Minimum photos indicator: subtle text "At least {minPhotos} photos recommended" shown when below minimum. (8) Mobile: detect touch device, on "Add" tap show a bottom sheet modal (using the existing Modal component pattern — portal, focus trap, ESC close) with two options: "Take photo" (file input with `capture="environment"`) and "Choose from library" (standard file input). Use `react-icons` for camera and gallery icons.
**Files:** `src/features/listings/components/photo-manager/index.tsx`
**AC:** Component compiles as `'use client'`. Accepts documented props. Renders drop zone when empty. File input accepts JPEG/PNG/WebP/HEIC. Dragging reorders and calls `onPhotosChange`. Add button hidden at `maxPhotos`. Delete shows confirmation. Cover badge on position 0. Mobile bottom sheet for photo source. `pnpm typecheck` passes.
**Reuses:** `src/components/layout/modal/` (for mobile bottom sheet), `src/features/listings/services/listing-photo.ts`
**Expert Domains:** nextjs, scss, state-management

### Task 3.5: Create useListingPhotos Tanstack Query hook
Create a mutation hook `useUploadListingPhoto()` in `src/features/listings/hooks/use-listing-photos.ts` that wraps `uploadListingPhoto` from the service layer. Also create `useDeleteListingPhoto()` mutation hook wrapping `deleteListingPhoto`. Follow the pattern in `src/features/products/hooks/use-products.ts` but using `useMutation` instead of `useQuery`. The upload mutation should accept `{ file: File, listingId: string }` and return `UploadResult`. The delete mutation should accept `{ imageUrl: string, thumbnailUrl: string }`.
**Files:** `src/features/listings/hooks/use-listing-photos.ts`
**AC:** Hooks compile. `useUploadListingPhoto` returns a Tanstack Query mutation. `useDeleteListingPhoto` returns a mutation. Both use the service functions. `pnpm typecheck` passes.
**Expert Domains:** state-management

## Phase 4: Polish, accessibility, and integration readiness
**Goal:** Add accessibility attributes, loading/error edge cases, and ensure the full feature passes all quality gates.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm format:check`

### Task 4.1: Add comprehensive accessibility to photo manager
Audit and enhance accessibility across all photo manager components: (1) Drop zone: `role="button"`, `aria-label="Upload photos"`, keyboard activation (Enter/Space triggers file input), `tabIndex={0}`. (2) Photo grid: `role="list"`, each tile `role="listitem"`. (3) Sortable tiles: `aria-roledescription="sortable"`, `aria-label="Photo {position + 1} of {total}. {isCover ? 'Cover photo.' : ''} Press space to pick up."`. (4) Delete button: `aria-label="Delete photo {position + 1}"`. (5) Retry button: `aria-label="Retry upload"`. (6) Progress bar: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Upload progress"`. (7) Cover badge: `aria-hidden="true"` (decorative, position info is in the tile's aria-label). (8) Mobile bottom sheet: `aria-label="Choose photo source"`. (9) Minimum photos indicator: `role="status"` with `aria-live="polite"`. (10) All interactive elements: visible `:focus-visible` outline, 44x44px minimum tap target.
**Files:** `src/features/listings/components/photo-manager/index.tsx`, `src/features/listings/components/photo-manager/photo-thumbnail.tsx`, `src/features/listings/components/photo-manager/photo-manager.module.scss`
**AC:** All interactive elements have appropriate ARIA attributes. Drop zone is keyboard-activatable. Progress bar has progressbar role. Delete and retry buttons have descriptive aria-labels. Focus indicators visible on all interactive elements. `pnpm build` passes.
**Expert Domains:** scss

### Task 4.2: Handle upload edge cases and error states
Ensure robust error handling: (1) If the upload API returns 400 (file too large or invalid type), show a toast notification using the existing toast context (`@/components/indicators/toast/context`). (2) Network errors during upload show the retry state on the thumbnail. (3) After 3 failed retries, show "Upload failed" text below the thumbnail and a toast. (4) If the user tries to add more than `maxPhotos`, the file input should limit selection or show a toast. (5) Deleting a photo that fails to delete from storage should still remove it from the local state (optimistic) with a warning toast. (6) Concurrent uploads: allow up to 3 simultaneous uploads, queue the rest.
**Files:** `src/features/listings/components/photo-manager/index.tsx`
**AC:** Toast shown on invalid file type or size. Retry state after network error. 3 retries max then error message. Cannot exceed maxPhotos. Delete is optimistic. `pnpm build` passes.
**Reuses:** `src/components/indicators/toast/context.tsx`

### Task 4.3: Export listings feature public API
Create barrel exports for the listings feature so consuming code (Ticket 5's create wizard, Ticket 7's edit wizard) can import cleanly. Export `ListingPhoto`, `ListingPhotoInsert`, `UploadResult` types, `uploadListingPhoto` and `deleteListingPhoto` services, `useUploadListingPhoto` and `useDeleteListingPhoto` hooks, and the `PhotoManager` component.
**Files:** `src/features/listings/index.ts`
**AC:** All public types, services, hooks, and the PhotoManager component are re-exported from `src/features/listings/index.ts`. Import paths work: `import { PhotoManager } from '@/features/listings'`. `pnpm typecheck` passes.

### Task 4.4: Run full quality gate and fix any issues
Run the complete CI quality gate: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm format:check`. Fix any errors or warnings that arise from the new code. Ensure no regressions in existing code.
**Files:** Any files that need fixes from lint/typecheck/format violations.
**AC:** All five commands pass with zero errors. No new warnings introduced.
