# Nessi Project Checkpoint Audit Plan

> **Purpose:** Systematic validation and hardening of all features built to date — Auth, Members, Shops, Listings, Context, and Shared infrastructure. Run after listings tickets are complete.
>
> **Domains in scope:** auth, members, shops, products/listings, context, shared
>
> **How to use:** Work through each section domain-by-domain. Each check has a pass/fail outcome. Findings get tagged as **FIX** (must resolve), **MOVE** (relocate code), **REMOVE** (delete dead code/schema), or **NOTE** (document decision for later).

---

## 1. API-First Architecture ("Dumb Frontend")

**Goal:** All critical business logic, orchestration, validation, and error handling lives in API routes — not in client-side services or components. The frontend is a thin rendering layer that calls APIs and displays results. This enables future React Native clients to reuse the same backend.

### 1A. Auth

- [ ] **Registration** — `POST /api/auth/register` handles all validation, user creation, and error responses. Client only submits form data and displays results.
- [ ] **Login** — Verify login calls Supabase client-side (acceptable since Supabase SDK handles auth). Document that this is the intended pattern and RN would do the same.
- [ ] **Logout** — Verify logout is a simple Supabase signOut call (acceptable client-side).
- [ ] **Forgot password** — Verify `forgotPassword()` in `auth.ts` calls Supabase `resetPasswordForEmail` client-side. Decide: is this acceptable or should it route through an API? (Supabase SDK handles the email trigger, so client-side is likely fine — document the decision.)
- [ ] **Reset password** — Same pattern check as forgot password.
- [ ] **Account deletion** — `DELETE /api/auth/delete-account` handles all cascade logic server-side. Confirm client only calls the endpoint.
- [ ] **Email verification callback** — `/api/auth/callback` handles all server-side logic. Confirm.

### 1B. Members

- [ ] **Profile updates** — `updateMember()` in `member.ts` calls Supabase directly via browser client (RLS-protected). Decide: should profile updates go through an API route for validation consistency, or is RLS-protected direct access acceptable? Document the decision.
- [ ] **Avatar upload** — `POST /api/members/avatar` handles server-side processing. Confirm client only submits FormData.
- [ ] **Onboarding completion** — `completeOnboarding()` calls Supabase directly. Should this be an API route to enforce onboarding business rules server-side?
- [ ] **Slug operations** — `checkSlugAvailable()` and `generateSlug()` call RPCs directly. Acceptable (RPCs are server-side logic in Supabase). Document.
- [ ] **Seller toggle** — `POST /api/members/toggle-seller` handles precondition checks and side effects server-side. Confirm.
- [ ] **Seller preconditions** — `GET /api/members/seller-preconditions` returns server-computed state. Confirm.

### 1C. Shops

- [ ] **Shop creation** — `createShop()` calls Supabase directly via browser client. Should this go through an API route? Shop creation involves slug reservation, owner assignment, and shop_members insertion — that's orchestration that belongs server-side.
- [ ] **Shop updates** — `updateShop()` calls Supabase directly. Same question as member profile updates — is RLS enough, or do we want server-side validation?
- [ ] **Shop deletion** — `DELETE /api/shops/[id]` handles all cascade logic server-side. Confirm.
- [ ] **Slug update** — `POST /api/shops/slug` handles atomic slug swap server-side. Confirm.
- [ ] **Avatar upload** — `POST /api/shops/avatar` handles server-side processing. Confirm.
- [ ] **Member management** — `addShopMember()`, `removeShopMember()`, `transferOwnership()` call Supabase directly. These involve authorization checks and role changes — should be API routes.
- [ ] **Shop queries** — `getShop()`, `getShopsByOwner()`, etc. are read-only via RLS. Acceptable client-side.

### 1D. Listings (Products)

- [ ] **Listing creation** — `POST /api/products` handles creation. Confirm all validation is server-side.
- [ ] **Listing updates** — `PUT /api/products/[id]` handles updates. Confirm validation server-side.
- [ ] **Listing deletion** — `DELETE /api/products/[id]` handles deletion + image cleanup. Confirm.
- [ ] **Image upload** — `POST /api/products/upload` handles processing. Confirm.
- [ ] **Listing queries** — Read-only via API routes (GET). Confirm no business logic in client query hooks.
- [ ] **Draft save/resume** — If listing_drafts table is in use, verify draft lifecycle goes through API.
- [ ] **Status transitions** — draft→active→reserved→sold→archived→deleted. Are transitions enforced server-side or can the client set any status?

