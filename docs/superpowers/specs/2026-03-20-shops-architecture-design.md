# Shops Architecture — Design Spec

**Date:** 2026-03-20
**Status:** Draft
**Authors:** Kyle Holloway, Paul (Product), Claude (Conductor)

---

## 1. Overview

Nessi separates personal identity (members) from business identity (shops). Every registered user is a member. Members can optionally sell items on their profile or create a premium shop for a full-featured storefront. Guest checkout allows purchases without an account (future).

### Account Tiers

| Tier | Entity | Can Buy | Can Sell | URL | Cost |
|------|--------|---------|----------|-----|------|
| Guest (future) | none | yes (checkout only) | no | n/a | free |
| Member (buyer) | `members` | yes | no | `/member/{slug}` | free |
| Member (buyer+seller) | `members` | yes | yes (basic) | `/member/{slug}` | free |
| Shop | `shops` | no | yes (premium) | `/shop/{slug}` | subscription |

### Key Principles

- Members are people. Shops are businesses.
- `is_seller` on the member profile is a personal preference toggle — independent of shop ownership.
- A member can own/manage a shop without `is_seller` enabled on their member profile.
- Products belong to either a member or a shop via dual FK columns (not polymorphic `owner_type`).
- Shops are a premium subscription with features that free member-sellers don't get.
- Guest checkout is planned but not part of the initial implementation.
- Slugs are globally unique across members and shops via a shared `slugs` lookup table.

---

## 2. Domain Model

### 2.1 `members` table (renamed from `profiles`)

The member is a person. Every registered user has one.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | FK → `auth.users.id` ON DELETE CASCADE |
| `display_name` | TEXT NOT NULL | community identity (3-40 chars), shown in navbar, messaging, reviews |
| `first_name` | TEXT | nullable, legal/personal name |
| `last_name` | TEXT | nullable, legal/personal name |
| `slug` | TEXT UNIQUE NOT NULL | member handle, e.g., `kyle-holloway-4829` |
| `avatar_url` | TEXT | nullable |
| `bio` | TEXT | nullable, 280 char max |
| `is_seller` | BOOLEAN | default false, toggled in member settings |
| `primary_species` | TEXT[] | fishing preferences (for product recommendations) |
| `primary_technique` | TEXT[] | fishing preferences |
| `home_state` | TEXT | nullable |
| `years_fishing` | INTEGER | nullable |
| `notification_preferences` | JSONB | email notification toggles |
| `stripe_account_id` | TEXT | personal Stripe Connect (for member-level selling) |
| `is_stripe_connected` | BOOLEAN | default false |
| `stripe_onboarding_status` | TEXT | default 'not_started' |
| `onboarding_completed_at` | TIMESTAMPTZ | nullable |
| `average_rating` | DECIMAL | nullable, computed from reviews |
| `review_count` | INTEGER | default 0 |
| `total_transactions` | INTEGER | default 0 |
| `response_time_hours` | DECIMAL | nullable |
| `last_seen_at` | TIMESTAMPTZ | nullable |
| `deleted_at` | TIMESTAMPTZ | nullable (soft delete) |
| `created_at` | TIMESTAMPTZ | default now() |
| `updated_at` | TIMESTAMPTZ | default now(), auto-updated |

**`display_name`** is the member's community-facing identity (required, unique via case-insensitive index). It is what shows in the navbar, messaging threads, and reviews. First/last name are optional personal details shown on the member's profile page.

**`shop_name`** is removed — it now lives on the `shops` table.

**Behavior when `is_seller` is toggled off:** Member listings are hidden from public view (not deleted). The member can toggle it back on to restore visibility.

### 2.2 `shops` table (new)

