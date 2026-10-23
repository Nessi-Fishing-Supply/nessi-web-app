# Implementation Plan: #319 — Messaging — Image and media attachment support

## Overview

4 phases, 17 total tasks
Estimated scope: large

## Phase 1: Database migration, storage bucket, and types

**Goal:** Add the `image` value to the `message_type` enum, create the `message-images` Supabase Storage bucket with RLS policies, and extend TypeScript types to support image message metadata.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Add `image` to the `message_type` database enum

Run a Supabase migration to add `'image'` to the existing `message_type` enum. This is a non-destructive ALTER TYPE ... ADD VALUE operation.
**Files:** SQL migration via MCP
**AC:** Running `SELECT unnest(enum_range(NULL::message_type))` returns all existing values plus `'image'`
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.2: Create `message-images` storage bucket with RLS policies

Create a new public Supabase Storage bucket named `message-images`. Path pattern: `threads/{thread_id}/{message_id}/{uuid}.webp`. Add RLS policies: (1) INSERT — authenticated users can upload only to threads they participate in (join check against `message_thread_participants`), (2) SELECT — authenticated users can read only from threads they participate in.
**Files:** Storage bucket + RLS policies via MCP
**AC:** Bucket `message-images` exists and is public. Only thread participants can upload and read objects within their thread paths. Unauthenticated users and non-participants are denied.
**Expert Domains:** supabase
**MCP:** supabase

### Task 1.3: Regenerate database types and extend messaging TypeScript types

Run `pnpm db:types` to pull the updated `message_type` enum into `src/types/database.ts`. Add an `ImageAttachment` type and `ImageMessageMetadata` type to the messaging types. The `MessageType` union in `src/features/messaging/types/message.ts` will automatically include `'image'` after type regeneration since it derives from the database enum.
**Files:** `src/types/database.ts` (regenerated), `src/features/messaging/types/message.ts`
**AC:** `MessageType` includes `'image'`. `ImageAttachment` type has `{ url: string; width: number; height: number; alt?: string }`. `ImageMessageMetadata` type has `{ images: ImageAttachment[] }`. Types compile without errors.
**Expert Domains:** supabase

### Task 1.4: Create moderation stub utility

Create a pass-through moderation stub that can be replaced when #318 (platform-wide content moderation) lands. The function accepts an image buffer and returns a scan result indicating pass/fail. For now it always passes. Include a prominent TODO comment marking where the real image-scanner integration hooks in.
**Files:** `src/features/messaging/utils/image-moderation.ts`
**AC:** `scanImage(buffer: Buffer)` returns `Promise<{ passed: boolean; reason?: string }>` and always resolves with `{ passed: true }`. TODO comment references issue #318. Function is exported and importable.
**Expert Domains:** nextjs

## Phase 2: Upload API route and client service

**Goal:** Build the server-side image upload endpoint and client-side service function for uploading images in message threads.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint`

### Task 2.1: Create image upload API route

Create `POST /api/messages/threads/[thread_id]/upload` following the existing listing upload pattern. The route: (1) authenticates via Supabase server client, (2) verifies the user is a participant in the thread, (3) validates MIME type (JPEG/PNG/WebP/GIF) and 5MB file size limit, (4) accepts up to 4 files per request via FormData, (5) resizes each image with Sharp (max 1200x1200, `fit: inside`, `withoutEnlargement: true`), (6) converts to WebP at 80% quality, (7) calls the moderation stub from Task 1.4 (pass-through for now), (8) uploads to `message-images` bucket at path `threads/{thread_id}/{message_id}/{uuid}.webp` (generate a message_id UUID upfront), (9) inserts a single message row with `type: 'image'` and `metadata: { images: [...] }` containing the URL, width, and height of each processed image, (10) returns the created message. Use the `AUTH_CACHE_HEADERS` pattern. Add the required API description comment above the handler.
**Files:** `src/app/api/messages/threads/[thread_id]/upload/route.ts`
**AC:** POST accepts FormData with 1-4 image files, validates auth + participation + MIME + size, processes via Sharp, stores in `message-images` bucket, inserts a message with `type: 'image'` and image metadata, returns 201 with the message. Returns 401/403/400/422/500 for respective error cases.
**Expert Domains:** supabase, nextjs

### Task 2.2: Add client-side upload service function

Add an `uploadImages` function to the messaging client service. It constructs a FormData with the selected files and POSTs to `/api/messages/threads/{threadId}/upload`. Returns the created `MessageWithSender`.
**Files:** `src/features/messaging/services/messaging.ts`
**AC:** `uploadImages(threadId: string, files: File[])` sends FormData POST request and returns `Promise<MessageWithSender>`. Uses the existing `post` helper from `@/libs/fetch` which already handles FormData.
**Expert Domains:** nextjs

### Task 2.3: Create `useSendImages` mutation hook

Create a Tanstack Query mutation hook following the `useSendMessage` pattern. It calls `uploadImages`, performs optimistic cache update (prepends a placeholder image message to the first page), rolls back on error, and invalidates messages + threads query keys on settle.
**Files:** `src/features/messaging/hooks/use-send-images.ts`
**AC:** Hook accepts `{ threadId, onSuccess?, onError? }`. Mutation function accepts `File[]`. Optimistic message with `type: 'image'` is prepended to cache. Cache is rolled back on error. Query keys `['messages', 'threads', threadId, 'messages']` and `['messages', 'threads']` are invalidated on settle.
**Expert Domains:** state-management

### Task 2.4: Export new types, service, and hook from barrel

Add `ImageAttachment`, `ImageMessageMetadata` type exports, `uploadImages` service export, and `useSendImages` hook export to the messaging barrel file.
**Files:** `src/features/messaging/index.ts`
**AC:** All new public APIs are importable from `@/features/messaging`. Build passes.

## Phase 3: UI components — compose bar photo action, image preview, image node, and lightbox

**Goal:** Build the user-facing UI: photo selection in the compose bar, pre-send preview strip, inline image rendering in threads, and full-screen lightbox.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles`