### 1E. Summary Decision

- [ ] **Document the boundary rule:** Which operations are acceptable as direct Supabase calls (reads, simple auth operations) vs. which MUST go through API routes (writes with orchestration, side effects, or multi-table operations).
- [ ] **Catalog all direct Supabase writes from the client** and tag each as KEEP (RLS-sufficient) or MIGRATE (needs API route).

---

## 2. UI Coverage — Every API Flow Has a UI Surface

**Goal:** Every service function and API endpoint is reachable from the UI, even if the page is rough. No orphaned backend functionality.

### 2A. Auth Flows

- [ ] Login form → renders on homepage or `/auth/login`
- [ ] Registration form → renders on homepage or `/auth/register`
- [ ] Forgot password → `/auth/forgot-password`
- [ ] Reset password → `/auth/callback?status=recovery` → reset password form
- [ ] Email verification → `/api/auth/callback` → redirect with `?verified=true`
- [ ] Resend verification → triggered when verification link expires
- [ ] Logout → accessible from navbar/menu
- [ ] Account deletion → `/dashboard/account` → danger zone section

### 2B. Member Flows

- [ ] View own profile → `/dashboard/account` (personal info section)
- [ ] Edit profile fields (name, bio, avatar) → inline edit on account page
- [ ] Fishing identity (species, techniques, home state, years) → account page section
- [ ] Notification preferences → account page section
- [ ] Seller toggle → account page section
- [ ] Seller onboarding modal → triggered by CTA or toggle
- [ ] View public profile → `/member/[slug]`
- [ ] Onboarding wizard → `/onboarding` (all 4-5 steps accessible)
- [ ] Member completeness indicator → rendered somewhere in dashboard

### 2C. Shop Flows

- [ ] Create shop → `/dashboard/shop/create`
- [ ] View shop settings → `/dashboard/shop/settings`
- [ ] Edit shop details (name, slug, description, avatar) → settings page
- [ ] Delete shop → settings page danger zone
- [ ] Transfer ownership → settings page
- [ ] View public shop page → `/shop/[slug]`
- [ ] Add/remove shop members → UI exists somewhere?
- [ ] Shop subscription section → placeholder visible?
- [ ] Context switching (member ↔ shop) → navbar dropdown

### 2D. Listing Flows

- [ ] Create listing → form accessible from dashboard
- [ ] View own listings → `/dashboard/products` (or listings equivalent)
- [ ] Edit listing → accessible from listing card or detail
- [ ] Delete listing → accessible from listing management
- [ ] Upload images → within create/edit form
- [ ] View listing detail → `/item/[id]`
- [ ] Listing status management (publish, archive, mark sold) → UI controls exist?
- [ ] Draft save/resume → if drafts are implemented, UI to resume them
- [ ] Browse/search listings → homepage or browse page

### 2E. Missing UI Surfaces (Expected Gaps)

- [ ] **Favorites** — `favorite/` component exists in products but is there a "my favorites" page?
- [ ] **Search** — `search_suggestions` table exists but is there a search UI?
- [ ] **Product reviews** — `product-reviews/` component exists but is there a review submission flow?
- [ ] Tag each gap as EXPECTED (future feature) or OVERSIGHT (should exist now).

---

## 3. Schema Validation — Used vs. Unused

**Goal:** Every column, table, enum value, and RPC function is either actively used in code or documented as planned for a specific future feature. Remove anything that's dead weight.

### 3A. Tables

| Table                | Status | Check                                         |
| -------------------- | ------ | --------------------------------------------- |
| `members`            | Active | Verify all columns are read/written somewhere |
| `shops`              | Active | Verify all columns are read/written somewhere |
| `shop_members`       | Active | Verify CRUD exists                            |
| `products`           | Active | Verify all columns are read/written somewhere |
| `product_images`     | Active | Verify CRUD exists                            |
| `listing_drafts`     | ?      | Is this used in code or schema-only?          |
| `slugs`              | Active | Verify RPCs are called                        |
| `search_suggestions` | ?      | Is this used in code or schema-only?          |

### 3B. Columns — Potentially Unused

