# Checkpoint Audit Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 36 findings from the project checkpoint audit (`docs/checkpoint-audit-findings.md`) — cascade deletion bugs, security gaps, API-first migrations, schema cleanup, docs, and test coverage.

**Architecture:** Seven independent phases ordered by severity. Each phase produces a single PR. Phases can be parallelized via worktrees but should merge in order to avoid conflicts.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + Storage + Auth), Tanstack Query, Zustand, Yup, Vitest, pnpm

**Source of truth:** `docs/checkpoint-audit-findings.md` — item numbers referenced as `#N` throughout.

---

## Phase 1: Cascade Deletion Fixes (CRITICAL)

**Findings:** #18, #19, #20, #21, #22
**Branch:** `fix/cascade-deletion`
**Why first:** #18 is a production-breaking bug — member deletion fails for any member with listings.

### Task 1.1: Fix `listings.seller_id ON DELETE RESTRICT` (#18)

**Files:**

- Create: `supabase/migrations/YYYYMMDDHHMMSS_fix_seller_id_cascade.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Fix: listings.seller_id ON DELETE RESTRICT blocks member deletion.
-- Change to SET NULL so listings are soft-orphaned (already soft-deleted by API layer)
-- rather than blocking the entire cascade chain.
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_seller_id_fkey;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.members(id)
  ON DELETE SET NULL;

-- Also fix member_id FK if it exists
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_member_id_fkey;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id)
  ON DELETE SET NULL;
```

> **Design decision:** Using `SET NULL` instead of `CASCADE` because listings should be soft-deleted by the application layer (which already handles storage cleanup), not hard-deleted by a FK cascade. The delete-account API route should soft-delete all member listings before calling `deleteUser()`.

- [ ] **Step 2: Update delete-account route to soft-delete listings before auth deletion**

Modify: `src/app/api/auth/delete-account/route.ts`

After storage cleanup (line ~127) and before slug cleanup (line ~131), add:

```typescript
// Soft-delete all member's listings before deleting the user
try {
  await admin
    .from('listings')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' as const })
    .eq('seller_id', user.id)
    .is('deleted_at', null);
} catch (listingError) {
  console.error('Listing cleanup error (non-blocking):', listingError);
}
```

- [ ] **Step 3: Apply migration to Supabase**

Run: `pnpm db:types` to regenerate types after migration is applied.

