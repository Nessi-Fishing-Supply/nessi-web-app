# Nessi Checkpoint Audit — Findings

> **Date:** 2026-03-22
> **Branch:** main (a396af2)
> **Domains audited:** auth, members, shops, listings, context, shared

---

## Phase 1: Schema & Naming

### Tables

| Table                | Status  | Decision                                                 |
| -------------------- | ------- | -------------------------------------------------------- |
| `members`            | ACTIVE  | KEEP — full CRUD                                         |
| `shops`              | ACTIVE  | KEEP — full CRUD                                         |
| `shop_members`       | ACTIVE  | KEEP — full CRUD                                         |
| `listings`           | ACTIVE  | KEEP — renamed from `products`                           |
| `listing_photos`     | ACTIVE  | KEEP — renamed from `product_images`                     |
| `listing_drafts`     | DROPPED | REMOVE — drafts are now `listings` with `status='draft'` |
| `slugs`              | ACTIVE  | KEEP — cross-entity uniqueness via RPCs                  |
| `search_suggestions` | UNUSED  | DEFER — zero code references, future search autocomplete |

### Columns — Unused / Schema-Only

**Members:**

- `is_stripe_connected`, `stripe_account_id`, `stripe_onboarding_status` — KEEP (Stripe Connect planned)
- `average_rating`, `review_count` — KEEP (read on public profile, reviews planned)
- `response_time_hours` — KEEP (read on public profile, messaging planned)
- `total_transactions` — KEEP (read on public profile, orders planned)
- `last_seen_at` — KEEP (never written — needs implementation or removal decision)

**Shops:**

- All Stripe/subscription columns — KEEP (payments planned)
- `brand_colors` — DEFER (completely unreferenced, no planned use documented)
- `hero_banner_url` — KEEP (used in storage cleanup, TODO for premium shops)
- `is_verified` — KEEP (verification feature planned)
- `average_rating`, `review_count`, `total_transactions` — KEEP (some read on public shop page)

**Listings:**

- `search_vector` — ACTIVE (DB trigger + full-text search in API)
- `view_count` — ACTIVE (incremented via API, displayed in dashboard)
- `favorite_count` — SCHEMA-ONLY, KEEP (favorites not built yet)
- `inquiry_count` — SCHEMA-ONLY, KEEP (messaging not built)
- `weight_oz`, `shipping_paid_by`, `shipping_price_cents` — ACTIVE
- `published_at`, `sold_at` — ACTIVE (auto-set on status transitions)
- `watcher_count` — DEFERRED (displayed but never written) — placeholder for future favorites/watchlist feature. Display handles zero gracefully.
- `member_id` vs `seller_id` — Both needed: `seller_id` = auth user (authorization), `member_id` = member identity context (null when selling under a shop)

### Enums

| Enum                | Issue                                                                                                                                          | Tag      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `listing_status`    | `reserved` value unreachable — removed from app code (state machine, labels, UI). Retained in DB enum for future checkout/reservation feature. | RESOLVED |
| `shipping_paid_by`  | `split` value blocked by validation — form only allows buyer/seller. Kept in DB enum for future shipping options expansion.                    | RESOLVED |
| `listing_category`  | Photo guidance has keys `lures_hard`/`lures_soft` that don't match `lures` enum                                                                | FIX      |
| `listing_condition` | All 6 values fully integrated                                                                                                                  | PASS     |

### RPCs

| RPC                    | Status                | Tag                                    |
| ---------------------- | --------------------- | -------------------------------------- |
| `check_slug_available` | ACTIVE                | KEEP                                   |
| `reserve_slug`         | ACTIVE                | KEEP                                   |
| `release_slug`         | Defined, never called | FIX — should be called during deletion |
| `show_limit`           | Defined, never called | REMOVE — debug utility                 |
| `show_trgm`            | Defined, never called | DEFER — future search feature          |

### Slugs Table — No FK Relationships