### Task 3.1: Create image preview strip component

Create a compose-level component that shows selected image thumbnails before sending. Displays 1-4 image thumbnails in a horizontal strip with individual remove buttons. Shows a send button to submit the images. Renders above the compose bar when images are selected.
**Files:** `src/features/messaging/components/image-preview-strip/index.tsx`, `src/features/messaging/components/image-preview-strip/image-preview-strip.module.scss`
**AC:** Component renders thumbnails from `File[]` using `URL.createObjectURL`. Each thumbnail has a remove button with `aria-label="Remove image"`. A "Send" button triggers the `onSend` callback. Displays count indicator (e.g., "2/4"). Mobile-first responsive layout. All interactive elements meet 44x44px minimum tap target.
**Expert Domains:** scss

### Task 3.2: Add "Send Photo" action to compose bar and wire image selection

Add a "Send Photo" menu item to the existing `+` action menu in ComposeBar. When tapped, it opens a native file picker (`<input type="file" accept="image/*" multiple>`) limited to 4 files. On mobile, include the `capture` attribute option so the camera is offered. When files are selected, show the ImagePreviewStrip. When the user confirms send, call `useSendImages`. While uploading, show a loading state on the compose bar. On mobile, add `capture="environment"` as an additional option.
**Files:** `src/features/messaging/components/compose-bar/index.tsx`, `src/features/messaging/components/compose-bar/compose-bar.module.scss`
**AC:** The `+` menu includes a "Send Photo" item with a camera/image icon. Tapping it opens the file picker accepting image MIME types. Selected files (max 4) populate the ImagePreviewStrip above the compose bar. Sending invokes `useSendImages`. The compose bar shows `aria-busy` during upload. File picker resets after successful send. Disabled state is respected.
**Expert Domains:** scss

### Task 3.3: Create inline image node component for thread rendering

Create an `ImageNode` component that renders image messages inline in the thread. Displays image thumbnails in a grid layout (1 image = full width, 2 = side by side, 3-4 = 2x2 grid). Each thumbnail uses `next/image` with `fill` layout and `object-fit: cover`. Clicking an image opens the lightbox (via `onImageClick` callback prop). Add `alt` text from metadata or a sensible default.
**Files:** `src/features/messaging/components/message-node/image-node.tsx`, `src/features/messaging/components/message-node/message-node.module.scss` (extend)
**AC:** Component renders 1-4 images in an adaptive grid. Uses `next/image` with `fill` and `sizes` appropriate to grid layout. Images are clickable (button or link role). Provides `alt` text. Responsive: thumbnails scale appropriately on mobile vs desktop. Grid layout: 1 image is full-width, 2 images are 50/50, 3-4 images are 2x2.
**Expert Domains:** scss, nextjs

### Task 3.4: Create image lightbox component