- [ ] **Step 4: Verify with typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ src/app/api/auth/delete-account/route.ts src/types/database.ts
git commit -m "fix(cascade): change listings.seller_id from RESTRICT to SET NULL and soft-delete listings on account deletion"
```

---

### Task 1.2: Add storage cleanup to listing deletion (#19)

**Files:**

- Modify: `src/app/api/listings/[id]/route.ts`

- [ ] **Step 1: Read the current DELETE handler** (lines 84-126)

The current handler soft-deletes the listing but does NOT clean up images from the `listing-images` storage bucket.

- [ ] **Step 2: Add storage cleanup before soft-delete**

After the ownership check (line 110) and before the soft-delete update (line 112), add:

```typescript
// Clean up listing photos from storage (best-effort)
try {
  const { data: photos } = await supabase
    .from('listing_photos')
    .select('image_url, thumbnail_url')
    .eq('listing_id', id);

  if (photos && photos.length > 0) {
    const paths = photos.flatMap((photo) => {
      const results: string[] = [];
      const imgPath = parseStoragePath(photo.image_url);
      if (imgPath) results.push(imgPath);
      if (photo.thumbnail_url) {
        const thumbPath = parseStoragePath(photo.thumbnail_url);
        if (thumbPath) results.push(thumbPath);
      }
      return results;
    });

    if (paths.length > 0) {
      await supabase.storage.from('listing-images').remove(paths);
    }
  }
} catch (storageError) {
  console.error('Listing storage cleanup error (non-blocking):', storageError);
}
```

Also add the `parseStoragePath` helper at the top of the file (same pattern as `upload/delete/route.ts`):

```typescript
function parseStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = '/storage/v1/object/public/listing-images/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return url.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/listings/[id]/route.ts
git commit -m "fix(listings): add storage cleanup to listing deletion to prevent orphaned images"
```

---

### Task 1.3: Release slug on shop deletion (#20)

**Files:**

- Modify: `src/app/api/shops/[id]/route.ts`

- [ ] **Step 1: Add slug release after soft-delete**

After the soft-delete update (line ~84) and before the success response (line ~90), add:

```typescript
// Release the shop's slug so it can be reused
try {
  await admin.from('slugs').delete().eq('entity_type', 'shop').eq('entity_id', shopId);
} catch (slugError) {
  console.error('Shop slug cleanup error (non-blocking):', slugError);
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shops/[id]/route.ts
git commit -m "fix(shops): release slug from slugs table on shop deletion"
```

---

### Task 1.4: Reorder storage cleanup in delete-account (#21)

> **Dependency:** This task restructures the entire delete-account route, including the listing soft-delete code added in Task 1.1 Step 2. Execute Task 1.1 first, then this task refactors the route holistically.

**Files:**

- Modify: `src/app/api/auth/delete-account/route.ts`

- [ ] **Step 1: Move storage cleanup to after listing soft-delete**

The current order is: storage cleanup → slug cleanup → deleteUser.
The problem: if `deleteUser` fails, storage is already deleted.

Reorder to: soft-delete listings → deleteUser → storage cleanup (best-effort post-deletion).

This is a structural refactor of the route. The key change: storage cleanup should happen **after** `deleteUser()` succeeds, since storage files are non-critical (they're just bytes) but the auth user is the critical entity.

However, after `deleteUser()` the member row and listings are cascade-deleted, so we can't query for listing photos. The solution: collect storage paths **before** deletion, then delete storage **after** auth deletion succeeds.

```typescript
// 1. Collect storage paths BEFORE deletion
const storagePaths = await collectStoragePaths(admin, user.id);

// 2. Soft-delete listings (already added in Task 1.1)
// 3. Release slug
// 4. Delete auth user
const { error } = await admin.auth.admin.deleteUser(user.id);
if (error) {
  return NextResponse.json({ error: error.message }, { status: 500 });
}

// 5. Clean up storage AFTER successful deletion (best-effort)
try {
  await cleanupStorage(admin, storagePaths);
} catch (e) {
  console.error('Post-deletion storage cleanup error (non-blocking):', e);
}
```

- [ ] **Step 2: Extract `collectStoragePaths` and `cleanupStorage` from current `cleanupUserStorage`**

Split the existing function into two parts:

1. `collectStoragePaths(admin, userId)` — returns `{ avatarPaths: string[], listingPaths: string[], shopPaths: string[] }`
2. `cleanupStorage(admin, paths)` — removes all collected paths from appropriate buckets

- [ ] **Step 3: Verify build and typecheck**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/delete-account/route.ts
git commit -m "fix(cascade): reorder delete-account to collect paths first, delete auth, then cleanup storage"
```

---

### Task 1.5: Soft-delete shop listings on shop deletion (#22)

**Files:**

- Modify: `src/app/api/shops/[id]/route.ts`

- [ ] **Step 1: Add listing soft-delete after storage cleanup, before shop soft-delete**

After the storage cleanup block and before the `admin.from('shops').update(...)` call:

```typescript
// Soft-delete all listings associated with this shop
try {
  await admin
    .from('listings')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' as const })
    .eq('shop_id', shopId)
    .is('deleted_at', null);
} catch (listingError) {
  console.error('Shop listing cleanup error (non-blocking):', listingError);
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/shops/[id]/route.ts
git commit -m "fix(shops): soft-delete shop listings when shop is deleted"
```

---

## Phase 2: Security Hardening

**Findings:** #3, #4, #5, #15, #30, #31, #32, #33
**Branch:** `fix/security-hardening`

### Task 2.1: Add ownership check to photo delete endpoint (#3)

**Files:**

- Modify: `src/app/api/listings/upload/delete/route.ts`

- [ ] **Step 1: Add listing ownership verification**

After auth check (line 25) and before storage deletion (line 43), add ownership verification. The image path format is `{user_id}/{listing_id}/{uuid}.webp`, so extract the `user_id` segment and compare to the authenticated user:

```typescript
// Extract user_id from the image path to verify ownership
// Storage path format: {user_id}/{listing_id}/{uuid}.webp
const imagePath = parseStoragePath(imageUrl);
if (imagePath) {
  const pathUserId = imagePath.split('/')[0];
  if (pathUserId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/listings/upload/delete/route.ts
git commit -m "fix(security): add ownership verification to listing photo delete endpoint"
```

---

### Task 2.2: Filter draft listings from public GET (#4)

**Files:**

- Modify: `src/app/api/listings/[id]/route.ts`

- [ ] **Step 1: Add status filter to GET handler**

In the GET handler, after fetching the listing (line 10-16), check if the listing is a draft and if so, verify the requester is the owner:

```typescript
// Don't expose draft/archived/deleted listings to non-owners
if (listing.status !== 'active' && listing.status !== 'sold') {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || listing.seller_id !== user.id) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/listings/[id]/route.ts
git commit -m "fix(security): hide draft listings from non-owners in public GET endpoint"
```

---

### Task 2.3: Add field whitelist to listing PUT (#5)

**Files:**

- Modify: `src/app/api/listings/[id]/route.ts`

- [ ] **Step 1: Add field whitelist before update**

Replace line 57-59 with:

```typescript
const body = await req.json();

// Whitelist: only allow fields that sellers can modify
const ALLOWED_FIELDS = [
  'title',
  'description',
  'price_cents',
  'category',
  'condition',
  'brand',
  'model',
  'quantity',
  'weight_oz',
  'shipping_paid_by',
  'shipping_price_cents',
  'cover_photo_url',
  'location_city',
  'location_state',
  'is_visible',
  'length_inches',
  'width_inches',
  'height_inches',
] as const;

const filteredBody = Object.fromEntries(
  Object.entries(body).filter(([key]) => (ALLOWED_FIELDS as readonly string[]).includes(key)),
);

if (Object.keys(filteredBody).length === 0) {
  return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
}

const { error: updateError } = await supabase.from('listings').update(filteredBody).eq('id', id);
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/listings/[id]/route.ts
git commit -m "fix(security): add field whitelist to listing PUT endpoint"
```

---

### Task 2.4: Add Cache-Control headers to all authenticated routes (#15)

**Files:**

- Modify: All API route files that return authenticated responses (20 files)

- [ ] **Step 1: Create a shared constant**

Add to `src/libs/api-headers.ts`:

```typescript
export const AUTH_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;
```

- [ ] **Step 2: Add headers to each authenticated route response**

For each route that returns user-specific data, wrap `NextResponse.json()` calls with the headers:

```typescript
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
// ...
return NextResponse.json(data, { headers: AUTH_CACHE_HEADERS });
```

Apply to all routes in:

- `src/app/api/members/avatar/route.ts`
- `src/app/api/members/seller-preconditions/route.ts`
- `src/app/api/members/toggle-seller/route.ts`
- `src/app/api/listings/route.ts` (POST only, not GET)
- `src/app/api/listings/[id]/route.ts` (PUT, DELETE only)
- `src/app/api/listings/[id]/status/route.ts`
- `src/app/api/listings/upload/route.ts`
- `src/app/api/listings/upload/delete/route.ts`
- `src/app/api/listings/seller/route.ts`
- `src/app/api/listings/drafts/route.ts`
- `src/app/api/shops/[id]/route.ts`
- `src/app/api/shops/avatar/route.ts`
- `src/app/api/shops/slug/route.ts`
- `src/app/api/auth/delete-account/route.ts`

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/libs/api-headers.ts src/app/api/
git commit -m "fix(security): add Cache-Control private,no-store headers to all authenticated API routes"
```

---

### Task 2.5: Create vercel.json and document rate limiting plan (#33; #30, #31, #32 deferred)

**Files:**

- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json with WAF rules**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

> **Note:** Vercel Firewall WAF rules are configured via the Vercel Dashboard (Security tab), not via `vercel.json`. The `vercel.json` file establishes project configuration. Rate limiting requires Vercel's Advanced Security add-on or application-level middleware.
>
> For now, create a ticket to configure WAF rules in the Vercel Dashboard:
>
> - Registration: 5 req/min per IP
> - View count: 10 req/min per IP
> - File upload: 10 req/hour per user
>
> Application-level rate limiting can be added later using Upstash Redis or Vercel KV.

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json project configuration"
```

---

## Phase 3: API-First Migrations (Shops)

**Findings:** #1, #2, #6, #7
**Branch:** `fix/shop-api-routes`

### Task 3.1: Create `POST /api/shops` for atomic shop creation (#1)

**Files:**

- Create: `src/app/api/shops/route.ts`
- Modify: `src/features/shops/services/shop.ts` (update `createShop` to call API)
- Modify: `src/features/shops/hooks/use-shops.ts` (update mutation)

- [ ] **Step 1: Create the API route**

```typescript
import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { NextResponse } from 'next/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { shopName, slug, description } = await req.json();

    if (!shopName || !slug) {
      return NextResponse.json({ error: 'Shop name and slug are required' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Atomically reserve the slug (throws on conflict)
    try {
      await admin.rpc('reserve_slug', {
        p_slug: slug,
        p_entity_type: 'shop',
        p_entity_id: user.id, // temporary — will update after shop creation
      });
    } catch (slugError) {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Create the shop
    const { data: shop, error: shopError } = await admin
      .from('shops')
      .insert({
        shop_name: shopName,
        slug,
        description: description || null,
        owner_id: user.id,
      })
      .select()
      .single();

    if (shopError) {
      // Rollback slug reservation
      await admin.from('slugs').delete().eq('slug', slug);
      return NextResponse.json({ error: shopError.message }, { status: 500 });
    }

    // Update slug entity_id to the actual shop ID
    await admin.from('slugs').update({ entity_id: shop.id }).eq('slug', slug);

    // Add owner as shop member
    await admin
      .from('shop_members')
      .insert({ shop_id: shop.id, member_id: user.id, role: 'owner' });

    return NextResponse.json(shop, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error creating shop:', error);
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `createShop` service to call API route**

In `src/features/shops/services/shop.ts`, replace the direct Supabase `createShop` function:

```typescript
export async function createShop(data: {
  shopName: string;
  slug: string;
  description?: string;
}): Promise<Shop> {
  const response = await fetch('/api/shops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to create shop');
  }

  return response.json();
}
```

- [ ] **Step 3: Update the `useCreateShop` hook and `ShopCreationForm` to use the new service signature**

Verify that the shop creation form passes `{ shopName, slug, description }` to the mutation.

- [ ] **Step 4: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/shops/route.ts src/features/shops/services/shop.ts src/features/shops/hooks/use-shops.ts
git commit -m "feat(shops): migrate createShop to POST /api/shops with atomic slug reservation"
```

