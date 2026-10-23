# Nessi — Feature Execution Order

**Source:** `docs/feature-build-spec.md` (product roadmap) + `docs/launch-checklist.md` (infra gaps)
**Created:** 2026-03-19
**Status:** Active — check off items as tickets are cut and completed

---

## How This Works

Each line item below becomes a batch of tickets via `/ticket-gen`. We work top-down — don't skip ahead, dependencies are strict. Items marked with existing work note what's already built that the tickets should build on, not rebuild.

---

## Execution Order

### Phase 1 — Foundation Completion

These items close the gaps in what's already partially built. Nothing else can be tested end-to-end without these.

- [ ] **1. Auth Polish**
  - Existing: email/password login, register, forgot password, session management, proxy.ts route protection, WCAG audit done, autocomplete attributes done
  - Build (4 items):
    - **Post-login onboarding gate:** Login is modal-based (closes on auth, user stays on current page). After login/register, check if onboarding is complete — if not, redirect to `/onboarding`. If complete, modal closes and user stays put. Ties into #3 (needs `is_onboarding_complete` derived from profile completeness or explicit flag on profiles table).
    - **8s timeout on auth calls:** Add AbortController timeout to auth service functions. On timeout, show inline error "Something went wrong. Check your connection and try again." Form data preserved (React Hook Form already handles this).
    - **Redirect authenticated users from /login, /register:** Add to proxy.ts — if user has session and hits auth pages, redirect to `/`.
    - **Friendly duplicate email message:** Detect Supabase "User already registered" error in register service, show "An account with that email already exists. Sign in instead?" with link. (Minor email enumeration — industry standard, mitigated by rate limiting in #33.)
  - Skipped (with rationale):
    - ~~Specific login error split~~ — Security anti-pattern. Supabase intentionally returns generic "Invalid login credentials." We'll soften wording but NOT split by email vs password.
    - ~~Forgot password email reveal~~ — Already implemented correctly. Supabase returns success for all emails.
  - Deferred (Nice to Have): Google SSO, Apple SSO, email change flow, account deletion, session management UI

- [ ] **2. Profiles Table + Schema**
  - Existing: user_metadata stores firstName/lastName, no profiles table
  - Build:
    - Create `profiles` table with all spec fields: display_name (unique, case-insensitive), avatar_url, bio (280 char), primary_species (text[]), primary_technique (text[]), home_state (char(2)), years_fishing (int), is_seller (bool), is_stripe_connected (bool), stripe_account_id, created_at, updated_at
    - RLS policies (users can read any profile, update only their own)
    - Trigger to auto-create profile row on auth.users insert
    - Regenerate TypeScript types (`pnpm db:types`)
  - Why first: every feature below references the profiles table

- [ ] **3. Onboarding Flow**
  - Existing: nothing — post-registration goes to `/dashboard`
  - Build:
    - `/onboarding` page — 3-step wizard with progress indicator
    - Step 1: Display name + avatar upload
    - Step 2: Fishing identity (species pills, technique pills, home state select)
    - Step 3: Bio (optional, skippable)
    - Display name async uniqueness check on blur
    - Avatar upload to Supabase Storage, resize to 200x200
    - Initials-based generated avatar as default
    - Post-registration redirect to `/onboarding` (update auth callback)
    - Redirect to `/` on completion
  - Depends on: #2 (profiles table)

- [ ] **4. Account Page Rebuild**
  - Existing: `/dashboard/account` shows firstName/lastName/email from auth metadata
  - Build:
    - Inline edit experience — click field to edit, save with checkmark, cancel with Escape
    - All profile fields editable (display name, bio, species/technique tags, home state, years fishing)
    - Avatar upload via bottom sheet (mobile) / file picker (desktop)
    - Profile completeness percentage bar (avatar 20%, bio 20%, species 20%, technique 20%, state 20%)
    - Collapsible card sections (Personal Info, Fishing Identity, Linked Accounts, Notifications)
  - Depends on: #2 (profiles table), #3 (onboarding — ensures profiles exist)

### Phase 2 — Image Upload & Listing Infrastructure

- [ ] **5. Image Upload Infrastructure Upgrade**
  - Existing: basic upload to Supabase Storage (5MB, JPEG/PNG/WebP/GIF), product_images table
  - Build:
    - HEIC support (iPhone default format)
    - Server-side processing via Sharp: resize to 2000px long edge, compress to <400KB, convert to WebP
    - Thumbnail generation (400x400) stored separately
    - Increase max file size to 20MB (pre-processing)
    - Per-photo upload progress bars
    - Reorderable photo grid (drag-and-drop desktop, long-press-drag mobile)
    - Failed upload retry per-photo
    - 12 photo max per listing
    - Cover photo = first photo (position 0) with "Cover" badge
    - Camera capture attribute for mobile (`capture="environment"`)
    - Bottom sheet on mobile: "Take photo" / "Choose from library"
  - Deferred: TUS resumable uploads (complex, revisit if mobile reliability is an issue)
  - Depends on: #1 (auth — uploads are authenticated)

- [ ] **6. Listings Schema Overhaul**
  - Existing: products table with id, title, description, price, user_id — very basic
  - Build:
    - Migrate/extend to full spec schema: seller_id (FK profiles), fishing_history, category (enum), condition (enum: new_unfished/excellent/very_good/good/fair/for_parts), price stored in cents, status (draft/active/sold/deactivated/deleted), ships_from_state, shipping_paid_by (buyer/seller), weight_oz, package dimensions, cover_photo_url, view_count, watcher_count, published_at, deleted_at (soft delete)
    - listing_photos table (replaces product_images): id, listing_id, url, thumbnail_url, position, created_at
    - RLS policies for listings
    - Full-text search vector column + GIN index (spec Feature 7 data model)
    - Regenerate TypeScript types
  - Why before wizard: the wizard writes to this schema
  - Depends on: #2 (profiles table — seller_id FK)

- [ ] **7. Condition Grading System**
  - Existing: nothing
  - Build:
    - 6-tier condition enum + descriptions (fishing-specific)
    - Condition selection component — vertical radio list with descriptions
    - Category-specific photo guidance accordion (rods, reels, lures, flies, etc.)
    - Color-coded condition badge component (pill: green→teal→blue-gray→amber→orange→red)
    - Badge popover with full tier description on tap/hover
    - Condition filter component for search (multi-select checkbox group)
    - WCAG AA contrast on all badge colors
  - Depends on: #6 (condition enum in schema)

### Phase 3 — Listing CRUD

- [ ] **8. Listing Create Wizard**
  - Existing: add-product-form modal (very basic — title, description, price, images)
  - Build:
    - 5-step wizard with persistent progress indicator
    - Step 1: Photos (Feature 5 upload component, min 2 required)
    - Step 2: Category tile grid + Condition selection (Feature 7)
    - Step 3: Title (80 char), Description (2000 char), Fishing History (500 char, optional)
    - Step 4: Price (cents, inputmode="decimal"), live fee calculator, shipping preference toggle
    - Step 5: Shipping details (weight, dimensions) — conditional on "I'll ship"
    - Review screen with listing preview
    - "Publish" (status=active) and "Save as Draft" (status=draft)
    - Auto-save every 30 seconds to listing_drafts
    - "Save draft and exit" always accessible
    - Client-side step transitions (slide animations)
    - Sticky "Next" button on mobile
    - Fee calculator: $0.99 under $15, 6% at $15+ (client-side, no network call)
    - Competitor fee comparison (eBay ~13.25%, Etsy ~10%)
  - Depends on: #5 (image upload), #6 (listings schema), #7 (condition grading)

- [ ] **9. Listing Detail Page**
  - Existing: `/item/[id]` with basic image carousel, title, description, price
  - Build:
    - Full mobile layout per spec: swipeable photo gallery with pinch-to-zoom, lightbox
    - Price + condition badge row
    - Seller info strip (avatar, name, fishing tags, rating placeholder, "View shop" link)
    - Sticky "Buy Now" button (bottom bar on mobile, sticky right column on desktop)
    - "Make Offer" secondary link (disabled until Feature 14)
    - "Watch" heart icon on photo gallery (auth-gated, optimistic UI)
    - "Message Seller" link (disabled until Feature 13)
    - Collapsible Description + Fishing History sections on mobile
    - Shipping estimate widget placeholder ("Shipping: calculated at checkout")
    - Condition details accordion
    - "Report this listing" link + bottom sheet
    - View count tracking (24h dedup)
    - Two-column layout on desktop (60/40 split)
    - SSR with generateMetadata for SEO
    - Sold/deactivated/deleted status handling (404 or "sold" page)
    - Seller viewing own listing: hide Buy/Offer, show "Edit listing"
  - Depends on: #6 (listings schema), #7 (condition badges), #2 (seller info strip needs profiles)

- [ ] **10. Listing Edit & Delete**
  - Existing: PUT/DELETE API routes, no frontend edit UI
  - Build:
    - Edit wizard (same 5-step as create, pre-populated, steps are clickable/jumpable)
    - Partial saves — single-step edits without completing all steps
    - Quick-edit price bottom sheet (from dashboard, without full wizard)
    - Three-dot menu on listings: Edit, Mark as Sold, Deactivate, Delete
    - Mark as Sold: status=sold, records sold_at, optional sale price
    - Deactivate: hides from public, restorable from dashboard
    - Delete: confirmation dialog, soft delete (deleted_at timestamp)
    - Watcher notification notice on price reduction ("X people are watching")
    - Min 2 photos enforced on save
  - Depends on: #8 (listing create — shares wizard components), #9 (detail page — edit accessed from here)

### Phase 4 — Discovery

- [ ] **11. Category Browse**
  - Existing: homepage shows all products in a grid
  - Build:
    - `/category/[slug]` pages for each category enum value
    - 2-column grid (mobile), 3-column (tablet), 4-column (desktop)
    - Listing card component: cover photo (square), title (1 line), price, condition badge, seller state
    - Entire card is tap target (no separate "View" button)
    - Infinite scroll (24 listings per page, loads at 200px from bottom)
    - Loading skeleton (4 cards)
    - Sort by: most recent (default), price low→high, price high→low, most watched
  - Depends on: #6 (listings schema — categories), #9 (listing card component)

- [ ] **12. Search: Keyword + Filters**
  - Existing: nothing
  - Build:
    - Persistent search bar in nav (icon → full-screen overlay on mobile)
    - `/search?q=&filters` results page
    - PostgreSQL full-text search (tsvector/tsquery on title, description, fishing_history)
    - Trigram matching for typo tolerance (pg_trgm extension)
    - Filter bottom sheet (mobile) / left rail (desktop): Category, Condition, Price range, Location (state), Ships free, Species, Listing type
    - Filter chips above results (removable)
    - Live filter counts
    - "No results" empty state with illustration
    - Autocomplete suggestions (debounced 200ms, min 3 chars)
    - search_suggestions table for popular queries
    - URL-driven filters (shareable/bookmarkable)
    - SSR for SEO
  - Depends on: #6 (search vector + GIN index), #11 (listing card component, grid layout)

- [ ] **13. Seller Shop Profile**
  - Existing: nothing
  - Build:
    - `/seller/[display_name]` public page
    - Hero banner (placeholder or cover photo from recent listing)
    - Avatar + display name + fishing identity tags + bio
    - Stats bar: member since, transaction count (placeholder 0), avg rating ("No reviews yet"), response time (placeholder)
    - Active listings grid (2-column, infinite scroll, 12 per page)
    - Sticky "Message [seller]" button (disabled until messaging)
    - Own profile: "Edit shop" button instead
    - No-space display name enforcement (update Feature 2 validation)
    - SSR for SEO
    - Empty state: "Nothing listed right now. Check back soon."
  - Depends on: #2 (profiles), #9 (listing card component), #11 (grid layout)

### Phase 5 — Transactions

**Architecture decision: Escrow-based payments.** Nessi uses an escrow model for buyer protection — the #1 trust signal for a gear marketplace where condition accuracy matters. Funds are captured at checkout but NOT transferred to the seller until the buyer verifies the item. This differs from the original spec (which assumed standard Stripe Connect payout schedule).

**Escrow flow:**

```
Checkout → Funds captured (held by Nessi platform) → Seller ships (tracking) →
Item delivered → 3-day verification window → Released to seller OR disputed
```

- Buyer can manually accept ("item is as described") → immediate release
- 3 days pass with no action → auto-release to seller
- Buyer disputes → funds held, support intervenes

**Stripe implementation:** Capture immediately via Payment Intent, hold funds on platform, transfer to seller's Connect account only on release. Do NOT use `capture_method: 'manual'` (auth expires in 7 days). Use platform-controlled transfers instead.

- [ ] **14. Stripe Connect: Seller Onboarding**
  - **Approach: Embedded onboarding (seller never leaves Nessi).** Use Stripe Connect Custom accounts with Connect Embedded Components (`<ConnectAccountOnboarding />`). The KYC, bank linking, and identity verification all render inside Nessi's UI via Stripe's embeddable components. No redirect to Stripe.
  - Build: `/dashboard/payouts` page with embedded Stripe Connect onboarding component, persistent dashboard banner until setup complete, webhook handler for account status updates, is_stripe_connected flag, disabled Buy Now for unconnected sellers
  - Migration: `ALTER TABLE profiles ADD COLUMN is_stripe_connected BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN stripe_account_id TEXT, ADD COLUMN stripe_onboarding_status TEXT DEFAULT 'not_started'`
  - Note: `stripe_onboarding_status` tracks partial completion (not_started → in_progress → complete → restricted) since embedded onboarding can be interrupted and resumed
  - Depends on: #2 (profiles), #9 (listing detail — Buy Now gating)

- [ ] **14b. Shopping Cart**
  - Build: cart_items table, `src/features/cart/` domain, add-to-cart on listing detail, cart icon + badge in nav, cart page/drawer grouped by seller, guest cart in localStorage merged on login, stale item detection (auto-remove sold items), "Buy Now" still works for instant single-item checkout
  - Note: Every listing is one-of-one (quantity always 1). Cart enables multi-item checkout and reduces shipping friction when buying from the same seller.
  - Depends on: #6 (listings schema), #2 (profiles)

- [ ] **15. Checkout: Guest + Account**
  - Build: `/checkout` full-page flow (reads from cart OR single listing via "Buy Now"), single-page 3-step (contact, shipping, payment), Apple Pay/Google Pay + card, order summary, guest checkout with post-purchase account creation CTA, address autocomplete, Payment Intent with application_fee_amount (funds captured to platform, NOT transferred to seller yet), order confirmation page + email
  - Multi-item support: items grouped by seller, separate Payment Intents or platform-held single capture with per-seller transfers on escrow release, one order record per seller
  - Depends on: #14 (Stripe Connect), #6 (listings), #9 (listing detail — Buy Now triggers checkout)

- [ ] **16. Order Management + Escrow**
  - Build: orders table with escrow lifecycle, buyer `/orders` page, seller `/dashboard/orders`
  - Order statuses: `paid` → `shipped` → `delivered` → `verification` → `released` / `disputed` / `refunded`
  - Escrow fields: `escrow_status` (held/released/disputed/refunded), `delivered_at`, `verification_deadline` (delivered_at + 3 days), `released_at`, `buyer_accepted_at`
  - 3-day auto-release cron job (check verification_deadline, transfer funds to seller Connect account)
  - Buyer acceptance UI: "Item arrived as described" button + "Open a dispute" link
  - Email notifications at each status change
  - Depends on: #15 (checkout creates orders)

- [ ] **17. Fee Calculation + Payout**
  - Build: application_fee_amount logic ($0.99 under $15, 6% at $15+), `/dashboard/payouts` with Stripe data, standalone fee calculator at `/sell`
  - Payout timing: funds transfer to seller only after escrow release (not on Stripe's default schedule)
  - Dispute handling: webhook for buyer disputes, hold funds, Slack/email notification to team
  - Depends on: #16 (orders — escrow release triggers payout), #14 (Stripe Connect)

### Phase 6 — Trust & Communication

- [ ] **18. In-Platform Messaging**
  - Build: message_threads + messages tables, per-listing threads, `/messages` inbox + `/messages/[thread_id]`, chat bubble UI, listing context card pinned to thread top, email notifications (15-min digest), unread badge in nav, 60s auto-refresh, report conversation flow
  - Depends on: #2 (profiles), #6 (listings)

- [ ] **19. Offers**
  - Build: offers table, "Make an Offer" in message thread, 70% floor enforcement, 24h expiry + cron job, accept/counter/decline flow, accepted offer → pre-filled checkout, one active offer per listing per buyer, profile completeness gate
  - Depends on: #18 (messaging — offers live in threads), #15 (checkout — accepted offers create sessions)

- [ ] **20. Watchlist + Price Drop Alerts**
  - Build: watchers table, heart icon on all listing cards + detail page, optimistic toggle, `/watchlist` page, price drop email notifications, watcher count on seller dashboard, sold listing cleanup (7-day grace period)
  - Depends on: #9 (listing detail — heart icon), #11 (listing cards), #10 (edit — price changes trigger alerts)

### Phase 7 — Shipping

- [ ] **21. EasyPost Integration**
  - Build: EasyPost API integration (server-side), "Print Shipping Label" on order detail, 3-step label generation (rates → confirm → PDF), tracking webhook for auto status updates, Rod Shipping Guide bottom sheet, missing dimensions prompt
  - Depends on: #16 (order management)

- [ ] **22. Shipping Calculator on Listings**
  - Build: zip code widget on listing detail, EasyPost rate lookup, localStorage zip persistence, "Free shipping" badge, "Contact seller" fallback for missing dimensions
  - Depends on: #21 (EasyPost — shares rate API), #9 (listing detail page)

### Phase 8 — Reviews & Identity

- [ ] **23. Seller Ratings + Reviews**
  - Build: reviews table, auto email 48h after delivery, `/review/[order_id]` with token auth, star rating (1-5) + 3 binary structured ratings + optional text, aggregate rating on profiles (denormalized), reviews on shop profile, "New seller" for <3 reviews, basic profanity filter
  - Depends on: #16 (orders — delivery triggers review), #13 (shop profile — reviews display here)

- [ ] **24. Fishing Identity Display Layer**
  - Build: target_species field on listings (create wizard Step 3), species filter becomes functional in search, fishing identity tags on listing detail seller strip, "About this angler" section on shop profile
  - Depends on: #2 (profiles — tags set here), #8 (listing wizard — add field), #12 (search — species filter)

### Phase 9 — Discovery & AI

- [ ] **25. Homepage Curation**
  - Build: search bar with "What are you fishing for?", category tile strip (horizontal scroll), "Recently Listed" strip (8 cards), "Maker Spotlight" (manual config), AI Search CTA placeholder, "Recently Sold" strip (4 cards), "Picked for you" (logged-in, species/technique match), 60s ISR, native CSS scroll snap
  - Depends on: #6 (listings — needs real inventory), #13 (shop profile — maker spotlight)

- [ ] **26. AI Scenario Search**
  - Build: `/search/ai` page, large text area input, LLM-powered scenario parsing (GPT-4o-mini extraction + GPT-4o reasoning), structured query against listings DB, AI recommendation reasoning per result, 5s target response time, 10 req/user/hour rate limit, fallback messaging for weak matches
  - Depends on: #12 (search infrastructure), #24 (target_species on listings)

- [ ] **27. Maker Directory**
  - Build: `/makers` page, auto-inclusion for sellers with custom_handmade listings, 2-column maker card grid, species/state filters, "Are you a maker?" CTA, 5-min ISR, SSR for SEO
  - Depends on: #6 (listings — custom_handmade category), #13 (shop profile — maker cards link here)

### Phase 10 — Seller Dashboard

- [ ] **28. Dashboard Analytics**
  - Build: `/dashboard/analytics` (seller-only), overview stats bar (revenue, listings live, views 30d, active watchers), revenue chart (30/90/all range selector), listing performance table (sortable by views/watchers/days/price), quick-edit price from table, recent sales list
  - Depends on: #16 (orders — revenue data), #20 (watchlist — watcher counts), #14 (Stripe — gates access)

- [ ] **29. Dashboard Bulk Tools**
  - Build: "Manage" mode toggle on `/dashboard/listings`, multi-select checkboxes, bulk action toolbar (edit price %, deactivate, mark sold, delete), confirmation bottom sheets, 50-listing cap per action
  - Depends on: #10 (listing edit/delete), #20 (watchlist — price edits trigger alerts)

### Infrastructure (parallel track — can be done alongside any phase)

- [ ] **30. Branded Email Templates**
  - Build: React Email + Resend templates for: signup verification, password reset, email change confirmation
  - Launch checklist item (High Priority)

- [ ] **31. Transactional Email Layer**
  - Build: Resend + React Email for: order confirmations, shipping notifications, seller alerts, buyer messages, review requests, price drop alerts
  - Launch checklist item (High Priority)

- [ ] **32. Error Monitoring**
  - Build: Sentry integration (`npx @sentry/wizard@latest -i nextjs`)
  - Launch checklist item (High Priority)

- [ ] **33. Rate Limiting**
  - Build: application-level rate limiting on API routes (product creation, image uploads, auth register)
  - Launch checklist item (High Priority)

---

## Progress Tracking

| Phase                   | Items  | Tickets Cut | Completed |
| ----------------------- | ------ | ----------- | --------- |
| 1 — Foundation          | #1-4   |             |           |
| 2 — Image/Listing Infra | #5-7   |             |           |
| 3 — Listing CRUD        | #8-10  |             |           |
| 4 — Discovery           | #11-13 |             |           |
| 5 — Transactions        | #14-17 |             |           |
| 6 — Trust & Comms       | #18-20 |             |           |
| 7 — Shipping            | #21-22 |             |           |
| 8 — Reviews & Identity  | #23-24 |             |           |
| 9 — Discovery & AI      | #25-27 |             |           |
| 10 — Seller Dashboard   | #28-29 |             |           |
| Infrastructure          | #30-33 |             |           |