Create a full-screen lightbox overlay for viewing images at full resolution. Uses the existing `Modal` component from `src/components/layout/modal/` as the portal/overlay base but with custom dark-background styling for image viewing. Features: displays the tapped image at full resolution using `next/image`, swipe/arrow navigation when multiple images exist, close button, Escape to close, pinch-to-zoom on mobile (CSS `touch-action` based). Body scroll is locked while open.
**Files:** `src/features/messaging/components/image-lightbox/index.tsx`, `src/features/messaging/components/image-lightbox/image-lightbox.module.scss`
**Reuses:** `src/components/layout/modal/` (portal pattern, focus trap, Escape handling)
**AC:** Lightbox opens with an image displayed at full resolution. Left/right arrows and swipe gestures navigate between images. Close button and Escape key dismiss the lightbox. Focus is trapped within the lightbox. `next/image` is used with appropriate `sizes`. Dark overlay background. `aria-label` on the dialog. Mobile-first layout fills the viewport.
**Expert Domains:** scss

### Task 3.5: Wire image node and lightbox into MessageThread component

Extend the `MessageThread` component to handle `message.type === 'image'`. Extract image metadata from `message.metadata`, render the `ImageNode` component, and manage lightbox open/close state. Image messages should render in the same sent/received bubble row pattern as text messages (right-aligned for sent, left-aligned with avatar for received).
**Files:** `src/features/messaging/components/message-thread/index.tsx`, `src/features/messaging/components/message-thread/message-thread.module.scss` (extend if needed)
**AC:** Image messages render inline in the correct sent/received position. Tapping an image opens the lightbox with all images from that message. Date separators work correctly around image messages. The lightbox is rendered once per thread (not per message).
**Expert Domains:** scss

## Phase 4: Polish, edge cases, and account deletion cleanup

**Goal:** Handle loading/error states for image uploads, add the `message-images` bucket cleanup to account deletion, and update the CLAUDE.md documentation.
**Verify:** `pnpm build && pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm format:check`

### Task 4.1: Add upload progress and error handling to compose bar

Show a progress indicator in the ImagePreviewStrip while images are uploading. Handle errors with a toast or inline error message. If upload fails, keep the selected images so the user can retry. Validate file sizes client-side before upload (5MB per file) and show an error if exceeded. Validate max 4 images and show an error if the user selects more.
**Files:** `src/features/messaging/components/compose-bar/index.tsx`, `src/features/messaging/components/image-preview-strip/index.tsx`
**AC:** Selecting >4 images shows an error and truncates to 4. Files >5MB are rejected with a user-facing error before upload. Upload failures show an error message and preserve selected files for retry. Upload in progress shows a visual loading indicator. Users cannot send another image message while one is in flight.
**Expert Domains:** scss

### Task 4.2: Add `message-images` cleanup to account deletion flow

Extend `DELETE /api/auth/delete-account` to clean up the `message-images` bucket. Before the user is deleted, query all threads the user participated in and delete any stored images from those threads in the `message-images` bucket. Follow the existing cleanup pattern (listing-images, profile-assets).
**Files:** `src/app/api/auth/delete-account/route.ts`
**AC:** Account deletion removes all image files from the `message-images` bucket for threads the user participated in. Existing cleanup logic for other buckets remains intact. Deletion succeeds even if no message images exist.
**Expert Domains:** supabase, nextjs

### Task 4.3: Handle image messages in thread list preview

Update the thread list row to show a sensible preview for image messages. When the last message in a thread is an image message, display a camera icon and "Sent a photo" (or "You sent a photo") as the preview text instead of empty/null content.
**Files:** `src/features/messaging/components/thread-list/thread-row.tsx`
**AC:** Thread rows where the last message is `type: 'image'` display an appropriate preview text with a camera icon. Text truncation and styling remain consistent with text message previews.
**Expert Domains:** scss

### Task 4.4: Update messaging CLAUDE.md documentation

Update the messaging feature CLAUDE.md to document: the new `image` message type, `ImageAttachment` and `ImageMessageMetadata` types, `uploadImages` service function, `useSendImages` hook, `image-moderation.ts` utility (stub), `ImageNode` and `ImageLightbox` and `ImagePreviewStrip` components, the `message-images` storage bucket path pattern and RLS, the upload API route, and the account deletion cleanup addition.
**Files:** `src/features/messaging/CLAUDE.md`
**AC:** CLAUDE.md includes complete documentation for all new types, services, hooks, components, utils, API routes, and storage patterns added in this ticket. Documentation follows existing format and conventions.