A shop is a business entity. Created by a member, owned independently.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | default gen_random_uuid() |
| `owner_id` | UUID NOT NULL | FK → `members.id` ON DELETE RESTRICT |
| `shop_name` | TEXT NOT NULL | not unique — multiple shops can share a name |
| `slug` | TEXT UNIQUE NOT NULL | unique handle, e.g., `kyles-tackle-shop` |
| `avatar_url` | TEXT | nullable |
| `description` | TEXT | nullable |
| `hero_banner_url` | TEXT | nullable (premium feature) |
| `brand_colors` | JSONB | nullable, e.g., `{ "primary": "#2563eb", "accent": "#f59e0b" }` |
| `is_verified` | BOOLEAN | default false |
| `subscription_tier` | TEXT | 'basic' or 'premium', default 'basic' |
| `subscription_status` | TEXT | 'active', 'past_due', 'cancelled', 'trialing' |
| `stripe_account_id` | TEXT | shop's own Stripe Connect account |
| `is_stripe_connected` | BOOLEAN | default false |
| `stripe_onboarding_status` | TEXT | default 'not_started' |
| `stripe_subscription_id` | TEXT | Stripe subscription for shop premium |
| `average_rating` | DECIMAL | nullable |
| `review_count` | INTEGER | default 0 |
| `total_transactions` | INTEGER | default 0 |
| `deleted_at` | TIMESTAMPTZ | nullable (soft delete) |
| `created_at` | TIMESTAMPTZ | default now() |
| `updated_at` | TIMESTAMPTZ | default now(), auto-updated |

**Constraints:**
- `slug` format: `^[a-z0-9][a-z0-9-]*[a-z0-9]$`
- `slug` globally unique (enforced via `slugs` table — see Section 2.5)
- `shop_name` length: 3-60 characters
- `brand_colors` validated at the application layer (hex color format)

**`owner_id` uses ON DELETE RESTRICT** (not CASCADE). A member who owns a shop must transfer ownership or delete the shop before deleting their account. This protects other shop members and prevents accidental destruction of a business entity with active orders.

**Shop name disambiguation:** Multiple shops can share a name. The UI disambiguates in search results and messaging via the slug/handle (e.g., "Kyle's Tackle (@kyles-tackle-shop)") and verified badges where applicable.

### 2.3 `shop_members` table (new)

Join table for multi-admin support (premium shops).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | default gen_random_uuid() |
| `shop_id` | UUID | FK → `shops.id` ON DELETE CASCADE |
| `member_id` | UUID | FK → `members.id` ON DELETE CASCADE |
| `role` | TEXT | 'owner', 'admin', 'contributor' |
| `created_at` | TIMESTAMPTZ | default now() |

**Constraints:**
- UNIQUE on `(shop_id, member_id)` — a member can only have one role per shop
- UNIQUE partial index: one `owner` per shop (`CREATE UNIQUE INDEX ... WHERE role = 'owner'`)
- Only premium shops can have more than one `shop_members` entry (enforced at application layer)

**`shops.owner_id` vs `shop_members` owner role:** `shops.owner_id` is the canonical owner reference (used for account deletion checks, billing). The `shop_members` entry with `role = 'owner'` is created automatically when a shop is created and must always match `shops.owner_id`. Ownership transfer updates both atomically.

**Roles:**
- `owner` — full control, billing, can delete shop, transfer ownership
- `admin` — manage listings, respond to messages, view analytics
- `contributor` — create/edit listings only

**Initial implementation:** One shop per member (enforced at application layer). Multi-shop support is architecturally supported but gated.

### 2.4 `products` table (modified)

Products belong to either a member or a shop via two nullable FK columns.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | existing |
| `member_id` | UUID | FK → `members.id` ON DELETE CASCADE, nullable |
| `shop_id` | UUID | FK → `shops.id` ON DELETE CASCADE, nullable |
| `title` | TEXT NOT NULL | existing |
| `description` | TEXT | existing |
| `price` | DECIMAL NOT NULL | existing |
| `is_visible` | BOOLEAN | default true, set false when `is_seller` toggled off |
| `created_at` | TIMESTAMPTZ | existing |

**Constraints:**
- CHECK: `(member_id IS NOT NULL AND shop_id IS NULL) OR (member_id IS NULL AND shop_id IS NOT NULL)` — exactly one owner
- FK constraints provide real referential integrity and cascade behavior
- When a member deletes their account, their member-owned products cascade delete
- When a shop is deleted, its shop-owned products cascade delete

**Migration:** Drop `user_id` column, add `member_id` + `shop_id`. No data migration needed (no production data).

**RLS policies:** Straightforward — `auth.uid() = member_id` for member-owned products, or `auth.uid() IN (SELECT member_id FROM shop_members WHERE shop_id = products.shop_id)` for shop-owned products.