- [ ] `members.is_stripe_connected` — Stripe not yet integrated. Future feature? Document.
- [ ] `members.stripe_account_id` — Same.
- [ ] `members.stripe_onboarding_status` — Same.
- [ ] `members.average_rating` — Reviews not implemented. Future feature?
- [ ] `members.review_count` — Same.
- [ ] `members.response_time_hours` — Messaging not implemented. Future feature?
- [ ] `members.total_transactions` — Orders not implemented. Future feature?
- [ ] `members.last_seen_at` — Is this being set anywhere?
- [ ] `shops.is_stripe_connected` — Same as member Stripe fields.
- [ ] `shops.stripe_account_id` — Same.
- [ ] `shops.stripe_onboarding_status` — Same.
- [ ] `shops.stripe_subscription_id` — Same.
- [ ] `shops.subscription_status` — Same.
- [ ] `shops.subscription_tier` — Same.
- [ ] `shops.brand_colors` — Is this used in rendering?
- [ ] `shops.average_rating` — Reviews not implemented.
- [ ] `shops.review_count` — Same.
- [ ] `shops.total_transactions` — Orders not implemented.
- [ ] `shops.is_verified` — What triggers verification?
- [ ] `shops.hero_banner_url` — Is there upload UI for this?
- [ ] `products.search_vector` — Is full-text search implemented?
- [ ] `products.view_count` — Is this being incremented?
- [ ] `products.favorite_count` — Is this being incremented?
- [ ] `products.inquiry_count` — Messaging not implemented.
- [ ] `products.weight_oz` — Is this used in listing form?
- [ ] `products.shipping_paid_by` — Is this used in listing form?
- [ ] `products.shipping_price_cents` — Is this used in listing form?
- [ ] `products.published_at` — Is this set on status change?
- [ ] `products.member_id` vs `products.seller_id` — Why both? Which is canonical?

### 3C. Enums — Value Coverage

- [ ] `listing_status` — Are all values (draft, active, reserved, sold, archived, deleted) reachable via UI/API transitions?
- [ ] `listing_category` — Are all 10 categories selectable in the listing form?
- [ ] `listing_condition` — Are all 6 conditions selectable?
- [ ] `shipping_paid_by` — Is shipping config in the listing form?

### 3D. RPC Functions

- [ ] `check_slug_available` — Called from member and shop services. Confirm.
- [ ] `reserve_slug` — Called during shop/member creation. Confirm.
- [ ] `release_slug` — Called during deletion. Confirm.
- [ ] `show_limit` — What is this? Is it used?
- [ ] `show_trgm` — Trigram function for fuzzy search. Is it used?

### 3E. Decision for Each Unused Item

Tag each as:

- **KEEP** — Needed for a planned feature (name the feature)
- **REMOVE** — Dead code, no planned use
- **DEFER** — Unclear, revisit at next checkpoint

---

## 4. RLS & Security Hardening

**Goal:** Every table has appropriate RLS policies. No unauthorized reads, writes, or deletes are possible. Auth boundaries are correctly enforced.

### 4A. RLS Policy Audit (per table)

For each table, verify:

- [ ] **members** — SELECT: any authenticated user can read any member (public profiles). UPDATE: only own row. DELETE: only via cascade from auth.users. INSERT: only during registration (admin client).
- [ ] **shops** — SELECT: public (non-deleted). UPDATE: only owner. DELETE: only owner (soft delete). INSERT: authenticated users.
- [ ] **shop_members** — SELECT: shop members can see co-members. INSERT: only shop owner. UPDATE: only shop owner. DELETE: owner can remove members; member can remove self.
- [ ] **products** — SELECT: public (active, non-deleted). UPDATE: only seller. DELETE: only seller. INSERT: authenticated sellers.
- [ ] **product_images** — SELECT: follows product visibility. INSERT/DELETE: only product owner.
- [ ] **listing_drafts** — SELECT/UPDATE/DELETE: only draft owner. INSERT: authenticated sellers.
- [ ] **slugs** — SELECT: public (for availability checks). INSERT/UPDATE/DELETE: only via RPCs (service role).
- [ ] **search_suggestions** — SELECT: public. INSERT/UPDATE/DELETE: admin only.

### 4B. API Route Auth Checks

For each API route, verify:

- [ ] `POST /api/auth/register` — No auth required (registration). Rate limiting needed?
- [ ] `GET /api/auth/callback` — No auth required (email verification). PKCE exchange validated.
- [ ] `DELETE /api/auth/delete-account` — Requires authenticated session. Verify `getUser()` check.
- [ ] `POST /api/members/avatar` — Requires authenticated session. Only uploads to own path.
- [ ] `GET /api/members/seller-preconditions` — Requires authenticated session. Only returns own data.
- [ ] `POST /api/members/toggle-seller` — Requires authenticated session. Only toggles own status.
- [ ] `GET/POST /api/products` — GET: public. POST: requires auth + seller status?
- [ ] `GET/PUT/DELETE /api/products/[id]` — GET: public. PUT/DELETE: requires auth + ownership.
- [ ] `GET /api/products/user` — Requires auth. Only returns own products.
- [ ] `POST /api/products/upload` — Requires auth. Uploads to own path.
- [ ] `DELETE /api/shops/[id]` — Requires auth + owner verification. Confirm owner check.
- [ ] `POST /api/shops/avatar` — Requires auth + shop owner verification.
- [ ] `POST /api/shops/slug` — Requires auth + shop owner verification.

### 4C. Input Validation & Injection Prevention

- [ ] All API routes validate input before using it in queries
- [ ] File upload routes validate MIME type, file size, and file content (not just extension)
- [ ] Slug inputs are sanitized (no SQL injection via slug values)
- [ ] No raw SQL — all queries use Supabase client (parameterized)
- [ ] `Cache-Control: private, no-store` on all auth-related responses
- [ ] Open redirect prevention in callback route (sanitized redirect paths)
- [ ] CSRF protection — API routes only accept POST/PUT/DELETE from same origin?

### 4D. Storage Security

- [ ] `avatars` bucket — RLS: users can only upload/delete their own avatar
- [ ] `product-images` bucket — RLS: users can only upload/delete their own product images
- [ ] `shop-assets` bucket — RLS: only shop owner can upload/delete
- [ ] Verify no public write access on any bucket
- [ ] Verify uploaded files can't overwrite other users' files (path includes user_id)

### 4E. Session Security

- [ ] Cookies are httpOnly (via @supabase/ssr)
- [ ] proxy.ts refreshes session on every request
- [ ] Dashboard routes are gated (redirect unauthenticated users)
- [ ] Auth pages redirect authenticated users (prevent re-login)
- [ ] No session data in localStorage (cookie-only)

---

## 5. Cascade Deletion & Data Integrity

**Goal:** When an entity is deleted, all dependent data (storage objects, child rows, references) is cleaned up. Deletion is gated when prerequisites exist.

### 5A. Member Account Deletion

- [ ] **Gate:** Cannot delete account if member owns active shops → 409 with shop list
- [ ] **Storage cleanup:** Avatar from `avatars` bucket
- [ ] **Storage cleanup:** Product images from `product-images` bucket
- [ ] **Storage cleanup:** Shop avatars and hero banners from `shop-assets` bucket (if member owns shops — but gate should prevent this?)
- [ ] **Slug cleanup:** Member slug released from `slugs` table
- [ ] **Auth deletion:** `auth.admin.deleteUser()` triggers CASCADE
- [ ] **DB trigger:** `handle_member_deletion()` fires — verify it cleans up remaining assets
- [ ] **CASCADE FK:** `members.id` → `auth.users.id` ON DELETE CASCADE removes member row
- [ ] **Verify:** What happens to the member's products when account is deleted? Are they deleted? Soft-deleted? Orphaned?
- [ ] **Verify:** What happens to shop_members entries where this member is a non-owner member?
- [ ] **Verify:** What happens to listing_drafts owned by this member?

### 5B. Shop Deletion

- [ ] **Gate:** What conditions prevent shop deletion? Currently: owner check only. Should there be a check for active listings? Active orders (future)?
- [ ] **Soft delete:** `deleted_at = now()` — verify queries filter `deleted_at IS NULL`
- [ ] **Storage cleanup:** Shop avatar from `shop-assets` bucket
- [ ] **Storage cleanup:** Shop hero banner from `shop-assets` bucket
- [ ] **Storage cleanup:** Shop product images from `product-images` bucket
- [ ] **Verify:** What happens to products associated with this shop? Are they reassigned to the member? Soft-deleted? Hidden?
- [ ] **Verify:** What happens to shop_members entries? Are they deleted or orphaned?
- [ ] **Verify:** Does deleting a shop release its slug from the `slugs` table?
- [ ] **Verify:** If a member owns a shop and deletes the shop, can they delete their account after?
- [ ] **Context revocation:** If the active context is the deleted shop, does it switch to member context?