---

### Task 3.2: Create `POST /api/shops/[id]/ownership` for atomic transfer (#2)

**Files:**

- Create: `src/app/api/shops/[id]/ownership/route.ts`
- Modify: `src/features/shops/services/shop.ts` (update `transferOwnership`)

- [ ] **Step 1: Create the API route with server-side transaction**

The route should:

1. Verify authenticated user is current shop owner
2. Verify `newOwnerId` is an existing shop member
3. Atomically: update `shops.owner_id`, update new owner role to `'owner'`, demote old owner to `'manager'`

Use the admin client for the multi-table update to bypass RLS.

- [ ] **Step 2: Update `transferOwnership` service to call API**

```typescript
export async function transferOwnership(shopId: string, newOwnerId: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newOwnerId }),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to transfer ownership');
  }
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/shops/[id]/ownership/ src/features/shops/services/shop.ts
git commit -m "feat(shops): migrate transferOwnership to POST /api/shops/[id]/ownership with atomic transaction"
```

---

### Task 3.3: Create shop member management API routes (#6, #7)

**Files:**

- Create: `src/app/api/shops/[id]/members/route.ts` (POST for add)
- Create: `src/app/api/shops/[id]/members/[memberId]/route.ts` (DELETE for remove)
- Modify: `src/features/shops/services/shop.ts` (update both functions)