### 2.5 `slugs` table (new)

Global slug uniqueness across members and shops.

| Column | Type | Notes |
|--------|------|-------|
| `slug` | TEXT PK | the unique slug |
| `entity_type` | TEXT NOT NULL | 'member' or 'shop' |
| `entity_id` | UUID NOT NULL | references `members.id` or `shops.id` |
| `created_at` | TIMESTAMPTZ | default now() |

**Atomic slug operations:** All slug creation and updates go through a `reserve_slug(slug, entity_type, entity_id)` database function that:
1. Validates slug format
2. Inserts into `slugs` table (fails if taken)
3. Updates the entity's `slug` column
4. All within a single transaction

**`handle_new_user()` trigger** is updated to call `reserve_slug()` when creating a member's initial slug.

**`check_slug_available(slug)` function** replaces the current `checkSlugAvailable` service — queries the `slugs` table instead of individual entity tables.

---

## 3. Onboarding Flows

### 3.1 Registration + Initial Onboarding

**Step 1 (everyone):**
- Upload avatar
- Set display name (community identity)
- Set first name, last name (optional)
- Pick member handle (slug) — checked for global uniqueness via `slugs` table

**Step 2 (branch point):**
- "How do you plan to use Nessi?"
  - "I'm here to buy" → buyer path
  - "I want to buy and sell" → seller opt-in path

**Buyer path:**
- Step 3: Fishing preferences (species, techniques, home state)
- Done → lean buyer dashboard

**Seller opt-in path:**
- Step 3: Fishing preferences (same)
- Step 4: "How do you want to sell?"
  - **Free** — sell on your member profile → sets `is_seller = true`, optional Stripe setup
  - **Shop** (premium) — create a shop → shop creation mini-flow (name, slug, avatar), subscription signup
- Done → full dashboard with selling features

### 3.2 Seller Opt-In via Dashboard (post-onboarding)

For members who chose buyer-only and later want to sell:

- Dashboard → "Start selling" CTA
- Same Step 4 from above: free member selling OR premium shop
- If free: mini onboarding (seller terms, Stripe setup), `is_seller = true`
- If shop: shop creation flow + subscription

### 3.3 Shop Creation (anytime)

Available to any member, regardless of `is_seller` status:

- Dashboard → "Create a Shop" CTA
- Shop name, shop handle (slug), shop avatar, description
- Subscription plan selection
- Stripe Connect onboarding for the shop
- Shop created, member added to `shop_members` as owner

### 3.4 `is_seller` Toggle

Available in member settings AND during onboarding. Can be toggled on/off at any time:
- **On:** Member can list products, seller features visible in dashboard, listings visible on public profile
- **Off:** Member-owned listings set `is_visible = false` (not deleted), seller features hidden from dashboard, can toggle back on

Independent of shop ownership. A member can have `is_seller = false` and still own/manage a shop.

---

## 4. Free Member Seller vs Premium Shop

| Feature | Free Member Seller | Premium Shop |
|---------|-------------------|--------------|
| List products | yes (capped, configurable limit) | unlimited |
| Product images | limited per listing | more per listing |
| Product video | no | yes |
| Public page | `/member/{slug}` (basic layout) | `/shop/{slug}` (custom branding) |
| Hero banner | no | yes |
| Custom brand colors | no | yes |
| Verified badge | no | yes (after business verification) |
| Analytics | basic (views, sales count) | detailed dashboard |
| Multiple admins/contributors | no (solo) | yes |
| Separate identity/inbox | no (uses member identity) | yes (shop identity) |
| Shipping options | standard | premium options/discounts |
| Stripe account | member's personal | shop's own business account |

**Exact limits** (listing count, image count, etc.) are configurable via a limits config — not hardcoded. This allows easy tuning and A/B testing.

### 4.1 Upsell Touchpoints

Contextual upsells appear at natural friction points for free member-sellers:

- Hit image limit on a listing → "Want more images? Create a shop"
- Try to add video → "Video is a shop feature"
- Hit listing cap → "Upgrade to unlimited listings with a shop"
- Want better analytics → "Detailed analytics with a shop"
- Want shipping discounts → "Shop members get preferred rates"
- Want team management → "Add admins with a premium shop"