### 5C. Listing Deletion

- [ ] **Storage cleanup:** All images from `product-images` bucket for this listing
- [ ] **Verify:** `product_images` rows are deleted (FK CASCADE or manual cleanup?)
- [ ] **Verify:** If listing has a draft in `listing_drafts`, is the draft cleaned up?
- [ ] **Soft delete vs hard delete:** Which approach is used? Is it consistent?

### 5D. Deletion Matrix

| Entity Deleted     | Products | Product Images (DB) | Product Images (Storage) | Shop Members | Slugs    | Drafts |
| ------------------ | -------- | ------------------- | ------------------------ | ------------ | -------- | ------ |
| Member Account     | ?        | ?                   | Cleaned                  | ?            | Released | ?      |
| Shop               | ?        | ?                   | Cleaned                  | ?            | ?        | N/A    |
| Individual Listing | N/A      | ?                   | ?                        | N/A          | N/A      | ?      |

Fill in each cell with: CASCADE, MANUAL CLEANUP, SOFT DELETE, ORPHANED, or N/A.

### 5E. Future-Proofing

- [ ] Document what happens when we add: orders, messages, reviews, favorites (as user-owned data that must be handled on deletion)
- [ ] Document the pattern for adding new deletable resources (FK + ON DELETE + storage cleanup + API gate)

---

## 6. Repo Organization & Code Placement

**Goal:** Every file lives in the right place. Feature-specific code is in features/. Truly shared code is in components/ or shared/. No orphaned or misplaced files.

### 6A. Feature Components → Should They Be Global?

Review each feature's components/ directory. If a component is used by multiple features or has no domain-specific logic, it should move to `src/components/`.

- [ ] `features/members/components/avatar-upload/` — Used by members AND shops. **Candidate for `src/components/controls/`**.
- [ ] `features/products/components/product-card/` — Domain-specific (products). Keep in feature.
- [ ] `features/products/components/favorite/` — Could be generic (heart toggle). Review if used elsewhere.
- [ ] `features/products/components/product-reviews/` — Domain-specific. Keep.
- [ ] `features/members/components/member-completeness/` — Member-specific. Keep.
- [ ] `features/members/components/start-selling-cta/` — Member-specific. Keep.
- [ ] `features/members/components/seller-onboarding-modal/` — Member-specific. Keep.
- [ ] `features/shops/components/create-shop-cta/` — Shop-specific. Keep.
- [ ] `features/context/components/context-revocation-listener.tsx` — Infrastructure. Should this be in `src/components/` or `src/libs/`? It's mounted in the dashboard layout, not feature-specific UI.

### 6B. Shared Utilities — Is Everything in the Right Place?

- [ ] `features/shared/utils/slug.ts` — Used by members and shops. Correct placement in shared.
- [ ] `features/shared/hooks/use-form.ts` — Used across features. Correct placement.
- [ ] `features/shared/hooks/use-form-state.ts` — Used across features. Correct placement.
- [ ] `features/shared/types/forms.ts` — Used across features. Correct placement.
- [ ] `features/context/` — Is "context" a feature or infrastructure? It's a cross-cutting concern (Zustand store + fetch integration). Consider whether it belongs in `src/libs/` instead.

### 6C. Libs — Is Everything Infrastructure?

- [ ] `src/libs/fetch.ts` — Infrastructure. Correct.
- [ ] `src/libs/fetch-error.ts` — Infrastructure. Correct.
- [ ] `src/libs/query-client.ts` — Infrastructure. Correct.
- [ ] `src/libs/create-selectors.ts` — Infrastructure. Correct.
- [ ] `src/libs/providers.tsx` — Infrastructure. Correct.
- [ ] `src/libs/supabase/` — Infrastructure. Correct.

### 6D. Validation Library Consistency

