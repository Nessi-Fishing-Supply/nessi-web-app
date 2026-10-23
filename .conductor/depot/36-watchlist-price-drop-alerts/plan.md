# Implementation Plan: #36 — Watchlist + Price Drop Alerts

## Overview

4 phases, 19 total tasks
Estimated scope: large

## Phase 1: Database Foundation & Feature Scaffold

**Goal:** Create the `watchers` and `price_drop_notifications` tables with triggers and RLS, scaffold the watchlist feature domain, and regenerate database types.
**Verify:** `pnpm build`

### Task 1.1: Create watchers table, price_drop_notifications table, triggers, and RLS policies

Apply a single Supabase migration that:

1. Creates `watchers` table with columns: `id` (uuid PK), `listing_id` (uuid FK to `listings(id) ON DELETE CASCADE`), `user_id` (uuid FK to `members(id) ON DELETE CASCADE`), `watched_at` (timestamptz DEFAULT now()), `last_notified_price_cents` (integer). UNIQUE constraint on `(listing_id, user_id)`.
2. Creates `price_drop_notifications` table with columns: `id` (uuid PK), `listing_id` (uuid FK to `listings(id) ON DELETE CASCADE`), `old_price_cents` (integer), `new_price_cents` (integer), `processed` (boolean DEFAULT false), `created_at` (timestamptz DEFAULT now()).
3. Creates trigger function `update_watcher_count()` (SECURITY DEFINER): on INSERT increments `listings.watcher_count`, on DELETE decrements (clamped to 0 via GREATEST). Trigger fires AFTER INSERT OR DELETE on `watchers`.
4. Creates trigger function `detect_price_drop()`: on listings UPDATE, when `NEW.price_cents < OLD.price_cents`, inserts a row into `price_drop_notifications`. Trigger fires AFTER UPDATE OF `price_cents` on `listings`.
5. RLS on `watchers`: SELECT for authenticated (`user_id = auth.uid()`), INSERT for authenticated (`user_id = auth.uid()`), DELETE for authenticated (`user_id = auth.uid()`).
6. RLS on `price_drop_notifications`: SELECT/UPDATE for service_role only (cron processes this).
7. Index on `watchers(user_id)` for fast "my watchlist" queries. Index on `price_drop_notifications(processed, created_at)` for cron batch processing.

**MCP:** supabase (apply_migration)
**Files:** Migration SQL (applied via MCP)
**AC:** Tables exist with correct columns, constraints, and RLS. Inserting/deleting a watcher updates `listings.watcher_count`. Updating `listings.price_cents` to a lower value creates a `price_drop_notifications` row.
**Expert Domains:** supabase

### Task 1.2: Regenerate database types

Run `pnpm db:types` to pull the new `watchers` and `price_drop_notifications` tables into `src/types/database.ts`. Verify the generated types include both new tables with correct column types.
**Files:** `src/types/database.ts`
**AC:** `Database['public']['Tables']['watchers']` and `Database['public']['Tables']['price_drop_notifications']` exist in the generated types with correct Row/Insert/Update shapes.
**Expert Domains:** supabase

### Task 1.3: Scaffold watchlist feature domain with CLAUDE.md and types

Create the `src/features/watchlist/` directory structure following the established feature pattern (mirrors `src/features/follows/`). Create `CLAUDE.md` documenting the feature architecture, `types/watcher.ts` with database-derived types (`Watcher`, `WatcherInsert`, `WatchStatus`, `WatchedListing` which extends `ListingWithPhotos` with `watched_at`), and `index.ts` barrel export.
**Files:** `src/features/watchlist/CLAUDE.md`, `src/features/watchlist/types/watcher.ts`, `src/features/watchlist/index.ts`
**AC:** Types compile. `WatchStatus` has `{ is_watching: boolean }`. `WatchedListing` includes `watched_at` field alongside listing data. Barrel exports all types.
**Expert Domains:** nextjs

### Task 1.4: Create watchlist server services

Create `src/features/watchlist/services/watchlist-server.ts` with server-side Supabase queries (using `@/libs/supabase/server`):