Each upsell links directly to the shop creation flow.

---

## 5. Navigation & Account Switching

### 5.1 Navbar User Dropdown

Current member context shows in the navbar (avatar + name):

**For members without shops:**
```
[Avatar] Kyle Holloway ▾
├── Dashboard
├── Account
├── Settings
└── Log out
```

**For members with shop(s):**
```
[Avatar] Kyle Holloway ▾        ← or shop avatar/name if in shop context
├── Dashboard
├── Account
├── Settings
├── ─────────────
├── Switch to: Kyle's Tackle Shop    ← only shows when not in shop context
├── Switch to: Member Account        ← only shows when in shop context
└── Log out
```

If a member manages multiple shops, all are listed in the switch section.

### 5.2 Context Switching Architecture

**Storage:** Active context stored in a Zustand store (`useContextStore`) with the shape:
```typescript
{
  activeContext: { type: 'member' } | { type: 'shop', shopId: string }
}
```

**Persistence:** Context persisted to `localStorage` so it survives page refresh. Defaults to member context on login.

**Server-side propagation:** Context is sent as a custom header (`X-Nessi-Context: member` or `X-Nessi-Context: shop:{shopId}`) on API requests. Server-side routes use this to scope queries appropriately.

**`proxy.ts` awareness:** Proxy does NOT need context awareness — it only handles auth session refresh and route protection. Context is an application-layer concern.

**Context switching flow:**
1. User clicks "Switch to: Kyle's Tackle Shop" in dropdown
2. Zustand store updates `activeContext`
3. `localStorage` synced
4. Dashboard re-renders with shop-scoped data
5. Navbar avatar/name updates to shop identity

### 5.3 Cross-Notifications (future)

Notifications bridge contexts — this is aspirational and not part of the initial implementation:
- "Kyle's Tackle Shop received a new order" → appears in member notifications with "Switch to shop" action
- "Kyle Holloway, someone messaged you about your rod listing" → appears in shop notifications with "Switch to member" action

---

## 6. Public Pages

### 6.1 Member Profile (`/member/{slug}`)

Always exists for every member. Content varies by role:

**Buyer-only member:**
- Avatar, display name, handle
- Member since date
- Buyer reviews
- Fishing preferences (species, techniques)

**Member with `is_seller = true`:**
- Everything above, plus:
- Product listings grid (only `is_visible = true` products)
- Seller reviews
- Response time, transaction count

### 6.2 Shop Page (`/shop/{slug}`)

Only exists for shops. Premium features progressively enhance the page:

**Basic shop:**
- Shop avatar, name, handle
- Description
- Product listings grid
- Shop reviews, transaction count

**Premium shop (additions):**
- Hero banner image
- Custom brand colors applied to page
- Verified badge
- Enhanced layout options

---

## 7. Impact on Existing Codebase

### Tables

| Table | Action |
|-------|--------|
| `profiles` | Rename to `members`, drop `shop_name`, restore `display_name` |
| `shops` | Create new |
| `shop_members` | Create new |
| `slugs` | Create new (global slug uniqueness) |
| `products` | Drop `user_id`, add `member_id` + `shop_id` with CHECK constraint |

### Features

| Feature | Action |
|---------|--------|
| Onboarding wizard | Rework: add buyer/seller branch, seller opt-in steps, shop creation flow |
| Account page | Rework: restore display_name, add `is_seller` toggle in settings, "Create Shop" CTA |
| Dashboard | Add context switching (member vs shop), conditional feature rendering |
| Navbar | Add shop switcher to user dropdown |
| Product listings | Update to use dual FK columns |
| Auth/proxy | No changes needed — context is application-layer |
| Public profiles | Build `/member/{slug}` and `/shop/{slug}` pages |

### Files Renamed

| Old | New |
|-----|-----|
| `src/features/profiles/` | `src/features/members/` |
| `src/types/database.ts` (profiles references) | Updated to `members` |
| All `profile` imports/hooks/services | Renamed to `member` equivalents |
| `checkShopNameAvailable` | Reverted to `checkDisplayNameAvailable` (for member display names) |

