# Watchlist Feature

Part of the price-drop notification system. Allows authenticated members to watch listings and receive email notifications when the price drops.

## Overview

Members can watch any active listing via the `WatchButton` component — an icon button overlaid on listing cards and the listing detail page. When a seller reduces the price, a DB trigger inserts a row into `price_drop_notifications`. A Vercel cron job (`GET /api/cron/price-drops`) processes unprocessed notifications, fans emails out to all watchers whose `last_notified_price_cents` is above the new price, and marks each notification `processed = true`.

Watcher counts are denormalized onto `listings.watcher_count` via a DB trigger for fast display in the seller's `QuickEditPrice` modal without joins.

## Database Schema

### `watchers` table

| Column                      | Type        | Constraints                                   |
| --------------------------- | ----------- | --------------------------------------------- |
| `id`                        | UUID        | PK, `gen_random_uuid()`                       |
| `listing_id`                | UUID        | NOT NULL, FK `listings(id) ON DELETE CASCADE` |
| `user_id`                   | UUID        | NOT NULL, FK `members(id) ON DELETE CASCADE`  |
| `watched_at`                | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                     |
| `last_notified_price_cents` | INTEGER     | NULL — tracks last notified price             |

**Constraints:**

- `UNIQUE (listing_id, user_id)` — prevents duplicate watches

**Indexes:**

- `watchers_listing_id_idx` on `listing_id`
- `watchers_user_id_idx` on `user_id`

### `price_drop_notifications` table

| Column            | Type        | Constraints                                   |
| ----------------- | ----------- | --------------------------------------------- |
| `id`              | UUID        | PK, `gen_random_uuid()`                       |
| `listing_id`      | UUID        | NOT NULL, FK `listings(id) ON DELETE CASCADE` |
| `old_price_cents` | INTEGER     | NOT NULL                                      |
| `new_price_cents` | INTEGER     | NOT NULL                                      |
| `processed`       | BOOLEAN     | NOT NULL, DEFAULT `false`                     |
| `created_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT `now()`                     |

**Notes:**

- Rows are inserted by a DB trigger on `listings` UPDATE when `price_cents` decreases
- The cron pipeline processes up to 100 `processed = false` rows per run, sends emails, then marks them `processed = true`
- One row per price-drop event (not per watcher) — the cron resolves watchers at send time

### Denormalized `watcher_count`

`listings.watcher_count INTEGER NOT NULL DEFAULT 0` is maintained by a DB trigger:

- **INSERT** on `watchers` → increments `listings.watcher_count`
- **DELETE** on `watchers` → decrements `listings.watcher_count` (clamped to 0 via `GREATEST`)

The watcher count is displayed in the seller's `QuickEditPrice` modal to signal demand.

### RLS Policies

| Policy                                  | Operation | Roles         | Rule                                         |
| --------------------------------------- | --------- | ------------- | -------------------------------------------- |
| Users can view own watches              | SELECT    | authenticated | `USING (user_id = auth.uid())`               |
| Users can insert own watches            | INSERT    | authenticated | `WITH CHECK (user_id = auth.uid())`          |
| Users can delete own watches            | DELETE    | authenticated | `USING (user_id = auth.uid())`               |
| price_drop_notifications are not public | SELECT    | authenticated | Read-only via service role (cron processing) |

## Types

**`src/features/watchlist/types/watcher.ts`**

| Type                    | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `Watcher`               | Database Row type from `watchers` table                                   |
| `WatcherInsert`         | Insert type (omits `id` and `watched_at`)                                 |
| `WatchStatus`           | `{ is_watching: boolean }` — returned by the status endpoint              |
| `WatchedListing`        | `ListingWithPhotos & { watched_at: string }` — used on the watchlist page |
| `PriceDropNotification` | Database Row type from `price_drop_notifications` table                   |

## Services

### Server (`src/features/watchlist/services/watchlist-server.ts`)

Uses `@/libs/supabase/server` (cookie-based auth, user JWT). Called by API route handlers only.

| Function                   | Signature                                              | Description                                                                                                       |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `addWatcherServer`         | `(userId, listingId) => Promise<Watcher>`              | Inserts watcher row; on `23505` unique violation, fetches and returns existing row                                |
| `removeWatcherServer`      | `(userId, listingId) => Promise<{ success: boolean }>` | Deletes by composite match; returns `success: false` if no row deleted                                            |
| `getWatchStatusServer`     | `(userId, listingId) => Promise<WatchStatus>`          | `maybeSingle()` lookup → `{ is_watching: boolean }`                                                               |
| `getWatchedListingsServer` | `(userId) => Promise<WatchedListing[]>`                | Joins `watchers` → `listings` → `listing_photos`; filters out soft-deleted listings; ordered by `watched_at DESC` |

### Client (`src/features/watchlist/services/watchlist.ts`)

Thin `fetch` wrappers using `@/libs/fetch` (`get`, `post`, `del`). Called by Tanstack Query hooks.

| Function             | HTTP                                   | Returns                |
| -------------------- | -------------------------------------- | ---------------------- |
| `watchListing`       | `POST /api/watchlist`                  | `{ success: boolean }` |
| `unwatchListing`     | `DELETE /api/watchlist?listing_id=...` | `{ success: boolean }` |
| `getWatchStatus`     | `GET /api/watchlist/{listingId}`       | `WatchStatus`          |
| `getWatchedListings` | `GET /api/watchlist`                   | `WatchedListing[]`     |

## Hooks

### `useWatchStatus(listingId)`

**File:** `src/features/watchlist/hooks/use-watch-status.ts`
**Query key:** `['watchlist', 'status', listingId]`

Returns `{ data: WatchStatus, isLoading }`. Guard: disabled when `listingId` is falsy.

```ts
const { data, isLoading } = useWatchStatus(listingId);
// data: { is_watching: boolean } | undefined
```

### `useWatchToggle({ listingId, onSuccess?, onError? })`

**File:** `src/features/watchlist/hooks/use-watch-toggle.ts`

Mutation that watches or unwatches based on the boolean argument passed to `mutate`. Implements full optimistic UI: cancels in-flight queries, snapshots cache, updates immediately, reverts on error.

- **409** (already watching) and **404** (not watching) are treated as success — routes to `onSuccess` with no rollback
- On settle: invalidates `['watchlist', 'status', listingId]` and the root `['watchlist']` key

```ts
const { mutate, isPending } = useWatchToggle({
  listingId,
  onSuccess: () => toast('Updated'),
  onError: (error) => toast(error.message),
});