- [ ] **Step 1: Create POST route for adding members**

Verify authenticated user is shop owner before adding. Return 403 with clear error if not.

- [ ] **Step 2: Create DELETE route for removing members**

Verify authenticated user is shop owner (or the member removing themselves — #17). Return 403 if not authorized.

- [ ] **Step 3: Update service functions to call API routes**

```typescript
export async function addShopMember(
  shopId: string,
  memberId: string,
  role: ShopMemberRole,
): Promise<ShopMember> {
  const response = await fetch(`/api/shops/${shopId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, role }),
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to add shop member');
  }

  return response.json();
}

export async function removeShopMember(shopId: string, memberId: string): Promise<void> {
  const response = await fetch(`/api/shops/${shopId}/members/${memberId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || 'Failed to remove shop member');
  }
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/shops/[id]/members/ src/features/shops/services/shop.ts
git commit -m "feat(shops): migrate addShopMember and removeShopMember to API routes with explicit authorization"
```

---

## Phase 4: Schema & Data Cleanup

**Findings:** #10, #14, #34, #35
**Branch:** `chore/schema-cleanup`

> **Note on #8 and #9:** Finding #8 (`release_slug` RPC never called) is resolved by Tasks 1.3 and 1.4 which manually delete from the `slugs` table during shop and account deletion — this is functionally equivalent to calling the RPC and more explicit. Finding #9 (slugs table no FK) is a design decision: the polymorphic `entity_type + entity_id` pattern intentionally avoids FKs. The manual cleanup in Tasks 1.3/1.4/1.5 ensures slugs are released. Both are marked resolved.

### Task 4.1: Fix lures photo guidance mismatch (#10)

**Files:**

- Modify: `src/features/listings/constants/condition.ts`

- [ ] **Step 1: Fix the CATEGORY_PHOTO_GUIDANCE keys**

Replace `lures_hard` and `lures_soft` with a single `lures` key:

```typescript
export const CATEGORY_PHOTO_GUIDANCE: Record<string, string> = {
  rods: 'Show the full rod, then close-ups of: cork/EVA grip condition, guide wraps and inserts, rod tip, and any marks on the blank.',
  reels:
    'Show the reel from both sides, then close-ups of: drag knob, bail/levelwind, spool edge, and body/foot condition.',
  lures:
    'Show all sides of the lure. For hard baits: highlight hook points, split rings, paint chips, and eye condition. For soft plastics: show individual bait condition, any tears, and tail integrity.',
  flies:
    'Show a top-down shot on a light background, then a profile view. Highlight: hackle condition, hook point, and any material loss.',
  _default:
    'Show the item from multiple angles. Include close-ups of any wear, damage, or notable features mentioned in your condition rating.',
};
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/listings/constants/condition.ts
git commit -m "fix(listings): merge lures_hard/lures_soft photo guidance into single lures key matching enum"
```

---

### Task 4.2: Update CLAUDE.md docs (#34, #35)

**Files:**

- Modify: `CLAUDE.md` (root)
- Modify: `src/features/listings/CLAUDE.md`

- [ ] **Step 1: Fix root CLAUDE.md "products" references**

Replace:

- "Product detail pages" → "Listing detail pages"
- "Deletes product images" → "Deletes listing images"
- `src/features/products/` directory reference → remove or update to `src/features/listings/`
- "API routes (auth, products, upload)" → "API routes (auth, listings, upload)"

- [ ] **Step 2: Fix listings CLAUDE.md**

Remove `useReorderListingPhotos()` from the Hooks table (it doesn't exist in code).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md src/features/listings/CLAUDE.md
git commit -m "docs: update CLAUDE.md files — fix products→listings references, remove nonexistent hook"
```

---

### Task 4.3: Remove `show_limit` RPC (#14)

**Files:**

- Create: `supabase/migrations/YYYYMMDDHHMMSS_remove_show_limit_rpc.sql`

- [ ] **Step 1: Write migration**

```sql
DROP FUNCTION IF EXISTS public.show_limit();
```

- [ ] **Step 2: Regenerate types**

Run: `pnpm db:types`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/ src/types/database.ts
git commit -m "chore(schema): remove unused show_limit RPC"
```

---

## Phase 5: Repo Organization

**Findings:** #24, #29, #36
**Branch:** `chore/repo-organization`

### Task 5.1: Move AvatarUpload to shared components (#24)

**Files:**

- Move: `src/features/members/components/avatar-upload/` → `src/components/controls/avatar-upload/`
- Modify: All imports (3 files)

- [ ] **Step 1: Move the component directory**

```bash
mv src/features/members/components/avatar-upload src/components/controls/avatar-upload
```

- [ ] **Step 2: Update imports**

Update all files that import AvatarUpload:

- `src/features/members/components/onboarding/step-display-name/index.tsx`
- `src/features/members/components/account/personal-info/index.tsx`
- `src/features/shops/components/shop-settings/shop-details-section/index.tsx`

Change: `from '@/features/members/components/avatar-upload'`
To: `from '@/components/controls/avatar-upload'`

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/members/components/ src/components/controls/avatar-upload/ src/features/shops/
git commit -m "refactor: move AvatarUpload to src/components/controls/ (used by members + shops)"
```

---

### Task 5.2: Add `priority` to homepage listing grid (#36)

**Files:**

- Modify: Homepage component that renders the listing grid

- [ ] **Step 1: Find and update the listing card rendering**

Pass `priority={index === 0}` to the first `ListingCard` in the homepage grid for LCP optimization.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "perf: add priority to first listing card on homepage for LCP optimization"
```

---

### Task 5.3: Migrate raw `fetch()` calls to shared fetch wrapper (#29)

**Files:**

- Modify: `src/features/shops/services/shop.ts` (lines 113, 122 — `deleteShop`, `updateShopSlug`)
- Modify: `src/features/listings/services/listing.ts` (line ~70 — `deleteDraft`)

- [ ] **Step 1: Update shop service `deleteShop` and `updateShopSlug`**

Replace direct `fetch()` calls with the shared `del` and `post` helpers from `@/libs/fetch`:

```typescript
import { del, post } from '@/libs/fetch';

export async function deleteShop(id: string): Promise<void> {
  await del(`/api/shops/${id}`);
}

export async function updateShopSlug(shopId: string, slug: string): Promise<void> {
  await post('/api/shops/slug', { shopId, slug });
}
```

- [ ] **Step 2: Update listing service `deleteDraft`**

Replace direct `fetch()` with the shared `del` helper.

- [ ] **Step 3: Verify build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/shops/services/shop.ts src/features/listings/services/listing.ts
git commit -m "refactor: migrate raw fetch() calls to shared fetch wrapper in shops and listings services"
```

---

## Phase 6: Storage & Slug Integrity

**Findings:** #16, #17
**Branch:** `fix/storage-slug-integrity`

### Task 6.1: Verify storage bucket RLS in Supabase Dashboard (#16)

This is a **manual task** — cannot be done via code.

- [ ] **Step 1: Open Supabase Dashboard → Storage → Policies**
- [ ] **Step 2: Verify `avatars` bucket has RLS policies**
  - Users can only upload/delete files matching their own user_id path
- [ ] **Step 3: Verify `listing-images` bucket has RLS policies**
  - Users can only upload/delete files under their own `{user_id}/` prefix
- [ ] **Step 4: If policies are missing, add them via the Dashboard SQL editor**
- [ ] **Step 5: Document findings in `docs/checkpoint-audit-findings.md`**

---

### Task 6.2: Add self-removal to shop_members RLS (#17)

**Files:**

- Create: `supabase/migrations/YYYYMMDDHHMMSS_allow_shop_member_self_removal.sql`

- [ ] **Step 1: Write migration**

```sql
-- Allow shop members to remove themselves (leave a shop)
DROP POLICY IF EXISTS "Shop owner can remove members" ON public.shop_members;

CREATE POLICY "Shop owner or self can remove members"
  ON public.shop_members FOR DELETE
  TO authenticated
  USING (
    -- Owner can remove anyone
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE id = shop_members.shop_id
        AND owner_id = (SELECT auth.uid())
    )
    OR
    -- Members can remove themselves
    member_id = (SELECT auth.uid())
  );
```

- [ ] **Step 2: Apply and regenerate types**

Run: `pnpm db:types`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/ src/types/database.ts
git commit -m "fix(rls): allow shop members to remove themselves from shops"
```

---

## Phase 7: Test Coverage

**Findings:** #25, #26, #27, #28
**Branch:** `test/core-feature-coverage`

> **Note:** This phase should be implemented using the `/write-tests` skill for each feature domain. The skill generates Vitest tests following Nessi's established patterns.

### Task 7.1: Members domain tests (#25)

- [ ] Run `/write-tests "src/features/members/services/member.ts"`
- [ ] Run `/write-tests "src/features/members/hooks/use-member.ts"`
- [ ] Run `/write-tests "src/features/members/services/seller.ts"`
- [ ] Verify: `pnpm test:run`
- [ ] Commit

### Task 7.2: Shops domain tests (#26)

- [ ] Run `/write-tests "src/features/shops/services/shop.ts"`
- [ ] Run `/write-tests "src/features/shops/hooks/use-shops.ts"`
- [ ] Verify: `pnpm test:run`
- [ ] Commit

### Task 7.3: Listings domain tests (#27)

- [ ] Run `/write-tests "src/features/listings/services/listing.ts"`
- [ ] Run `/write-tests "src/features/listings/hooks/use-listings.ts"`
- [ ] Verify: `pnpm test:run`
- [ ] Commit

### Task 7.4: API route tests (#28)

- [ ] Run `/write-tests "src/app/api/listings/[id]/route.ts"`
- [ ] Run `/write-tests "src/app/api/shops/[id]/route.ts"`
- [ ] Run `/write-tests "src/app/api/auth/delete-account/route.ts"`
- [ ] Verify: `pnpm test:run`
- [ ] Commit

---

## Remaining Items (Deferred / Decision Required)

These items require product decisions before implementation:

| #   | Item                                        | Decision Needed                                               |
| --- | ------------------------------------------- | ------------------------------------------------------------- |
| 11  | `watcher_count` displayed but never written | Implement watcher feature or remove display?                  |
| 12  | `reserved` listing status unreachable       | Implement reservation flow or remove from enum?               |
| 13  | `split` shipping option blocked             | Implement split shipping or remove from enum?                 |
| 23  | Shop member management UI missing           | Build UI now or defer to shop membership feature?             |
| 30  | Registration rate limiting                  | Requires Vercel WAF or Upstash Redis — configure in dashboard |
| 31  | View count rate limiting                    | Requires application-level throttle or WAF rule               |
| 32  | Upload rate limiting                        | Requires per-user quota tracking                              |

---

## Execution Order

```
Phase 1 (CASCADE)  ──→ Phase 2 (SECURITY) ──→ Phase 3 (API-FIRST)
                                              ↓
Phase 4 (SCHEMA) ←───────────────────────────┘
                   ↓
Phase 5 (REPO) ──→ Phase 6 (STORAGE/SLUG) ──→ Phase 7 (TESTS)
```

Phases 1-3 must be sequential (they modify overlapping files). Phases 4-7 can be parallelized.