The `slugs` table uses a polymorphic pattern (`entity_type` + `entity_id`) with **no foreign keys**. Integrity is enforced only by RPC functions. If a member or shop is deleted without calling `release_slug`, the slug row is orphaned. No `ON DELETE CASCADE` exists. **FIX** — either add proper FK relationships or ensure DB triggers reliably call `release_slug`.

### Naming — Resolved

Feature naming is consistently "listings" throughout. Table naming is consistently `listing_photos`. No legacy "products" references in active code.

---

## Phase 2: API-First Assessment

### Auth — FULLY COMPLIANT

All 7 operations correctly placed. No migrations needed.

### Members — FULLY COMPLIANT

All operations correctly placed. No migrations needed.

### Shops — 4 MIGRATIONS NEEDED

| Operation             | Risk     | Issue                                       | Action                                                 |
| --------------------- | -------- | ------------------------------------------- | ------------------------------------------------------ |
| `createShop()`        | CRITICAL | No atomic slug reservation — race condition | MIGRATE to `POST /api/shops`                           |
| `transferOwnership()` | CRITICAL | Non-atomic 4-step multi-table update        | MIGRATE to `POST /api/shops/[id]/ownership`            |
| `addShopMember()`     | HIGH     | No explicit authorization at API layer      | MIGRATE to `POST /api/shops/[id]/members`              |
| `removeShopMember()`  | HIGH     | Same as addShopMember                       | MIGRATE to `DELETE /api/shops/[id]/members/[memberId]` |
| `updateShop()`        | Low      | RLS sufficient, no audit trail              | KEEP (document assumption)                             |
| All reads             | None     | RLS-protected                               | KEEP                                                   |

### Listings — 3 FIXES NEEDED

| Operation                | Risk           | Issue                                                                         | Action                                      |
| ------------------------ | -------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| `deleteListingPhoto`     | SECURITY       | No listing ownership verification — any auth user can delete any photo by URL | FIX — add ownership check                   |
| `GET /api/listings/[id]` | SECURITY       | Returns draft listings publicly                                               | FIX — return 404 for drafts to non-owners   |
| `PUT /api/listings/[id]` | DATA INTEGRITY | No server-side field whitelist                                                | FIX — add field whitelist + type validation |

### Service Pattern Boundary Rule

**Direct Supabase (acceptable):**

- All read-only queries (RLS sufficient)
- Simple single-row updates with RLS protection
- Supabase SDK auth operations (login, logout, password)

**API Route (required):**

- Multi-table orchestration
- Operations with side effects
- File processing (Sharp requires Node.js)
- Authorization-gated writes beyond simple RLS
- Status transitions with business rules

---

## Phase 3: Security Hardening

### RLS Policies

| Table                | SELECT | INSERT | UPDATE | DELETE | Notes                                               |
| -------------------- | ------ | ------ | ------ | ------ | --------------------------------------------------- |
| `members`            | PASS   | PASS   | PASS   | N/A    | DELETE via CASCADE only (intentional)               |
| `shops`              | PASS   | PASS   | PASS   | PASS   | Owner/admin UPDATE                                  |
| `shop_members`       | PASS   | PASS   | PASS   | PASS   | Fixed recursion bug. Gap: members can't self-remove |
| `listings`           | PASS   | PASS   | PASS   | PASS   | Dual ownership (seller + shop context)              |
| `listing_photos`     | PASS   | PASS   | PASS   | PASS   | Follows parent listing visibility                   |
| `slugs`              | PASS   | N/A    | N/A    | N/A    | Write-protected via SECURITY DEFINER RPCs           |
| `search_suggestions` | PASS   | N/A    | N/A    | N/A    | Service role only (intentional)                     |

### API Route Auth Checks

- 15/15 protected routes have `getUser()` checks — PASS
- 4 public routes correctly skip auth — PASS
- `DELETE /api/listings/upload/delete` has auth but no ownership check — already flagged
- **NEW:** `Cache-Control: private, no-store` headers missing from 20 authenticated routes

### Input Validation