- [ ] Auth uses **Yup** (client) + pure functions (server)
- [ ] Members uses **Yup** (onboarding)
- [ ] Shops uses **Zod** (createShopSchema, updateShopSchema)
- [ ] **Inconsistency:** Two validation libraries. Pick one and migrate. Zod is the modern choice and pairs better with TypeScript.

### 6E. Service Pattern Consistency

- [ ] Auth services call Supabase directly (client-side)
- [ ] Member services call Supabase directly (client-side) — some via API routes
- [ ] Product services use the shared fetch wrapper (API routes)
- [ ] Shop services mix: some direct Supabase, some via API routes
- [ ] **Inconsistency:** No single pattern for service → backend communication. Document the rule (see Section 1E) and align.

### 6F. Naming Consistency

- [ ] Feature is called "products" in code but "listings" in schema (enums: `listing_category`, `listing_status`, table: `listing_drafts`). Align on one name.
- [ ] `product_images` table vs `listing_photos` — which is canonical?
- [ ] File names follow kebab-case? (enforced by eslint, but double-check)

---

## 7. Cross-Cutting Concerns

### 7A. Error Handling Consistency

- [ ] All API routes return structured error responses: `{ error: { code, message } }`
- [ ] All API routes use try/catch with appropriate status codes
- [ ] FetchError is consistently caught and handled in UI (error boundaries, form error states)
- [ ] No swallowed errors (catch blocks that log but don't report to UI)
- [ ] Toast notifications for async operation failures
- [ ] Loading states for all async operations

### 7B. Type Safety

- [ ] No `any` types in critical paths (API routes, services, hooks)
- [ ] Database types are up to date (`pnpm db:types` reflects current schema)
- [ ] Feature types derive from database types (not manually duplicated)
- [ ] API request/response types are explicitly defined
- [ ] `pnpm typecheck` passes clean

### 7C. Test Coverage Gaps

- [ ] Auth: 21 service tests, 17 validation tests, 10+ component tests — well covered
- [ ] Members: Test coverage? Check for service, hook, and component tests
- [ ] Shops: Test coverage? Check for service, hook, and component tests
- [ ] Products/Listings: Test coverage? Check for service, hook, and component tests
- [ ] Context: Test coverage for revocation handler, store, and listener?
- [ ] API routes: Integration tests for each route?
- [ ] Goal: Every service function and API route has at least one test

### 7D. Accessibility (WCAG 2.1 AA)

- [ ] Run `/a11y-audit` on every page
- [ ] All form inputs have: `aria-required`, `aria-describedby`, `aria-invalid`, `autocomplete`
- [ ] All buttons have: `aria-busy` when loading, `aria-label` when icon-only
- [ ] All modals have: `aria-labelledby`, focus trap, focus restoration
- [ ] All interactive elements: visible `:focus-visible`, 44x44px tap targets
- [ ] Toast notifications: `role="status"` or `role="alert"` with `aria-live`

### 7E. Performance Basics

- [ ] All images use `next/image` with `sizes` prop (no raw `<img>`)
- [ ] Above-the-fold images have `priority` prop
- [ ] No unnecessary client-side data fetching (prefer Server Components for initial data)
- [ ] Tanstack Query `staleTime` is appropriate (currently 60s global default)
- [ ] No layout shift from missing image dimensions

### 7F. Environment & Config

- [ ] `.env.local.example` lists all required variables
- [ ] No hardcoded URLs, keys, or secrets in source code
- [ ] `next.config.mjs` remote patterns cover all storage domains
- [ ] Verify Supabase project settings match code expectations (email templates, redirect URLs)
- [ ] **Fresh clone test:** Can a new developer clone + `pnpm install` + populate `.env.local` from example + `pnpm dev` and get a working app without tribal knowledge?

### 7G. Stubs & Landmines

- [ ] `services/onboarding.ts` — Returns hardcoded `{ isComplete: true }`. This stub silently passes every onboarding check. Either implement the real logic or remove the file and move the check to where `onboarding_completed_at` is already read directly.
- [ ] Grep for other `TODO`, `FIXME`, `HACK`, `STUB` comments across the codebase and catalog them.

### 7H. Rate Limiting

- [ ] `POST /api/auth/register` — Highest abuse risk (account creation). No rate limiting currently. Plan: Vercel Firewall WAF rule or API-level throttle?
- [ ] `POST /api/auth/forgot-password` (Supabase `resetPasswordForEmail`) — Email enumeration + email bombing risk. Same plan needed.
- [ ] `POST /api/products/upload` and `POST /api/members/avatar` — File upload abuse. Lower risk but worth noting.

### 7I. Query Key Conventions

- [ ] Catalog all Tanstack Query keys across features (auth, members, shops, products/listings)
- [ ] Verify consistent naming pattern (e.g., `['members', id]` vs `['member', id]` vs `['member-profile', id]`)
- [ ] Verify cache invalidation in mutations uses the correct broad keys (e.g., `invalidateQueries({ queryKey: ['members'] })` after a member update)
- [ ] Document the query key convention so new features follow the same pattern

---

## 8. Feature-Specific CLAUDE.md Accuracy

**Goal:** Each feature's CLAUDE.md accurately reflects the current implementation. Outdated docs create confusion for AI-assisted development.

- [ ] `features/auth/CLAUDE.md` — Reflects current services, components, and patterns?
- [ ] `features/members/CLAUDE.md` — Reflects current services, components, and patterns?
- [ ] `features/shops/CLAUDE.md` — Reflects current services, components, and patterns?
- [ ] `features/products/CLAUDE.md` — Reflects current services, components, and patterns? Aligned with listings rename?
- [ ] `features/context/CLAUDE.md` — Reflects current store, revocation, and fetch integration?
- [ ] Root `CLAUDE.md` — Account deletion cascade section still accurate? Key directories section current?

---

## Execution Plan

### Phase 1: Schema & Naming (read-only analysis)

Sections: 3 (Schema Validation), 6F (Naming Consistency)
**Output:** Decision list — KEEP/REMOVE/RENAME for every schema item

### Phase 2: API-First Assessment (read-only analysis)

Sections: 1 (API-First), 6E (Service Pattern Consistency)
**Output:** Migration list — which client-side operations need API routes

### Phase 3: Security Hardening (read + test)

Sections: 4 (RLS & Security)
**Output:** RLS policy matrix, auth check verification, identified gaps

### Phase 4: Cascade Deletion (read + test)

Sections: 5 (Cascade Deletion)
**Output:** Filled deletion matrix, identified gaps, test results

### Phase 5: UI Coverage (browser verification)

Sections: 2 (UI Coverage)
**Output:** Flow-by-flow pass/fail, list of missing surfaces

### Phase 6: Repo Cleanup (refactoring)

Sections: 6A-6E (Repo Organization)
**Output:** File moves, validation library decision, pattern alignment

### Phase 7: Cross-Cutting Quality (automated + manual)

Sections: 7 (Cross-Cutting), 8 (CLAUDE.md Accuracy)
**Output:** Test coverage report, a11y audit results, doc updates

---

## Issue Tracking & Prioritization

After each phase, all findings tagged **FIX**, **MOVE**, or **REMOVE** become tickets:

1. **Batch findings per phase** — Collect all actionable findings from the completed phase
2. **Run `/ticket-gen`** — Generate execution-ready GitHub issues for each finding (or logical group of related findings)
3. **Add to Nessi Kanban board** — All generated issues go to the **Nessi Kanban** GitHub Project
4. **Priority ordering** — Move all audit tickets to the **TOP of the ToDo column**, ordered by severity:
   - **Security & RLS fixes** (Phase 3) — highest priority
   - **Cascade deletion gaps** (Phase 4) — data integrity risk
   - **API-first migrations** (Phase 2) — architectural alignment
   - **Schema cleanup** (Phase 1) — remove dead weight before building on it
   - **Repo organization** (Phase 6) — reduce confusion
   - **UI coverage gaps** (Phase 5) — testability
   - **Cross-cutting quality** (Phase 7) — polish
5. **Label all audit tickets** with a `checkpoint-audit` label for filtering

> **Note:** Audit tickets take priority over new feature work. The goal is to harden the foundation before building more on top of it.

---

## Phase Completion Checklist

After completing each phase, update this document:

- Mark checks as ✅ (pass), ❌ (fail — needs fix), or ⏭️ (intentionally deferred)
- Add findings as bullet points under each failed check
- Run `/ticket-gen` for all ❌ findings
- Link generated issue numbers next to each finding
- Confirm tickets are at the top of the Nessi Kanban ToDo column