// Pass current watch state — mutation inverts it
mutate(isCurrentlyWatching);
```

### `useWatchlist()`

**File:** `src/features/watchlist/hooks/use-watchlist.ts`
**Query key:** `['watchlist']`

Returns `{ data: WatchedListing[], isLoading, isError }`. Used on the `/watchlist` dashboard page.

```ts
const { data: listings, isLoading, isError } = useWatchlist();
// data: WatchedListing[] | undefined
```

## Components

### WatchButton

**File:** `src/features/watchlist/components/watch-button/index.tsx`

Icon-only toggle button that renders over listing images. Uses `FaRegHeart` (unwatched) and `FaHeart` (watched) from `react-icons/fa`.

**Props (`WatchButtonProps`):**

| Prop        | Type     | Required | Description                            |
| ----------- | -------- | -------- | -------------------------------------- |
| `listingId` | `string` | Yes      | UUID of the listing to watch/unwatch   |
| `className` | `string` | No       | Additional class on the button element |

**Auth gate:** Unauthenticated users are redirected to `{pathname}?login=true` (opens the login modal). No toast — the router push is the signal.

**Toast messages:**

- Watch success: "Added to Watchlist — We'll tell you if the price drops."
- Unwatch success: "Removed from Watchlist — You will no longer receive alerts."
- Error: "Something went wrong — Please try again."

**ARIA attributes:**

- `aria-label` — "Add to watchlist" or "Remove from watchlist"
- `aria-pressed` — reflects current watch state
- `aria-busy` — true when mutation is in progress
- Icons have `aria-hidden="true"`

**Visual states:** Semi-transparent dark circle (`rgb(0 0 0 / 40%)`), white icon when unwatched, error-red icon when watched. Minimum 44x44px tap target via `--min-touch-target`.

**Usage:**

```tsx
import WatchButton from '@/features/watchlist/components/watch-button';