- Registration validation: PASS (server-side `validateRegisterInput()`)
- File upload validation: PASS (MIME whitelist, size limits, Sharp content parsing)
- Parameterized queries: PASS (all Supabase client, no raw SQL)
- Open redirect prevention: PASS (`sanitizeRedirectPath()`)
- Slug sanitization: PASS (RPCs handle format validation)
- Listing PUT body validation: FAIL (already flagged in Phase 2)

### Storage Security

- Upload paths include user_id: PASS
- Ownership verified before upload: PASS
- Public buckets appropriate for marketplace: PASS
- **Bucket RLS policies: CANNOT VERIFY** — no SQL migrations for storage policies, must check Supabase dashboard

### Session Security

- Cookie-only sessions (no localStorage): PASS
- `proxy.ts` refreshes session every request via `getUser()`: PASS
- Dashboard routes gated: PASS
- Auth pages redirect authenticated users: PASS
- Admin client disables session persistence: PASS

---

## Phase 4: Cascade Deletion

### CRITICAL: `listings.seller_id ON DELETE RESTRICT` Blocks Member Deletion

Member account deletion **fails** for any member with personal listings. The cascade chain:

1. Storage cleanup runs (avatar, photos deleted) — succeeds
2. Slug deleted — succeeds
3. `auth.admin.deleteUser()` cascades to `members` row
4. PostgreSQL hits `listings.seller_id ON DELETE RESTRICT` — **CONSTRAINT VIOLATION**
5. Entire cascade rolls back — auth user still exists, but storage already deleted

**Impact:** Orphaned state — images gone, slug freed, account still exists, listings have broken URLs.

### CRITICAL: Listing Deletion Has No Storage Cleanup

`DELETE /api/listings/[id]` soft-deletes the listing but never removes images from `listing-images` bucket. `listing_photos` DB rows cascade-delete, but WebP files are orphaned in storage.

### GAP: Shop Deletion Doesn't Release Slug

`DELETE /api/shops/[id]` soft-deletes the shop but doesn't release the slug from the `slugs` table. The slug remains reserved and cannot be reused.

### Deletion Matrix

| Entity Deleted         | Listings           | Photos (DB) | Photos (Storage)  | Shop Members | Slugs              |
| ---------------------- | ------------------ | ----------- | ----------------- | ------------ | ------------------ |
| **Member Account**     | BLOCKED (RESTRICT) | CASCADE     | MANUAL CLEANUP    | CASCADE      | MANUAL CLEANUP     |
| **Shop**               | CASCADE            | CASCADE     | MANUAL CLEANUP    | CASCADE      | GAP (not released) |
| **Individual Listing** | N/A                | CASCADE     | GAP (not cleaned) | N/A          | N/A                |

### Other Gaps

- Storage cleanup runs BEFORE auth deletion — partial state on failure (medium)
- Shop soft-delete orphans listings — remain active with null shop reference (low)

---

## Phase 5: UI Coverage

### Auth — 8/8 PASS

All flows have UI surfaces (login/register modals, forgot/reset password, verification, logout, account deletion).

### Members — 9/9 PASS

All flows covered (profile edit, fishing identity, notifications, seller toggle, onboarding, public profile, completeness).

### Shops — 8/9

- All flows covered except **shop member management** (add/remove/invite) — MISSING
- Shop subscription section shows "Coming Soon" placeholder — EXPECTED

### Listings — 9/9 PASS

All flows covered (create wizard, dashboard with status tabs, edit wizard, delete, photos, detail page, status management, drafts, browse).

### Expected Gaps (Future Features)

- Favorites: toggle exists, no "my favorites" page — EXPECTED
- Search: navbar form exists but disabled — EXPECTED
- Reviews: star component exists, no submission flow — EXPECTED

---

## Phase 6: Repo Organization

### Component Placement

- `AvatarUpload` → MOVE to `src/components/controls/` (used by members + shops, 3 locations)
- `context/` feature → KEEP (infrastructure-specific, not generic)
- `shared/` utilities → KEEP (correctly placed)

### Validation Consistency

- 100% Yup across all features — no Zod. No inconsistency.

### Service Pattern