**Rename strategy:** Execute as an isolated step (not mixed with feature work). Run full CI pipeline after to catch any missed references.

### New Feature Domains

| Domain | Purpose |
|--------|---------|
| `src/features/shops/` | Shop CRUD, shop members, shop settings, shop page |
| `src/features/subscriptions/` | Shop subscription management, Stripe billing |
| `src/features/context/` | Active context (member vs shop) provider, switcher |

---

## 8. Account Deletion Rules

### Member Account Deletion

A member cannot delete their account if they own a shop. The database enforces this via `ON DELETE RESTRICT` on `shops.owner_id`. The deletion flow:

1. Member requests account deletion
2. System checks: does this member own any shops?
   - **Yes** → Block deletion. Show message: "You own [shop name]. Please delete or transfer your shop before deleting your account."
   - **No** → Proceed with deletion
3. On deletion:
   - `auth.users` row deleted
   - `members` row cascades (FK ON DELETE CASCADE)
   - Member-owned products cascade delete
   - `shop_members` entries cascade delete (member removed from any shops they were admin/contributor on)
   - `slugs` entry for member's slug cleaned up via trigger
   - Avatar and product images cleaned up via `handle_member_deletion()` trigger (same pattern as current `handle_profile_deletion()`)

### Shop Deletion

Only the shop owner can delete a shop. The deletion flow:

1. Owner requests shop deletion from shop settings
2. Confirmation modal with warning about permanent data loss
3. On deletion (soft delete → `deleted_at` set):
   - Shop-owned products soft deleted
   - `shop_members` entries remain (for audit trail)
   - `slugs` entry released (slug becomes available again)
   - Stripe subscription cancelled
4. Hard delete after retention period (or immediate if no transaction history)

---

## 9. Future Considerations

Ideas captured during design that will be implemented later. The schema should be flexible enough to support these without major rework.

### Badges & Achievements

A `badges` table linking to members and/or shops:

| Badge | Criteria | Applies To |
|-------|----------|------------|
| Quick Responder | < 1hr average response time | members, shops |
| Fast Shipper | consistently ships within 24hrs | members (seller), shops |
| Power Seller | 50+ items sold | members (seller), shops |
| Veteran Member | member since 1+ year | members |
| Verified Business | completed business verification | shops |
| Top Rated | 4.8+ average rating with 10+ reviews | members, shops |

Schema sketch (not implemented now):
```
badges (id, key TEXT UNIQUE, label, description, icon_url, criteria JSONB)
member_badges (member_id FK, badge_id FK, earned_at)
shop_badges (shop_id FK, badge_id FK, earned_at)
```

Badges could be computed by a cron job or triggered by events (e.g., "50th sale → award Power Seller").

### Similar Fishing Styles

On member profile pages, show "Members with similar fishing styles" based on overlap in `primary_species` and `primary_technique` arrays. This is a read-time computation (array intersection) — no schema changes needed, just a query:

```sql
SELECT * FROM members
WHERE id != :current_member_id
  AND primary_species && :member_species  -- array overlap operator
  AND primary_technique && :member_technique
ORDER BY array_length(primary_species & :member_species, 1) DESC
LIMIT 6;
```

Could also power product recommendations: "Anglers like you bought..." using the same preference matching.

### Other Future Ideas

- **Favorite shops / follow members** — `follows` table with polymorphic target
- **Shop collections / categories** — organized product groupings within a shop
- **Member wishlists** — saved products across shops
- **Activity feed** — "Kyle listed a new rod" style updates
- **Referral program** — member invites, tracked via referral codes

---

## 10. What This Spec Does NOT Cover

These are future concerns, not part of the initial implementation:

- Orders/transactions table and checkout flow
- Guest checkout implementation
- Messaging system (member-to-member, member-to-shop)
- Review system
- Search and discovery
- Stripe payment processing details
- Subscription billing implementation details (Stripe subscription webhooks, etc.)
- Shop analytics dashboard
- Shipping integration
- Business verification flow
- Exact listing/image limits (configurable, tuned later)
- Cross-context notification system (Section 5.3)
- Multi-shop per member (architecturally supported, gated at application layer)
- Badges & achievements system (see Section 9)
- Similar fishing styles feature (see Section 9)
- Favorites / follows / wishlists