- `addWatcherServer(userId, listingId)` — inserts into `watchers`, catches `23505` (duplicate) and returns existing row
- `removeWatcherServer(userId, listingId)` — deletes by `(user_id, listing_id)`, returns `{ success: boolean }`
- `getWatchStatusServer(userId, listingId)` — returns `{ is_watching: boolean }` via `maybeSingle()`
- `getWatchedListingsServer(userId)` — fetches user's watched listings joined with listing data and photos, ordered by `watched_at DESC`, filters `listings.deleted_at IS NULL`
  Follow the pattern from `src/features/follows/services/follow-server.ts`.
  **Files:** `src/features/watchlist/services/watchlist-server.ts`
  **AC:** All four functions compile. Server service uses `createClient` from `@/libs/supabase/server`. Duplicate watch returns gracefully (no error thrown).
  **Expert Domains:** supabase, nextjs

### Task 1.5: Create watchlist client services

Create `src/features/watchlist/services/watchlist.ts` with client-side fetch wrappers (using `@/libs/fetch`):

- `watchListing(listingId)` — POST `/api/watchlist`
- `unwatchListing(listingId)` — DELETE `/api/watchlist?listing_id={id}`
- `getWatchStatus(listingId)` — GET `/api/watchlist/{listing_id}`
- `getWatchedListings()` — GET `/api/watchlist`
  Follow the pattern from `src/features/follows/services/follow.ts`.
  **Files:** `src/features/watchlist/services/watchlist.ts`
  **AC:** All four functions compile. Uses `get`, `post`, `del` from `@/libs/fetch`.
  **Expert Domains:** nextjs

## Phase 2: API Routes & Hooks

**Goal:** Create the API routes for watchlist CRUD and the Tanstack Query hooks with optimistic updates.
**Verify:** `pnpm build`

### Task 2.1: Create watchlist API routes

Create two API route files following the pattern from `src/app/api/follows/route.ts`:

1. `src/app/api/watchlist/route.ts` — GET (returns user's watched listings with listing data), POST (adds watcher for authenticated user, body: `{ listing_id }`), DELETE (removes watcher, query param: `listing_id`). All require auth (401 for unauthenticated). POST returns 201 on success, 409 on duplicate. DELETE returns 200 on success, 404 if not watching. Each handler has a description comment per `src/app/api/CLAUDE.md`.
2. `src/app/api/watchlist/[listing_id]/route.ts` — GET (returns `{ is_watching: boolean }` for authenticated user and specific listing). 401 for unauthenticated.
   Uses `AUTH_CACHE_HEADERS` from `@/libs/api-headers`.
   **Files:** `src/app/api/watchlist/route.ts`, `src/app/api/watchlist/[listing_id]/route.ts`
   **AC:** POST `/api/watchlist` with `{ listing_id }` adds watcher, returns 201. DELETE removes watcher, returns 200. GET `/api/watchlist` returns watched listings array. GET `/api/watchlist/{id}` returns watch status. All return 401 for unauthenticated requests.
   **Expert Domains:** supabase, nextjs

### Task 2.2: Create useWatchStatus hook

Create `src/features/watchlist/hooks/use-watch-status.ts` with a Tanstack Query hook:

- Query key: `['watchlist', 'status', listingId]`
- Calls `getWatchStatus(listingId)` from the client service
- `enabled` guard: only when `listingId` is truthy
  Follow the pattern from `src/features/follows/hooks/use-follow-status.ts`.
  **Files:** `src/features/watchlist/hooks/use-watch-status.ts`
  **AC:** Hook compiles. Returns `{ data: WatchStatus | undefined, isLoading }`. Disabled when `listingId` is falsy.
  **Expert Domains:** state-management

### Task 2.3: Create useWatchToggle hook with optimistic updates

Create `src/features/watchlist/hooks/use-toggle-watch.ts` with a Tanstack Query mutation hook following `src/features/follows/hooks/use-follow-toggle.ts`:

- `mutationFn`: calls `watchListing` or `unwatchListing` based on `isCurrentlyWatching` boolean argument
- `onMutate`: cancels in-flight queries, snapshots previous `WatchStatus`, optimistically sets `is_watching` to inverse
- `onError`: rolls back on failure (except 409/404 which are treated as success)
- `onSettled`: invalidates `['watchlist', 'status', listingId]` and `['watchlist']` query keys
- Accepts `{ listingId, onSuccess?, onError? }` options
  **Files:** `src/features/watchlist/hooks/use-toggle-watch.ts`
  **AC:** Hook compiles. Optimistic update immediately flips `is_watching`. Rollback restores previous state on error. 409/404 treated as success.
  **Expert Domains:** state-management

### Task 2.4: Create useWatchlist hook

Create `src/features/watchlist/hooks/use-watchlist.ts` with a Tanstack Query hook:

- Query key: `['watchlist']`
- Calls `getWatchedListings()` from the client service
- Returns `WatchedListing[]` sorted by `watched_at` DESC (server handles sort)
- Always enabled (auth check happens at API layer)
  **Files:** `src/features/watchlist/hooks/use-watchlist.ts`
  **AC:** Hook compiles. Returns `{ data: WatchedListing[] | undefined, isLoading, isError }`.
  **Expert Domains:** state-management

### Task 2.5: Update barrel export with hooks

Update `src/features/watchlist/index.ts` to export all types, hooks, and the WatchButton component (placeholder — component created in Phase 3).
**Files:** `src/features/watchlist/index.ts`
**AC:** All types and hooks are importable from `@/features/watchlist`.
**Expert Domains:** nextjs

## Phase 3: UI Components & Pages

**Goal:** Build the WatchButton component, integrate it into listing cards and detail page, create the watchlist page, and add the navbar link.
**Verify:** `pnpm build`

### Task 3.1: Create WatchButton component

Create `src/features/watchlist/components/watch-button/index.tsx` and `watch-button.module.scss`. This is a heart icon toggle button that replaces the existing placeholder `Favorite` component on listing cards.

- Uses `useWatchStatus` and `useWatchToggle` internally
- Props: `listingId: string`, `className?: string`
- Auth gate: checks `useAuth().isAuthenticated`. Unauthenticated tap navigates to `?login=true` (opens login modal via navbar's `useSearchParams` listener)
- Icons: `FaHeart` (filled, watched) and `FaRegHeart` (outline, not watched) from `react-icons/fa`
- Toast on watch: `showToast({ type: 'success', message: 'Added to Watchlist', description: "We'll tell you if the price drops." })`
- Toast on unwatch: `showToast({ type: 'success', message: 'Removed from Watchlist', description: 'You will no longer receive alerts.' })`
- ARIA: `aria-label="Add to watchlist"` / `"Remove from watchlist"`, `aria-pressed` reflects state, `aria-busy` during mutation
- SCSS: 44x44px minimum tap target, uses CSS custom property tokens for colors. Heart fills with `var(--color-error-500)` when watched. Positioned absolute top-right when used as overlay.
- `stopPropagation` on click to prevent card navigation
  **Reuses:** `src/components/indicators/toast/context.tsx` (useToast), `src/features/auth/context.tsx` (useAuth)
  **Files:** `src/features/watchlist/components/watch-button/index.tsx`, `src/features/watchlist/components/watch-button/watch-button.module.scss`
  **AC:** Component compiles. Heart toggles between filled/outline with optimistic UI. Unauthenticated tap opens login modal. Toast shown on toggle. 44x44px tap target. Uses CSS custom properties only.
  **Expert Domains:** nextjs, scss, state-management

### Task 3.2: Integrate WatchButton into ListingCard (replace Favorite)

Modify `src/features/listings/components/listing-card/index.tsx` to replace the existing `<Favorite />` component with `<WatchButton listingId={listing.id} />`. Remove the import of `Favorite` from `@/components/controls/favorite`. The WatchButton should be positioned in the same top-right overlay spot in the carousel area using the existing `styles.favorite` class name (or rename to `styles.watchButton`).
**Reuses:** `src/features/watchlist/components/watch-button/` (WatchButton)
**Files:** `src/features/listings/components/listing-card/index.tsx`, `src/features/listings/components/listing-card/listing-card.module.scss`
**AC:** ListingCard renders WatchButton instead of Favorite. Heart toggles correctly on listing cards in grids. No regression in card layout or carousel behavior.
**Expert Domains:** nextjs, scss

### Task 3.3: Integrate WatchButton into listing detail page photo gallery

Modify `src/app/(frontend)/listing/[id]/listing-detail.tsx` to add a `<WatchButton />` overlay on the photo gallery section. Position it in the `galleryColumn` div, top-right corner over the `PhotoGallery` component. Only show when `!isOwnListing` (sellers should not watch their own listings). Pass `listingId={listing.id}`.
**Reuses:** `src/features/watchlist/components/watch-button/` (WatchButton)
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`, `src/app/(frontend)/listing/[id]/listing-detail.module.scss`
**AC:** WatchButton appears top-right of the photo gallery on listing detail page. Hidden for own listings. Heart toggles correctly. Does not interfere with photo tap/lightbox behavior.
**Expert Domains:** nextjs, scss

### Task 3.4: Create watchlist page

Create the `/watchlist` route with:

1. `src/app/(frontend)/watchlist/page.tsx` — Server component that renders the client page component. Exports metadata: `title: 'Watchlist'`.
2. `src/app/(frontend)/watchlist/watchlist-page.tsx` — Client component using `useWatchlist()` hook. Renders a responsive grid of `ListingCard` components (reuses `ListingGrid` from `src/features/listings/components/listing-grid/`). Sold listings rendered with a "Sold" overlay badge (semi-transparent overlay with centered "Sold" text). Loading state: skeleton cards. Empty state: heart icon + "Your watchlist is empty" + "Browse listings" CTA link.
3. `src/app/(frontend)/watchlist/watchlist-page.module.scss` — Mobile-first styles. Sold overlay uses `position: absolute` with `var(--color-neutral-900)` at 60% opacity.
   **Reuses:** `src/features/listings/components/listing-grid/` (ListingGrid), `src/features/listings/components/listing-card/` (ListingCard), `src/features/listings/components/listing-skeleton/` (ListingSkeleton)
   **Files:** `src/app/(frontend)/watchlist/page.tsx`, `src/app/(frontend)/watchlist/watchlist-page.tsx`, `src/app/(frontend)/watchlist/watchlist-page.module.scss`
   **AC:** `/watchlist` renders grid of watched listings sorted by most recently watched. Sold listings show "Sold" overlay. Empty state displays when no watched listings. Loading skeleton shows while fetching. Metadata title is "Watchlist".
   **Expert Domains:** nextjs, scss

### Task 3.5: Protect /watchlist route and add navbar link

1. Modify `src/proxy.ts` to add `/watchlist` to the authenticated-only route check alongside `/dashboard` and `/shop/transfer`. Unauthenticated users visiting `/watchlist` are redirected to `/`.
2. Modify `src/components/navigation/navbar/index.tsx` to add a "Watchlist" `DropdownItem` with `AppLink` in the "My Account" section of the account dropdown, between the "Dashboard" and "Account" links. Use `HiOutlineHeart` icon from `react-icons/hi`.
   **Files:** `src/proxy.ts`, `src/components/navigation/navbar/index.tsx`
   **AC:** Unauthenticated users visiting `/watchlist` are redirected to `/`. "Watchlist" link appears in the navbar dropdown for authenticated users. Link navigates to `/watchlist`.
   **Expert Domains:** nextjs

## Phase 4: Price Drop Emails & Seller Dashboard

**Goal:** Implement the price drop notification pipeline (email template + Vercel Cron) and display watcher counts on the seller dashboard.
**Verify:** `pnpm build`

### Task 4.1: Create price drop email template

Create `src/features/email/templates/price-drop.ts` following the pattern from `src/features/email/templates/invite-to-shop.ts`:

- Interface: `PriceDropParams { listingTitle: string, oldPriceCents: number, newPriceCents: number, listingId: string }`
- Subject: `"{listingTitle} just dropped in price!"`
- Body: heading with listing title, price comparison (old price strikethrough, new price prominent), "View Listing" CTA button linking to `${NEXT_PUBLIC_APP_URL}/listing/${listingId}`, fallback link text
- Uses `emailLayout()` from `layout.ts` and `escapeHtml()` from `utils.ts`
- Uses `formatPrice()` from `@/features/shared/utils/format` for price formatting (cents to dollars)
  **Files:** `src/features/email/templates/price-drop.ts`
  **AC:** Template function compiles. Returns `{ subject, html }` with properly escaped values. Subject includes listing title. Body shows old and new prices. CTA links to listing detail page.
  **Expert Domains:** nextjs

### Task 4.2: Create price drop cron API route

Create `src/app/api/cron/price-drops/route.ts` — a Vercel Cron endpoint (GET) that:

1. Validates the `CRON_SECRET` authorization header (`Authorization: Bearer ${CRON_SECRET}`) — returns 401 if invalid
2. Uses admin client from `@/libs/supabase/admin.ts` to query `price_drop_notifications` where `processed = false`, ordered by `created_at ASC`, limit 100
3. For each notification: queries `watchers` for that `listing_id`, filtering to watchers where `last_notified_price_cents > new_price_cents` OR `last_notified_price_cents IS NULL`
4. For each qualifying watcher: looks up the watcher's email from `members` table, sends email via `sendEmail()` with the `priceDrop()` template, updates `watchers.last_notified_price_cents` to `new_price_cents`
5. Marks `price_drop_notifications.processed = true` after processing
6. Returns `{ processed: number, emails_sent: number }`
   **Files:** `src/app/api/cron/price-drops/route.ts`
   **AC:** Route compiles. Requires CRON_SECRET auth. Processes unprocessed price drop notifications. Sends emails only to watchers who haven't been notified at this price. Updates `last_notified_price_cents` to prevent duplicate emails. Marks notifications as processed.
   **Expert Domains:** supabase, nextjs

### Task 4.3: Configure Vercel Cron in vercel.json

Update `vercel.json` to add the cron job configuration for the price drop processor. Schedule: every 15 minutes (`*/15 * * * *`). Path: `/api/cron/price-drops`.
**Files:** `vercel.json`
**AC:** `vercel.json` has a `crons` array with the price drop cron entry running every 15 minutes.
**Expert Domains:** nextjs

### Task 4.4: Add CRON_SECRET environment variable

Add `CRON_SECRET` environment variable to Vercel via MCP. This secures the cron endpoint. Generate a random secret value. Also add it to `.env.local.example` as a placeholder.
**MCP:** vercel
**Files:** `.env.local.example`
**AC:** `CRON_SECRET` is listed in `.env.local.example`. Vercel environment variable is configured.
**Expert Domains:** nextjs

### Task 4.5: Display watcher count on seller dashboard listing rows

The `ListingRow` component at `src/features/listings/components/listing-row/index.tsx` already displays `listing.watcher_count` when `> 0` (line 88: `{listing.watcher_count} watchers`). Verify this works correctly with the new trigger-maintained count. No code changes needed if the existing implementation is correct — this task is a verification/integration check. If the watcher count is not rendering properly, fix the display.
**Files:** `src/features/listings/components/listing-row/index.tsx` (verify only)
**AC:** Seller dashboard listing rows show watcher count when > 0. Count is accurate (maintained by the `update_watcher_count()` trigger).
**Expert Domains:** nextjs

### Task 4.6: Update watchlist CLAUDE.md with final architecture

Update `src/features/watchlist/CLAUDE.md` with the complete architecture documentation: all types, services, hooks, components, API routes, database schema, RLS policies, cron job details, and integration points. Follow the comprehensive format from `src/features/follows/CLAUDE.md`.
**Files:** `src/features/watchlist/CLAUDE.md`
**AC:** CLAUDE.md documents the full feature: schema, RLS, triggers, types, services, hooks, components, API routes, cron pipeline, and integration points (listing card, detail page, navbar, proxy).