- Listings: consistently uses fetch wrapper → API routes
- Members/Shops: mix of direct Supabase + API routes (documented in Phase 2)
- Auth: intentionally uses direct `fetch()` for timeout control
- Minor: some shops/listings services use raw `fetch()` instead of wrapper

### Naming

- Kebab-case fully compliant
- Products → Listings rename complete, zero legacy code

---

## Phase 7: Cross-Cutting Quality

### Error Handling — PASS

Consistent `{ error }` format, FetchError properly used, try/catch on all routes.

### Type Safety — PASS

Zero `any` types in critical paths. Database types current (Mar 22). All feature types derive from `Database` schema.

### Test Coverage — CRITICAL GAP

| Feature    | Test Files           | Status                               |
| ---------- | -------------------- | ------------------------------------ |
| auth       | 6 files (61+ tests)  | Well tested                          |
| members    | 0                    | No tests                             |
| shops      | 0                    | No tests                             |
| listings   | 1 (utility only)     | Missing service/hook/component tests |
| context    | 0                    | No tests                             |
| API routes | 1 (register only)    | 18+ routes untested                  |
| shared     | 1 (`use-form-state`) | OK                                   |
| proxy      | 1                    | OK                                   |

### Stubs & Landmines — PASS

Only 2 TODOs: orders count placeholder in seller-preconditions, hero banner on shop page.

### Query Key Conventions — MINOR

Mostly consistent (`['domain', ...params]`). No centralized key registry. Mutations use broad invalidation (`['listings']` invalidates all). Could optimize but not blocking.

---

## Supplemental Checks

### CLAUDE.md Accuracy — 96% Accurate

| File               | Status          | Issues                                                                          |
| ------------------ | --------------- | ------------------------------------------------------------------------------- |
| Root CLAUDE.md     | STALE           | 3 references to "products" that should say "listings" (lines 72, 102, 118, 123) |
| auth/CLAUDE.md     | ACCURATE        | No changes needed                                                               |
| members/CLAUDE.md  | ACCURATE        | No changes needed                                                               |
| shops/CLAUDE.md    | ACCURATE        | No changes needed                                                               |
| listings/CLAUDE.md | MOSTLY ACCURATE | `useReorderListingPhotos()` hook documented but doesn't exist in code           |
| context/CLAUDE.md  | ACCURATE        | No changes needed                                                               |

### Rate Limiting — ZERO PROTECTION

| Endpoint                       | Auth | Rate Limit    | Risk                                        |
| ------------------------------ | ---- | ------------- | ------------------------------------------- |
| `POST /api/auth/register`      | No   | None          | CRITICAL — spam accounts, email quota       |
| `POST /api/listings/[id]/view` | No   | None          | HIGH — view inflation, ranking manipulation |
| `POST /api/listings/upload`    | Yes  | None          | HIGH — storage spam, CPU exhaustion         |
| `POST /api/listings`           | Yes  | None          | MEDIUM — listing spam                       |
| `POST /api/members/avatar`     | Yes  | None          | MEDIUM — CPU abuse                          |
| Forgot password (client-side)  | N/A  | Supabase only | MEDIUM — email enumeration                  |

No `vercel.json` exists — no Vercel Firewall/WAF rules configured.

### Environment & Fresh Clone — PASS

- `.env.local.example` lists all 4 required vars, all are used in code
- No hardcoded secrets in source
- `next.config.mjs` remote patterns correctly cover Supabase Storage
- README has clear setup instructions
- Sharp auto-installs via pnpm (no special system deps)

### Image & Performance — EXCELLENT

- 1 raw `<img>` — intentional exception in review-step.tsx (preview URL, eslint-disabled)
- All `<Image>` components have proper `sizes`, `alt`, and `fill` usage
- `priority` applied on listing detail hero, photo gallery, navbar avatar
- Zero `useEffect` + data fetching anti-patterns (all use Tanstack Query)
- No unnecessary client-side bundle bloat
- Minor: homepage grid could pass `priority` to first listing card for LCP optimization

---

