# Review Findings — #233

## [B] Blocking: Upsert does not update `viewed_at` on re-view

**File:** `src/app/api/listings/[id]/view/route.ts`
The upsert payload omits `viewed_at`, so on conflict the existing timestamp is preserved. Must add `viewed_at: new Date().toISOString()` to refresh recency on re-views.

## [W] Warning: Trigger fires on INSERT only, not upsert-as-update

**File:** `supabase/migrations/20260324000000_create_recently_viewed.sql`
The cap trigger is AFTER INSERT, so it doesn't fire on conflict-update. This is acceptable since re-views don't increase row count (UNIQUE constraint ensures one row per user-listing pair).

## [W] Warning: View count increment is not atomic (pre-existing)

**File:** `src/app/api/listings/[id]/view/route.ts`
The read-then-increment pattern has a race condition. Pre-existing, out of scope for #233.

## [I] Info: Fire-and-forget promise in serverless

The upsert is non-blocking by design. Could use `waitUntil()` for reliability if needed later.

## [I] Info: Index naming convention difference

`idx_recently_viewed_*` vs `cart_items_*_idx`. Cosmetic only.