<WatchButton listingId={listing.id} className={styles.watchButton} />;
```

## API Routes

| Method | Route                           | Auth Required | Status Codes        | Description                                                      |
| ------ | ------------------------------- | ------------- | ------------------- | ---------------------------------------------------------------- |
| GET    | `/api/watchlist`                | Yes           | 200/401/500         | List all listings the authenticated user is watching             |
| POST   | `/api/watchlist`                | Yes           | 201/400/401/409/500 | Watch a listing (409 on duplicate — server returns existing row) |
| DELETE | `/api/watchlist?listing_id=...` | Yes           | 200/400/401/404/500 | Unwatch a listing (params via query string, 404 if not watching) |
| GET    | `/api/watchlist/[listing_id]`   | Yes           | 200/401/500         | Check if the authenticated user is watching a specific listing   |

**Route files:**

- `src/app/api/watchlist/route.ts` — GET (list), POST (watch), DELETE (unwatch)
- `src/app/api/watchlist/[listing_id]/route.ts` — GET (status check)

**Note:** Watch status is a dynamic segment (`[listing_id]`), not a `/status` sub-route. The client service calls `GET /api/watchlist/{listingId}` directly.

## Cron Pipeline

**File:** `src/app/api/cron/price-drops/route.ts`

Secured by `Authorization: Bearer {CRON_SECRET}`. Triggered on a schedule via Vercel cron.

**Flow:**

1. DB trigger on `listings` UPDATE inserts a `price_drop_notifications` row when `price_cents` decreases
2. Cron `GET /api/cron/price-drops` fetches up to 100 `processed = false` rows (oldest first)
3. For each notification:
   - Fetches watchers for `listing_id` where `last_notified_price_cents IS NULL` OR `last_notified_price_cents > new_price_cents` (only notifies watchers who haven't already seen this price or lower)
   - Fetches each watcher's email via `auth.admin.getUserById()`
   - Renders `priceDrop()` email template with old/new price and listing URL
   - Sends via `sendEmail()` (Resend)
   - Updates `watchers.last_notified_price_cents = new_price_cents`
4. Marks notification `processed = true`
5. Returns `{ processed: number, emails_sent: number }`

Individual watcher email failures are silently caught — one failure does not block other watchers or other notifications.

## Email Template

**File:** `src/features/email/templates/price-drop.ts`

```ts
priceDrop({ listingTitle, oldPriceCents, newPriceCents, listingId }): EmailTemplate
```

- Subject: `"{listingTitle} just dropped in price!"`
- Body: listing title, "Good news" copy, old price (strikethrough) + new price, CTA button to `/listing/{listingId}`, fallback plain-text URL
- Uses `emailLayout()` for the branded Nessi shell
- `listingTitle` is passed through `escapeHtml()` before interpolation

## Public API

Consuming features import from the barrel export at `src/features/watchlist/index.ts`:

```ts
import {
  Watcher,
  WatcherInsert,
  WatchStatus,
  WatchedListing,
  PriceDropNotification,
  useWatchStatus,
  useWatchToggle,
  useWatchlist,
} from '@/features/watchlist';
```

`WatchButton` is imported directly from its component path (not exported from the barrel):

```ts
import WatchButton from '@/features/watchlist/components/watch-button';
```

## Integration Points

| Location                                                  | How It's Used                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/features/listings/components/listing-card/index.tsx` | Renders `WatchButton` overlaid on the listing image; only shown to authenticated users                          |
| `src/app/(frontend)/listing/[id]/listing-detail.tsx`      | Renders `WatchButton` on the listing detail page                                                                |
| `src/app/(frontend)/watchlist/watchlist-page.tsx`         | Watchlist dashboard page — uses `useWatchlist()` to render `ListingCard` for each watched listing; sold overlay |
| `src/app/(frontend)/watchlist/page.tsx`                   | Server page shell for the `/watchlist` route (auth-protected via `proxy.ts`)                                    |

## Directory Structure

```
src/features/watchlist/
├── AGENTS.md
├── index.ts                              # Barrel export (types + hooks)
├── types/
│   └── watcher.ts                        # Watcher, WatcherInsert, WatchStatus, WatchedListing, PriceDropNotification
├── services/
│   ├── watchlist-server.ts               # Server-side Supabase queries
│   └── watchlist.ts                      # Client-side fetch wrappers
├── hooks/
│   ├── use-watch-status.ts               # Query: is the user watching? key: ['watchlist', 'status', listingId]
│   ├── use-watch-toggle.ts               # Mutation: watch/unwatch with optimistic updates
│   └── use-watchlist.ts                  # Query: list of watched listings — key: ['watchlist']
└── components/
    └── watch-button/
        ├── index.tsx                     # WatchButton icon toggle (use client)
        └── watch-button.module.scss      # Semi-transparent circle, heart icon, two-tone states

src/app/api/watchlist/
├── route.ts                              # GET (list watched), POST (watch), DELETE (unwatch)
└── [listing_id]/
    └── route.ts                          # GET (watch status)

src/app/api/cron/
└── price-drops/
    └── route.ts                          # GET — cron: process price_drop_notifications, email watchers

src/features/email/templates/
└── price-drop.ts                         # Email template: subject + HTML body for price drop alerts

src/app/(frontend)/watchlist/
├── page.tsx                              # Route shell (auth-protected)
├── watchlist-page.tsx                    # Client component: renders watchlist grid
└── watchlist-page.module.scss            # Page layout styles
```

## Key Patterns

- Follows the same shape as `src/features/follows/` — polymorphic target replaced by a direct `listing_id` FK
- Optimistic updates in `useWatchToggle` mirror the `useFollowToggle` pattern: cancel in-flight queries, snapshot, update cache, revert on error
- DELETE via query string (`?listing_id=...`) — same rationale as `unfollowTarget` — `DELETE` bodies are unreliable across clients
- Watch status uses a dynamic route segment (`[listing_id]`) rather than a `/status` sub-route, so the status check is a single `GET` with the ID in the path
- Auth gate on `WatchButton` pushes to `{pathname}?login=true` instead of showing a toast — matches the listing-detail auth pattern
- Cron skips watchers already notified at or below the new price (`last_notified_price_cents <= new_price_cents`) to prevent duplicate emails on successive smaller drops

## Related Features

- `src/features/listings/` — `watcher_count` on listings table; `QuickEditPrice` displays watcher count
- `src/features/email/` — `sendEmail` + `priceDrop` template used by the cron pipeline
- `src/features/follows/` — Reference pattern for toggle + optimistic updates