## Consolidated Action Items

### Security (Critical)

1. **[SHOP]** `createShop()` → migrate to `POST /api/shops` with atomic slug reservation
2. **[SHOP]** `transferOwnership()` → migrate to `POST /api/shops/[id]/ownership` with DB transaction
3. **[LISTING]** Photo delete endpoint → add listing ownership verification
4. **[LISTING]** `GET /api/listings/[id]` → filter drafts for non-owners (return 404)
5. **[LISTING]** `PUT /api/listings/[id]` → add field whitelist + type validation

### High Priority

6. **[SHOP]** `addShopMember()` → migrate to `POST /api/shops/[id]/members`
7. **[SHOP]** `removeShopMember()` → migrate to `DELETE /api/shops/[id]/members/[memberId]`
8. **[SCHEMA]** `release_slug` RPC never called during deletion flows
9. **[SCHEMA]** Slugs table has no FK relationships — orphan risk on entity deletion

### Medium

10. **[LISTING]** Lures photo guidance mismatch (`lures_hard`/`lures_soft` keys don't match `lures` category)
11. **[LISTING]** `watcher_count` displayed but never written — DEFERRED: placeholder for future favorites/watchlist feature. Display handles zero gracefully.
12. **[SCHEMA]** `reserved` listing status — RESOLVED: removed from app code (state machine, labels, UI). DB enum value retained for potential future checkout/reservation feature.
13. **[SCHEMA]** `split` shipping — RESOLVED: kept in DB enum for future shipping options expansion. Current form supports buyer/seller; split and free shipping will be added in a dedicated shipping feature.

### Low

14. **[SCHEMA]** `show_limit` RPC — remove (debug utility)
15. **[SECURITY]** Cache-Control `private, no-store` headers missing from 20 authenticated API routes
16. **[SECURITY]** Storage bucket RLS policies unverified — confirm in Supabase dashboard
17. **[RLS]** `shop_members` DELETE should allow members to remove themselves (leave shop)

### Critical (Phase 4 — Cascade Deletion)

18. **[CASCADE]** `listings.seller_id ON DELETE RESTRICT` blocks member deletion — change to CASCADE or add pre-deletion listing cleanup
19. **[CASCADE]** Listing deletion has no storage cleanup — orphaned images in `listing-images` bucket
20. **[CASCADE]** Shop deletion doesn't release slug from `slugs` table
21. **[CASCADE]** Storage cleanup runs before auth deletion — partial state on failure if auth fails
22. **[CASCADE]** Shop soft-delete orphans listings (remain active with null shop reference)
23. **[UI]** Shop member management UI missing — no way to add/remove/invite members

### Medium (Phase 6 + 7)

24. **[REPO]** Move `AvatarUpload` from `features/members/components/` to `src/components/controls/`
25. **[TESTING]** Members domain has zero tests — need service, hook, and component tests
26. **[TESTING]** Shops domain has zero tests — need service, hook, and component tests
27. **[TESTING]** Listings domain has 1 utility test — need service, hook, and component tests
28. **[TESTING]** 18+ API routes have no tests (only `/api/auth/register` tested)
29. **[REPO]** Some shops/listings services use raw `fetch()` instead of shared fetch wrapper

### Supplemental Findings

30. **[RATE LIMIT]** `POST /api/auth/register` — zero rate limiting, spam accounts risk (CRITICAL)
31. **[RATE LIMIT]** `POST /api/listings/[id]/view` — unauthenticated, zero rate limiting, view inflation risk (HIGH)
32. **[RATE LIMIT]** `POST /api/listings/upload` — no per-user upload quota (HIGH)
33. **[RATE LIMIT]** No `vercel.json` — no Vercel Firewall/WAF rules configured
34. **[DOCS]** Root CLAUDE.md has 3 "products" references that should say "listings"
35. **[DOCS]** Listings CLAUDE.md documents `useReorderListingPhotos()` hook that doesn't exist
36. **[PERF]** Homepage grid doesn't pass `priority` to first listing card (minor LCP optimization)
