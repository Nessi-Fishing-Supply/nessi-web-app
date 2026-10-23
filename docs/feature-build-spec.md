# Nessi — Feature Build Specification

**Last updated:** March 2026 · **Team:** Paul Jones, Kyle Holloway, Alex Holloway
**Stack:** Next.js 14 (App Router), TypeScript, Supabase (auth + PostgreSQL), Drizzle ORM, Vercel, Stripe Connect, SCSS modules
**Rule:** Every feature is written for a coding agent. No TBDs. No vague criteria. Every decision is made.

---

## How to Read This Document

Each feature section specifies: what it is, why it's in this exact position, the exact UI pattern to use and why, mobile-first behavior, numbered acceptance criteria, data model decisions, integration notes, dependencies, best practice callouts from Reverb/Etsy/Depop/Vinted, and what's explicitly deferred. A developer reading any single feature should be able to build it without asking a question.

**Mobile-first baseline that applies to every feature without exception:**

- Minimum tap target: 44×44px

- No horizontal scroll on any screen at any viewport

- Sticky primary action button pinned to bottom of screen on mobile; never require scrolling to reach submit

- All forms use correct keyboard types: `type="email"`, `type="tel"`, `inputmode="numeric"` for price fields, `inputmode="decimal"` for weight

- Inline validation fires on blur, never on submit only

- Every error preserves form data — a failed submission never wipes what the user typed

- Skeleton screens for any list or grid that loads asynchronously; spinner only for single-action buttons

- Back navigation restores scroll position — never returns to top of page

---

## Layer 1 — Foundation

_Nothing in Layer 2 or beyond can be built until all three Layer 1 features are production-ready and tested on real iOS Safari and Android Chrome devices._

---

### Feature 1 — Auth

Auth is not a feature, it's infrastructure. Every listing, transaction, message, and review in the system is owned by an authenticated identity. Get this wrong and you rebuild it while real users are on the platform, which is expensive in trust.

**What it is:** The complete system for creating, verifying, and maintaining user identity on Nessi. Covers account creation, login, SSO, email verification, session management, and password recovery. The current Supabase auth scaffolding in the codebase is a solid foundation — the gaps are SSO completion, session persistence specifics, and the post-auth redirect logic.

**Why at this position:** Nothing else in the build can be tested end-to-end without real user accounts. Listings need an owner. Checkout needs a buyer and a seller. Messaging needs two authenticated parties. Building auth first means every subsequent feature can be built against real identity from day one.

**UI Pattern:** Auth flows use full-page views, not modals. The reasoning is URL-based: each auth step (login, register, verify, reset) must be a bookmarkable, shareable route so that email verification links work correctly, SSO callbacks land on the right page, and users who bookmark the login page get back to it. The one exception is a slide-in login panel triggered from the nav "Sign In" button on desktop, which can be a right-side drawer for returning users who are not in the middle of another action — this drawer should not block navigation and must close on escape key or click-outside.

On mobile, auth is always full-screen. The drawer pattern does not apply on viewports under 768px.

**Mobile-first spec:**

- Login form: email field (keyboard type `email`, autofocus on mount), password field with show/hide toggle (minimum 44px tap target on the eye icon), "Sign In" button full-width sticky to bottom of screen

- Register form: split into two steps — Step 1: email + password + confirm password. Step 2: first name + last name + state (select). Two-step prevents scroll fatigue and lets the user commit to the platform before filling fishing-specific fields (those come in Feature 2)

- Google SSO and Apple SSO buttons appear above the email form with a divider "or continue with email" — this matches iOS user expectations where Sign in with Apple appears first

- On iOS, "Sign in with Apple" must use the Apple-branded button with correct styling per Apple HIG — do not style it as a generic button

- Forgot password: email field only, single page, single action. Confirmation is a static success screen, not a modal

- All forms: auto-fill compatible (`autocomplete="email"`, `autocomplete="current-password"`, `autocomplete="new-password"`)

- On slow connections (simulated 3G): button shows loading spinner and is disabled after first tap to prevent double-submit; if the request fails after 8 seconds, show inline error "Something went wrong. Check your connection and try again." — form data is preserved

**Acceptance criteria:**

1. A new user can register with email and password. The password must be at least 8 characters and include at least one number. If the password does not meet requirements, an inline error appears beneath the password field on blur (not on submit).

2. After registration, a verification email is sent to the user's address via Supabase auth. The email contains a single-click verification link. The link is valid for 24 hours.

3. Clicking the verification link redirects the user to `/auth/callback`, which completes the Supabase session and redirects to the onboarding profile page (`/onboarding`). If the link has expired, the callback page shows an error with a "Resend verification email" action.

4. A registered user can log in with email and password. An incorrect password shows "Incorrect password" beneath the password field — not a generic "Invalid credentials" message. A non-existent email shows "We couldn't find an account with that email. Did you mean to sign up?" with a link to the register page.

5. A logged-in session persists across browser close and reopen for 30 days using Supabase's `persistSession` option. Session refresh happens silently on page load when the access token is within 60 seconds of expiry.

6. Google SSO completes in a single redirect flow. After SSO auth, if this is the user's first login, they land on `/onboarding`. If it's a returning user, they land on the page they were on before initiating login, or `/` if no prior page exists.

7. Apple SSO completes in a single redirect flow with the same post-auth routing logic as Google.

8. "Forgot Password" sends a reset email via Supabase. The reset link is valid for 1 hour. After clicking the link, the user lands on a password reset form (`/auth/reset-password`) with a new password field and a confirm password field. On successful reset, the user is logged in and redirected to `/`.

9. Logging out clears the Supabase session, clears any locally stored auth state, and redirects to `/`. The logout action is available from the account dropdown in the nav.

10. If an authenticated user navigates to `/login` or `/register`, they are redirected to `/` immediately.

11. Protected routes (any route under `/dashboard`, `/account`, `/checkout`) redirect unauthenticated users to `/login?redirect=[original-path]`. After login, the user is sent to the original path.

12. All auth forms pass WCAG 2.1 AA: labels are associated with inputs via `htmlFor`/`id`, error messages are announced by screen readers via `aria-live="polite"`, focus is managed correctly on form transitions.

**Edge cases:**

- User registers with an email that already exists: show "An account with that email already exists. Sign in instead?" with a link to login.

- User attempts SSO with a Google account whose email matches an existing email/password account: Supabase handles the merge — verify this behavior in the Supabase dashboard and document which account takes precedence.

- User submits the forgot password form with an email that doesn't exist in the system: show the same success message as a valid email ("If that email is registered, you'll receive a reset link") — do not reveal whether the email exists.

- Network timeout during any auth action: preserve form data, show inline retry error, do not navigate away.

**Data model notes:** Supabase handles the `auth.users` table. The public `profiles` table (created in Feature 2) references `auth.users.id` via foreign key. Do not store anything sensitive in `auth.users.user_metadata` beyond first name and last name for display in the nav before the profile record is created.

**Dependencies:** None. This is the first thing built.

**Best practice callouts:**
Reverb shows a "Complete your profile to start selling" nudge immediately after registration — it reduces the gap between signup and first listing. Nessi should do the same via the `/onboarding` redirect. Etsy's cardinal mistake is forcing account creation before the user has seen any inventory — Nessi allows guest browsing and only gates actions (save, purchase, message) behind auth, with a contextual prompt at the moment of intent.

**Do not build yet:** Two-factor authentication (2FA), phone number verification, fishing license verification, account suspension/ban tooling.

---

### Feature 2 — User Profile

**What it is:** The structured record that represents who a user is as an angler, not just as an account. Every listing, review, and message is connected to this record. It has two states: the private account view (what the user edits at `/account`) and the public shop/profile view (what other users see).

**Why at this position:** Listings need an owner with fishing identity. The condition grading system's credibility depends on being able to see who is making the claim. Seller shop profiles (Feature 8) are built on top of this record.

**UI Pattern:** Profile editing is an inline edit experience on the `/account` page — click a field to edit it in place, save with a checkmark, cancel with escape. Not a separate edit page, not a modal. The exception is avatar upload, which opens a bottom sheet on mobile with options: "Take photo," "Choose from library," and "Remove photo." On desktop, avatar upload is a click-on-image that opens a file picker. Inline editing on account pages reduces the friction that causes users to abandon profile completion — Reverb's data shows that profiles with photos and bios get 3x more offers than bare profiles.

**Mobile-first spec:**

- `/account` page: single-column card layout on mobile. Each section (Personal Info, Fishing Identity, Linked Accounts, Notifications) is a collapsible card with a chevron. Default: Personal Info expanded, others collapsed.

- Avatar: displayed at 80×80px on mobile with an edit pencil overlay. Tap opens bottom sheet.

- Fishing identity tags (species, technique) use horizontal scrolling pill-selectors on mobile — not a dropdown, not a multi-select input. Tap to select, tap again to deselect. Selected pills are filled, unselected are outlined.

- State/region: a standard mobile-native select input (`<select>`) — do not build a custom dropdown for this field, the native select is faster on mobile.

- Bio: a `<textarea>` with a 280-character limit and a live character counter in the bottom-right corner. Placeholder text: "How long you've been fishing, where you fish, what you target. Buyers and sellers want to know who they're dealing with."

**Acceptance criteria:**

1. After completing auth and landing on `/onboarding`, the user is prompted to complete their profile. The onboarding flow has three steps shown in a progress indicator: Step 1 (Display name + avatar), Step 2 (Fishing identity: species, technique, state), Step 3 (Bio — optional, skippable). The "Skip" button on Step 3 is visible but secondary (text link, not a button). Completing onboarding redirects to `/`.

2. Every field updated on the `/account` page saves immediately on confirmation (checkmark click or pressing Enter). A brief "Saved" toast appears at the bottom of the screen for 2 seconds and disappears without interaction. No full-page save button.

3. The following fields exist on the profile record: `display_name` (required, 3–40 chars), `avatar_url` (nullable), `bio` (nullable, max 280 chars), `primary_species` (array of enum: bass, trout, walleye, muskie, pike, panfish, catfish, saltwater, carp, fly, ice, other), `primary_technique` (array of enum: spinning, casting, fly, trolling, ice, jigging, drop_shot, topwater, surf, other), `home_state` (US state code), `years_fishing` (integer, optional), `is_seller` (boolean, default false, set to true when Stripe Connect is completed in Feature 9).

4. Avatar images are uploaded to Supabase Storage, resized to 200×200px on upload, served via the CDN URL. Original file is not stored. Accepted formats: JPEG, PNG, WebP. Maximum file size before resize: 5MB. Files over 5MB show an inline error: "That image is too large. Please choose one under 5MB."

5. The public profile page at `/seller/[username]` shows: avatar, display name, bio, fishing identity tags, member since date, transaction count, average rating (placeholder until Feature 19), and active listings grid. This page is accessible without authentication.

6. If a user has no avatar, display a generated avatar using their initials on a neutral background — not a blank circle, not a generic silhouette.

7. The display name must be unique across the platform. On blur of the display name field, an async check fires against the database. If the name is taken, an inline error appears: "That name is already taken. Try adding your state or a number."

8. Profile completeness percentage is calculated and shown on the `/account` page: avatar (20%), bio (20%), species tags (20%), technique tags (20%), home state (20%). A progress bar and "Your profile is X% complete — buyers trust complete profiles" is shown until 100%.

**Edge cases:**

- User uploads an avatar that is not a supported format: inline error on the upload component, no navigation away.

- User clears their display name and tries to save: inline error "Display name is required" — the field reverts to the previous value.

**Data model notes:** `profiles` table with `id` (UUID, references `auth.users.id`), `display_name` (text, unique), `avatar_url` (text, nullable), `bio` (text, nullable), `primary_species` (text[], default `{}`), `primary_technique` (text[], default `{}`), `home_state` (char(2), nullable), `years_fishing` (integer, nullable), `is_seller` (boolean, default false), `created_at`, `updated_at`. Add a unique index on `display_name` (case-insensitive: `lower(display_name)`).

**Dependencies:** Feature 1 (Auth).

**Best practice callouts:**
Depop shows follower counts and a "following" system prominently on profiles — this is social commerce, not just a transaction record. Nessi should show fishing identity signals (species, technique, region) as the trust equivalent: "Bass angler, 12 years, Tennessee" tells a buyer more than a generic star rating. Etsy penalizes incomplete profiles in search ranking — Nessi should do the same, giving complete profiles a mild ranking boost in search results.

**Do not build yet:** Fishing license verification, tournament history linking, follower/following social graph, profile analytics (views, clicks), verified seller badge (this comes with Stripe Connect in Feature 9).

---

### Feature 3 — Image Upload Infrastructure

**What it is:** The backend pipeline and frontend component that handles photo upload, processing, storage, and delivery for listings. Every listing depends on photos. Building this correctly once prevents the most common mobile-first failure mode: photo upload works in testing, breaks under real mobile network conditions.

**Why at this position:** Listing creation (Feature 4) cannot be built without this infrastructure in place. Photo upload is step one of the listing flow — if it's unreliable, the entire seller experience fails at the first action.

**UI Pattern:** The upload component is a drag-and-drop zone on desktop and a full-width tap target on mobile that opens a bottom sheet with "Take photo" and "Choose from library" options. On mobile, "Take photo" uses the camera capture attribute (`<input accept="image/*" capture="environment">`), which opens the rear camera directly — do not use a third-party camera component when the native input works. Photos are displayed in a reorderable grid (drag-and-drop on desktop, press-and-hold to drag on mobile). The first photo in the grid is automatically the cover photo, indicated by a "Cover" badge. Photo upload progress is shown per-photo with an individual progress bar — not a single aggregate bar — so users know exactly which photos are uploading and which failed.

**Mobile-first spec:**

- The upload tap target is minimum 120px tall on mobile — large enough to hit with a thumb in a garage

- Each photo thumbnail in the grid is square, 80×80px on mobile, 120×120px on desktop

- Failed uploads show a red border and a retry icon on the thumbnail. Tap the retry icon to reupload that photo only — the user does not re-upload all photos

- Upload is non-blocking: users can continue filling out the rest of the listing form while photos upload in the background

- On a slow connection, each photo shows its upload percentage. If the connection drops mid-upload, the upload pauses and resumes automatically when connectivity is restored (use resumable uploads via Supabase Storage's TUS protocol)

- Maximum 12 photos per listing. When the limit is reached, the add-photo button is hidden and a note appears: "You've reached the 12-photo limit."

- Minimum 2 photos required to publish a listing (enforced at publish, not during upload)

**Acceptance criteria:**

1. A user can upload photos by tapping the upload zone on mobile (opens bottom sheet) or dragging files onto the zone on desktop (drag-and-drop with visual highlight on dragover).

2. Accepted file types: JPEG, PNG, WebP, HEIC (HEIC is the default iPhone format — failing to support it causes silent failures for most iOS users). Maximum file size per photo: 20MB before processing.

3. On upload, each image is processed server-side: resized to a maximum of 2000px on the long edge, compressed to under 400KB, converted to WebP, and stored in Supabase Storage under the path `listings/[listing_id]/[uuid].webp`. A thumbnail version (400×400px) is generated and stored separately for use in listing grid cards.

4. Photos are reorderable by drag-and-drop on desktop and long-press-drag on mobile. Changing the order saves immediately (optimistic update) and persists to the database.

5. Deleting a photo shows a confirmation: a small popover (not a modal) on desktop, a bottom sheet confirmation on mobile, saying "Remove this photo?" with "Remove" and "Cancel" actions. On confirm, the photo is removed from storage and the grid shifts.

6. If an upload fails, the thumbnail shows a red overlay with a retry icon. Tapping retry re-attempts the upload. Three failed retries show a different state: "Upload failed. Try a different photo or check your connection."

7. All uploaded photos are served via CDN (Supabase Storage CDN URL). Photo URLs are stable and do not expire.

8. The upload component works correctly in iOS Safari 16+ and Android Chrome 110+. Test specifically: HEIC upload on iPhone, camera capture on Android, slow 4G simulation (Chrome DevTools throttle to "Slow 3G").

**Data model notes:** `listing_photos` table: `id` (UUID), `listing_id` (UUID, FK to `listings`), `url` (text — CDN URL of full-size image), `thumbnail_url` (text — CDN URL of thumbnail), `position` (integer — sort order), `created_at`. The `listings` table stores `cover_photo_url` as a denormalized field (always the `url` of the photo at position 0) to avoid a join on every listing card render.

**Integration notes:** Supabase Storage with TUS resumable upload protocol for mobile reliability. Server-side image processing via Sharp (Node.js) running in a Next.js API route or Vercel Edge Function. Do not process images client-side — mobile browsers run out of memory on large HEIC files.

**Dependencies:** Feature 1 (Auth — uploads are authenticated to prevent anonymous storage abuse).

**Best practice callouts:**
Vinted's listing flow opens the camera immediately as the first step — sellers take photos first, then fill in details. This reduces abandonment because the hardest part (good photos) is done before the user has committed any typing. Nessi's listing creation flow (Feature 4) should follow this pattern. eBay's photo upload on mobile is consistently rated the worst part of the selling experience in user reviews — multiple uploads fail silently, the reorder UI is broken on small screens, and HEIC is not supported. Nessi fixes all three of these from day one.

**Do not build yet:** Video upload, 360° photo support, AI-powered photo quality scoring, automatic background removal, photo watermarking.

---

## Layer 2 — Core Marketplace Loop

_The minimum viable loop: list something, find it, look at it. All four listing features and search must be complete before any Layer 3 transaction work begins._

---

### Feature 4 — Listings: Create

**What it is:** The flow through which a seller creates a listing for a piece of gear — photos, category, condition, description, price, and shipping preference. This is the seller's first meaningful action after auth and profile setup, and it must be completable in under 5 minutes on mobile. Danny will photograph and list a rod from his phone on a boat dock, or he won't bother.

**Why at this position:** Listings are the inventory. Without listings, there is nothing to browse, search, or buy. This feature directly depends on image upload infrastructure (Feature 3) and user profiles (Feature 2) and cannot be built before either.

**UI Pattern:** A multi-step wizard with a persistent progress indicator at the top. Five steps, each fitting on a single mobile screen without scrolling where possible:

- **Step 1 — Photos:** The upload component from Feature 3, full-screen, with the minimum requirement "Add at least 2 photos" shown prominently. A photo guidance modal is accessible via a "?" icon — it shows category-specific photography tips (for rods: photograph the cork grip, all guides, the tip section, the blank at mid-length; for reels: the drag knob, bail, spool, body). This modal is a bottom sheet on mobile, a popover on desktop. Users can skip the guidance and upload freely.

- **Step 2 — Category & Condition:** A two-part step. Category is a tap-to-select tile grid (not a dropdown) showing: Rods, Reels, Combos, Lures (Hard Baits), Lures (Soft Plastics), Flies, Tackle & Hooks, Electronics, Apparel, Line & Leader, Custom / Handmade, Other. After selecting category, condition tier appears as a radio group with the 6 tiers, each with a one-sentence fishing-specific description (see condition grading spec below). A "What's this?" link next to "Condition" expands an inline accordion with the full tier definitions — not a modal, not a new page.

- **Step 3 — Details:** Title (text input, 80 char max, with live counter), Description (textarea, 2000 char max), and optional "Fishing History" field (textarea, 500 char max) where sellers can describe how and where the gear was used. Placeholder in Fishing History: "e.g. Two seasons of bass fishing on Table Rock Lake, Missouri. Mostly topwater. Never dropped."

- **Step 4 — Pricing:** Price (numeric input with `$` prefix, `inputmode="decimal"`). The fee calculator appears immediately below: "You'll receive approximately $[net] after Nessi's [fee] fee." The fee updates live as the price field changes — no submit required to see the calculation. A comparison line below shows: "vs. eBay: ~$[ebay_net] · Etsy: ~$[etsy_net]" using the competitor fee rates. Shipping preference: "I'll ship" (seller handles shipping, more fields in Step 5) or "Local pickup only" (no shipping).

- **Step 5 — Shipping (conditional on Step 4 choice):** Item weight (pounds and ounces, two separate numeric inputs), package dimensions (L × W × H in inches, three inputs). A "What box should I use?" expandable section provides category-specific packaging guidance (rod tubes, double-boxing reels). After entering dimensions and weight, a real-time shipping estimate is shown: "Estimated shipping from [seller's state] to buyer: USPS $X.XX · UPS $X.XX · FedEx $X.XX." These are estimates only — final rates calculate at checkout based on buyer's zip. At the bottom: "Who pays shipping?" — options are "Buyer pays" (default) or "I'll offer free shipping" (seller absorbs cost; displayed as "Free shipping" on the listing).

After Step 5, the listing enters a review screen showing a preview of how the listing card will appear in search results, and a preview of the full listing detail page. Two actions: "Publish Listing" and "Save as Draft." Published listings are immediately live. Draft listings are saved to the seller dashboard and not publicly visible.

Between steps, a "Save draft and exit" option is always accessible via a link in the top-right (below the nav on mobile). Progress is auto-saved every 30 seconds.

**Mobile-first spec:**

- Step transitions: slide left on advance, slide right on back. Steps do not reload the page — this is client-side state.

- The "Next" button is always sticky to the bottom of the screen, 48px tall, full-width on mobile.

- The back button is a text link in the top-left, not a browser back — using browser back should also work (don't break it) but the in-form back preserves state.

- On Step 3, the title input auto-suggests a title format: "[Brand] [Model] [Category] — [Condition]" appears as placeholder text. Example: "Shimano Stradic CI4+ 2500 Spinning Reel — Very Good."

- On Step 4, the price input opens a numeric keypad on mobile. The `$` prefix is display-only, not part of the input value.

- If the user exits the wizard mid-flow and returns later (same session or different session), they land back on the step where they left off with all data intact.

**Acceptance criteria:**

1. A logged-in user with a completed profile (Feature 2) can access the listing creation wizard from the "Sell Your Gear" button in the nav, which is visible at all times when logged in.

2. A user who is not logged in who taps "Sell Your Gear" is shown a login prompt (bottom sheet on mobile, modal on desktop) before the wizard begins. After auth, they are returned to the start of the wizard.

3. The wizard cannot be advanced past Step 1 without at least 2 photos uploaded.

4. The wizard cannot be advanced past Step 2 without a category selected and a condition grade selected.

5. The wizard cannot be advanced past Step 3 without a title (minimum 10 characters) and a description (minimum 20 characters).

6. The wizard cannot be advanced past Step 4 without a price entered. Minimum price: $1.00. Maximum price: $9,999.00. Non-numeric input clears on blur.

7. The fee calculator on Step 4 updates within 200ms of any keystroke in the price field. It does not require a network call — fees are calculated client-side using the fee schedule: flat $0.99 for prices under $15, 6% for prices $15 and above.

8. "Publish Listing" creates a listing record in the database with status `active` and redirects the seller to the listing detail page (`/listing/[id]`) with a success banner: "Your listing is live. Share it to get your first views." The banner includes a copy-link button and share sheet trigger.

9. "Save as Draft" creates a listing record with status `draft` and redirects to the seller dashboard listings tab, where the draft appears at the top with an "Edit" action.

10. Auto-save fires every 30 seconds during wizard completion and saves a `listing_drafts` record (or updates it). If the browser closes and the user returns within 7 days, the wizard reopens at the last completed step with data restored. After 7 days, the draft is deleted and the user starts fresh.

11. The listing review screen (final step before publish) accurately reflects how the listing will appear publicly: cover photo, title, price, condition badge, seller name, and estimated shipping range.

12. The listing detail page generated on publish is accessible at `/listing/[id]` immediately — no indexing delay, no moderation hold at MVP.

**Edge cases:**

- Photos fail to upload during wizard: the "Next" button on Step 1 is disabled until at least 2 photos have successfully uploaded. Failed uploads show the retry state from Feature 3.

- User attempts to publish with a price of $0: blocked with inline error "Price must be at least $1.00."

- Network drops between Step 4 and publishing: auto-save has captured all data. On reconnect, the publish action can be retried without re-entering any information.

**Data model notes:** `listings` table: `id` (UUID), `seller_id` (UUID, FK to `profiles`), `title` (text), `description` (text), `fishing_history` (text, nullable), `category` (enum), `condition` (enum: new_unfished, excellent, very_good, good, fair, for_parts), `price` (integer — stored in cents to avoid floating point errors), `status` (enum: draft, active, sold, deactivated), `ships_from_state` (char(2)), `shipping_paid_by` (enum: buyer, seller), `weight_oz` (integer, nullable — total weight in ounces), `package_length_in` (numeric, nullable), `package_width_in` (numeric, nullable), `package_height_in` (numeric, nullable), `cover_photo_url` (text), `view_count` (integer, default 0), `watcher_count` (integer, default 0), `created_at`, `updated_at`, `published_at`.

**Dependencies:** Feature 1 (Auth), Feature 2 (User Profile), Feature 3 (Image Upload).

**Best practice callouts:**
Vinted's listing flow opens the camera as step one — sellers commit to photos before they've typed a word. This reduces abandonment to near-zero because the "hard" part (good photos) happens before the "boring" part (form fields). The Nessi wizard follows this exact pattern. eBay's listing flow has 23 optional fields visible at once on desktop — sellers routinely abandon it. Nessi's five-step wizard with a maximum of 7 fields visible per step is a deliberate constraint, not a limitation.

**Do not build yet:** Listing templates (duplicate a previous listing), bulk listing upload (CSV import), featured listing promotion purchase (the UI exists in pricing but the billing for it is a separate feature), maker-specific fields (commission availability, production time, materials).

---

### Feature 5 — Listings: Read & Browse

**What it is:** The public-facing listing detail page and the category browse experience. Buyers spend more time here than anywhere else on the platform — every trust decision happens on the listing page. This is where Marcus decides whether to message or move on in 8 seconds.

**Why at this position:** Buyers must be able to see inventory before any search, checkout, or messaging feature is meaningful. This is also the feature that produces shareable URLs — the first real tool for organic growth via social sharing.

**UI Pattern:** The listing detail page (`/listing/[id]`) is a full-page view, not a modal. The reasoning is critical: listing pages must be linkable, shareable, and indexable by search engines. A seller posts their listing URL in a Facebook fishing group — it must open directly to the full listing. A modal destroys this.

On mobile, the listing detail layout is:

1. Photo gallery (full-width, swipeable, with dot pagination indicator and photo count e.g. "3/7")

2. Price (large, left-aligned) + Condition badge (right-aligned) on the same row

3. Title (2 lines max, truncates to "...show more")

4. Seller info strip: avatar (24px), display name, fishing identity tags, star rating + transaction count, "View shop" link

5. "Buy Now" button — sticky, full-width, at bottom of screen at all times on mobile

6. "Make Offer" text link — appears just above the Buy Now button, smaller, secondary

7. "Watch" button with heart icon — appears in the top-right of the photo gallery (overlaid), 44×44px tap target

8. "Message Seller" text link — beneath the Buy Now button

9. Description and Fishing History sections — collapsed by default on mobile, expanded by tapping the section header

10. Shipping estimate widget — "Enter your zip for a shipping estimate" with a zip code input that triggers a live rate lookup (connects to EasyPost in Feature 17; at MVP before Feature 17, show "Shipping: calculated at checkout")

11. Condition details with the full tier description and photo guidance prompts (expandable accordion)

12. "Report this listing" — a small text link at the very bottom, opens a bottom sheet with report reasons

On desktop (≥1024px), the layout switches to a two-column grid: photo gallery on the left (60% width), all action elements and details on the right (40% width, sticky as user scrolls through photos).

The category browse page (`/category/[slug]`) shows listings in a 2-column grid on mobile, 3-column on tablet, 4-column on desktop. Each listing card shows: cover photo (square, fills card width), title (1 line, truncated), price, condition badge, seller location (state only). No descriptions on cards — descriptions slow reading speed in browse mode. Cards are tappable anywhere (not just a "View" button).

**Acceptance criteria:**

1. The listing detail page at `/listing/[id]` is accessible without authentication. All content — photos, price, description, seller info — is visible to unauthenticated users.

2. The photo gallery on mobile supports swipe-left and swipe-right to navigate between photos. Pinch-to-zoom works on individual photos. Tapping a photo opens it in a full-screen lightbox with the same swipe navigation.

3. The cover photo is shown first. The photo order matches the order set by the seller in the listing wizard.

4. The "Buy Now" button is visible at all times on mobile as a sticky bottom bar. On desktop, the button is visible in the right column and becomes sticky after the user scrolls past the photo gallery.

5. The "Watch" button (heart icon) on the listing: if the user is not logged in, tapping it shows a login prompt (bottom sheet on mobile). If logged in, tapping toggles the watch state with an optimistic UI update — the heart fills immediately, the database write happens asynchronously. A "Watched" toast confirms: "Added to your Watchlist."

6. The seller info strip links to the seller's shop profile (`/seller/[display_name]`). Tapping the seller name or "View shop" navigates to that page.

7. Each listing page increments the `view_count` on the listing record on every unique page load (unique = not the same user/session within 24 hours). The view count is visible to the seller in their dashboard but not on the public listing page at MVP.

8. Listings with status `sold`, `deactivated`, or `draft` return a 404 page if accessed directly, except for `sold` listings which show a "This listing has sold" page with a "Browse similar listings" section showing 4 listings from the same category and similar condition.

9. Category browse at `/category/[slug]` shows all active listings in that category, sorted by most recently published by default. Valid slugs match the category enum from Feature 4.

10. The listing grid uses infinite scroll (not pagination): when the user scrolls within 200px of the last card, the next page of 24 listings loads automatically. A loading skeleton of 4 cards appears at the bottom during load.

11. Each listing card in the grid is tappable anywhere and navigates to the listing detail page. There is no separate "View" button. The entire card is the tap target.

12. Listing detail pages are server-side rendered (Next.js `generateMetadata` and page-level fetch) for SEO. Title tag: "[Title] — [Condition] | Nessi". OG image: cover photo. OG description: first 160 characters of the description.

**Edge cases:**

- Listing with fewer than 2 photos (possible if photos are deleted after publishing): show whatever photos exist; do not error.

- Seller has deactivated their account: listing shows as a 404.

- User is the seller viewing their own listing: hide the "Buy Now" and "Make Offer" buttons, show an "Edit listing" button instead.

**Data model notes:** Add a `listing_views` table for unique view tracking: `listing_id` (UUID), `viewer_session` (text — hashed session identifier), `viewed_at` (timestamp). Use a 24-hour deduplication window. Alternatively, use a simpler approach at MVP: a `view_count` integer on the `listings` table updated via an upsert, accepting some over-counting from refreshes.

**Dependencies:** Feature 1 (Auth — for Watch functionality), Feature 2 (User Profile), Feature 3 (Image Upload), Feature 4 (Listings Create — must have listings to show).

**Best practice callouts:**
Reverb's listing page has the buy button sticky on mobile regardless of scroll depth — the #1 conversion insight from their mobile UX research. Depop's listing cards show zero text other than price — pure photo-first browsing that drives impulse discovery. Nessi cards include condition badge because fishing gear condition is a purchase decision variable that clothing is not; hiding it forces an extra page load before the buyer can qualify the listing.

**Do not build yet:** "Similar listings" recommendation engine (needs inventory data to train), listing analytics for sellers (views, click-through rates), social sharing buttons (share via native share sheet is sufficient at MVP using the Web Share API), "Best Offer" price suggestion widget.

---

### Feature 6 — Listings: Edit & Delete

**What it is:** The ability for sellers to edit any field on an active or draft listing, and to deactivate or delete a listing they no longer want to sell.

**Why at this position:** Sellers make mistakes. A wrong price, a missing photo, a typo in the title — these happen on the first listing. Without edit capability, sellers have to delete and relist, which breaks any watch notifications and resets the view count. Edit must exist before any real-world testing.

**UI Pattern:** Editing is accessed from the seller dashboard (Feature 24, stubbed early) and from the listing detail page when the seller is viewing their own listing. The edit view is the same five-step wizard from Feature 4, pre-populated with all existing data. The seller can jump directly to any step (the step progress bar is clickable in edit mode), rather than stepping through sequentially. Saving in edit mode does not require completing all five steps — partial edits (e.g., changing only the price) save with a single "Save changes" button that appears at the bottom of whichever step the seller is on.

Price changes on active listings: if a listing has watchers, a price reduction automatically triggers a price drop alert to all watchers (Feature 15). The edit flow shows a notice: "X people are watching this listing. Lowering your price will notify them."

Deleting a listing is irreversible. The action is available from the listing's three-dot menu (on mobile, this is a bottom sheet with options: Edit, Mark as Sold, Deactivate, Delete). "Delete" shows a confirmation: "Delete this listing? This can't be undone." with "Delete" (red) and "Cancel" actions. "Deactivate" hides the listing from public view but preserves it in the dashboard — it can be reactivated.

"Mark as Sold" is distinct from "Delete" — it sets status to `sold`, removes the listing from active search results, and records the sale (even if the sale happened off-platform). Marked-as-sold listings contribute to the seller's transaction count.

**Acceptance criteria:**

1. A seller can edit any field on a listing with status `active` or `draft`. Edits to active listings take effect immediately on the public listing page.

2. The edit wizard pre-populates all fields with current listing data. No field is blank on load.

3. A seller can change the price. If the listing has 1 or more watchers, the edit form shows: "X people are watching this listing. A price decrease will notify them automatically." This is informational — it does not prevent the price change.

4. A seller can reorder, add, or remove photos in edit mode. The minimum-2-photos rule applies: the "Save changes" button is disabled with an error state if the seller has reduced photos below 2.

5. "Mark as Sold" is available from the three-dot menu on active listings. Confirming sets status to `sold` and records `sold_at` timestamp. The seller can optionally enter the sale price (for dashboard analytics).

6. "Deactivate" sets status to `deactivated`. The listing disappears from public browse and search within 60 seconds (cache invalidation). The listing remains in the seller dashboard with an "Activate" button to restore it.

7. "Delete" prompts a confirmation and, on confirm, sets status to `deleted`. Deleted listings are not recoverable from the UI. The data record is soft-deleted (set a `deleted_at` timestamp) — not hard-deleted from the database.

8. A buyer who has the listing URL for a deactivated or deleted listing sees the "This listing has sold" page (if sold) or a 404 (if deactivated or deleted).

**Dependencies:** Feature 4 (Listings Create), Feature 3 (Image Upload — for photo management).

**Best practice callouts:**
Reverb allows sellers to edit listings inline from their dashboard without entering a full wizard — price changes especially should be a single-field edit, not a five-step flow. At minimum, provide a quick-edit price modal (a bottom sheet on mobile with just the price field and the fee calculator) accessible from the dashboard listing card without entering the full edit wizard. Etsy's listing management is widely criticized for making simple price changes require navigating through a full edit form — Nessi solves this with the quick-edit pattern.

**Do not build yet:** Bulk price editing (Feature 25), listing expiry and auto-relist, price history tracking for sellers, "promote this listing" upsell.

---

### Feature 7 — Search: Keyword + Filters

**What it is:** The ability for buyers to find specific gear using keyword search and structured filters. This is the most important discovery mechanism on the platform. A buyer who can't find a Shimano Stradic CI4+ in "Very Good" condition under $200 in their region has no reason to use Nessi instead of eBay.

**Why at this position:** Search converts a collection of listings into a marketplace. Without it, the only way to find something is category browse, which works for discovery but fails for intent. Danny will not adopt Nessi if he can't verify his specific rod model is in inventory before he commits to listing there.

**UI Pattern:** Search is accessed from the persistent search bar in the navigation header (visible on every page). On mobile, the search bar in the nav is a search icon button — tapping it expands to a full-screen search overlay with the search input auto-focused. This pattern (icon → fullscreen overlay) is used by Airbnb, Depop, and Goat on mobile — it avoids the awkward shrinking-nav problem of embedding a full search bar in mobile headers.

Search results page (`/search?q=[query]&[filters]`): results in a 2-column grid on mobile, 3-column on tablet, 4-column on desktop. Filter controls are accessible via a "Filters" button that opens a bottom sheet on mobile with all filter options stacked vertically, with a "Show [X] results" sticky button at the bottom. On desktop, filters appear in a left rail (240px wide) that is always visible. Filters do not require a page reload — they update results via URL parameter change and Next.js client-side navigation.

Available filters: Category (multi-select), Condition (multi-select using the 6-tier system), Price range (min/max numeric inputs), Location (state select — shows listings from that state), Ships free (boolean toggle), Species (multi-select — bass, trout, walleye, etc.), Listing type (Used, Custom/Handmade, New). Sort options: Most recent (default), Price: Low to High, Price: High to Low, Most watched.

**Acceptance criteria:**

1. The search bar accepts text input and submits on Enter or tap of a search icon. Search is triggered with a minimum of 2 characters.

2. Search results are returned from a PostgreSQL full-text search query across listing `title`, `description`, and `fishing_history` fields using Supabase's built-in `to_tsvector` / `to_tsquery` functions. At MVP scale (under 10,000 listings), this is sufficient — Algolia is a Phase 2 upgrade.

3. Typo tolerance is implemented via PostgreSQL's `similarity()` function (trigram matching via the `pg_trgm` extension). Searching "Shimamo" returns results for "Shimano." Searching "Diawa" returns results for "Daiwa." Searching "Pennn" returns results for "Penn."

4. Search results show only listings with status `active`. Sold, deactivated, draft, and deleted listings do not appear.

5. Each filter applied adds a parameter to the URL. The URL is shareable and bookmarkable — a user who shares a filtered search URL with a friend opens that friend's browser to the same filtered results.

6. Applied filters are displayed as removable chips above the results grid. Each chip shows the filter name and value (e.g., "Condition: Very Good ×"). Tapping the × removes that filter.

7. The filter bottom sheet on mobile shows a count next to each filter option indicating how many active listings match (e.g., "Very Good (42)"). These counts update when other filters are applied.

8. A "No results" state shows: a fishing illustration, the headline "Nothing here yet," the body "We couldn't find any [query] matching your filters. Try removing a filter or broadening your search," and a "Clear all filters" button that removes all filters and reruns the query with just the search term.

9. An empty search (no query, no filters) redirects to the homepage. The search bar does not submit an empty query.

10. Search result pages are indexable by search engines (SSR or ISR, not client-side-only). Title tag: "Search results for '[query]' | Nessi Fishing". OG description: first 10 listing titles joined by comma.

11. Autocomplete suggestions appear as the user types (minimum 3 characters, debounced 200ms). Suggestions come from: popular recent searches (stored server-side), listing titles matching the input, and category names. Maximum 8 suggestions shown in a dropdown below the search input.

12. The "Species" filter maps to listing metadata that will be added in Feature 20 (Fishing Identity). At MVP, this filter is built but shows zero results until listings have species tags. The filter UI is present and functional; it simply returns an empty result for now. Do not defer the UI.

**Data model notes:** Add a `search_suggestions` table for tracking popular searches: `query` (text), `count` (integer), `updated_at`. Increment count each time a search is submitted. The top 50 queries by count are used for autocomplete. Add `tsvector` generated column on `listings`: `search_vector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(fishing_history,''))) STORED`. Create a GIN index on this column.

**Dependencies:** Feature 4 (Listings Create — needs listings), Feature 5 (Listings Browse — shares the listing card component).

**Best practice callouts:**
Reverb's search preserves filter state across browser sessions using localStorage — a buyer who filtered for "Fender Stratocaster, Excellent, under $800" yesterday sees those filters pre-populated today. Nessi should do the same: persist the last applied filter set in localStorage and restore it as a suggestion ("Pick up where you left off?") on the search page. eBay's mobile search filter UX requires 4 taps and 2 page loads to apply a single filter — Nessi's bottom sheet pattern with live result count updates solves this in a single interaction.

**Do not build yet:** AI scenario search (Feature 22), saved search alerts (Feature 15 — built after messaging/auth flows are stable), seller-level search analytics, search ads or sponsored listings.

---

### Feature 8 — Seller Shop Profile

**What it is:** The public-facing page for every seller on Nessi, showing their active listings, fishing identity, bio, and reputation. This is where trust is established before a transaction. Kevin won't buy a discontinued lure from someone with no history and no profile.

**Why at this position:** The shop profile depends on user profiles (Feature 2), active listings (Feature 4), and the listing browse component (Feature 5). It must exist before transactions begin — buyers make decisions based on seller credibility, and credibility requires a page to live on.

**UI Pattern:** The shop profile at `/seller/[display_name]` is a full page. On mobile, the layout from top to bottom: hero banner (user-uploadable, defaults to a fishing-themed placeholder — a simple blurred version of the seller's cover photo from their most recent listing), avatar + display name + fishing identity tags (species, technique, state) in a single row, bio (expanded by default), stats bar (member since, transaction count, average rating, response time), active listings in a 2-column grid sorted by most recently published. A sticky "Message [display_name]" button appears at the bottom of the screen on mobile when the user scrolls past the stats bar.

An "About" tab and "Listings" tab structure the page on desktop — on mobile, it is a single scrollable page (no tabs; tabs require extra taps on mobile and fragment content unnecessarily).

**Acceptance criteria:**

1. The shop profile at `/seller/[display_name]` is publicly accessible without authentication.

2. The page shows: seller avatar, display name, fishing identity tags (species, technique, state), bio, member since date, total completed transactions (from confirmed orders in Feature 11), average star rating (from Feature 19; shows "No reviews yet" until first review), and estimated response time (calculated from message thread timestamps in Feature 13).

3. Active listings are shown in a 2-column grid sorted by most recently published. The grid loads 12 listings per page with infinite scroll.

4. Sold listings are not shown on the public shop profile. Deactivated and draft listings are not shown.

5. If the seller has no active listings, the grid shows an empty state: "Nothing listed right now. Check back soon." If the shop is a custom maker (detected by having ever listed in the Custom/Handmade category), the empty state adds: "This maker occasionally has custom work available — message them to commission a piece."

6. The "Message [seller]" sticky button, when tapped by an unauthenticated user, opens a login prompt (bottom sheet on mobile). When tapped by a logged-in user, it opens the message thread creation flow (Feature 13 — the button is present but disabled until Feature 13 is built; disabled state shows a tooltip: "Messaging coming soon").

7. If the logged-in user is viewing their own shop profile, the sticky button is replaced with an "Edit shop" button that navigates to `/account`.

8. The seller's shop URL (`/seller/[display_name]`) is the display name exactly as set in Feature 2. Display names with spaces use the exact character (no hyphenation at MVP — enforce no-space display names in Feature 2's validation).

9. The page is server-side rendered for SEO. Title tag: "[display_name]'s Fishing Gear Shop | Nessi". OG description: bio text (first 160 chars), or "[display_name] sells fishing gear on Nessi — browse their active listings."

**Dependencies:** Feature 2 (User Profile), Feature 4 (Listings Create), Feature 5 (Listings Browse — card component).

**Best practice callouts:**
Reverb's shop profiles include a "Ships from" location and average shipping time — buyers want to know both how quickly and how far before they commit. Nessi should show the seller's home state prominently on the shop profile (already in the fishing identity tags) and, once shipping data exists (Feature 17), calculate and display "Usually ships within X days." Etsy's shop profiles bury the seller bio below dozens of listings — Nessi's mobile layout keeps the bio above the fold to establish identity before inventory.

**Do not build yet:** Shop banner upload (ships with a default; custom banner is a nice-to-have in Phase 2), "Follow" functionality, shop stats dashboard for sellers (Feature 24), maker-specific shop features (commission requests, production time, custom order forms).

---

## Layer 3 — Transactions

_The financial and order management layer. Every feature in this layer involves real money. Test every flow with Stripe test mode, then with a real transaction between team members, before any buyer can complete a purchase._

---

### Feature 9 — Stripe Connect: Seller Onboarding

**What it is:** The flow through which a seller connects a bank account to receive payouts. Without Stripe Connect, sellers cannot receive money. This must be completed before a seller's listings are purchasable, but it should not block listing creation — a seller can create and publish listings and link their bank account separately.

**Why at this position:** Payouts break if this is missing. The worst possible user experience is a buyer completing a purchase, money leaving their account, and the payout failing because the seller never connected Stripe. Build this before checkout so the sequence can be enforced.

**UI Pattern:** Stripe Connect onboarding is triggered by a persistent banner on the seller dashboard: "Set up payouts to receive money from your sales. [Connect bank account]." The banner appears until Connect is complete and cannot be dismissed — sellers who want it gone must complete onboarding. Clicking "Connect bank account" opens Stripe's hosted Connect onboarding flow in a new tab (do not embed it in an iframe — Stripe's compliance requirements prohibit this in most cases). On return to the tab after completing Stripe's flow, the dashboard banner disappears and a confirmation toast appears: "You're set up to receive payouts."

For listings owned by sellers who have not completed Stripe Connect, the "Buy Now" button on the listing detail page is replaced with a message: "This seller hasn't set up payments yet. Watch this listing and we'll notify you when they do." The Watch button is prominently shown. This is honest and does not falsely prevent the buyer from acting — it also incentivizes sellers to complete Connect.

**Acceptance criteria:**

1. The Stripe Connect onboarding flow is accessible from the seller dashboard at `/dashboard/payouts`.

2. Initiating onboarding creates a Stripe Connect account for the seller (Custom or Express account — use Express for simplicity at MVP) and generates an account link URL. The seller is redirected to this URL.

3. On successful completion of Stripe Connect onboarding, Stripe sends a webhook to the Nessi backend. The webhook handler sets `is_stripe_connected = true` and stores the `stripe_account_id` on the `profiles` record.

4. On failed or abandoned onboarding (seller closes the Stripe flow without completing), the seller is returned to the dashboard and the banner remains.

5. Listings owned by sellers with `is_stripe_connected = false` show a disabled "Buy Now" button with the message "Payments not set up" on the listing detail page.

6. Sellers who complete Connect can view their payout schedule and balance from `/dashboard/payouts`, which embeds the Stripe-provided components for payout status.

7. The Stripe webhook endpoint verifies the Stripe-Signature header before processing any event. Invalid signatures return HTTP 400 and are logged.

**Data model notes:** Add to `profiles`: `is_stripe_connected` (boolean, default false), `stripe_account_id` (text, nullable). The `stripe_account_id` must never be exposed in any client-side response — it is server-only.

**Integration notes:** Use Stripe Connect Express (not Standard or Custom) for the fastest onboarding path. Express handles KYC and identity verification on Stripe's side. Platform fee (Nessi's 6%) is configured as `application_fee_amount` on the Payment Intent — not as a separate charge. This ensures the fee is correctly withheld even if the seller disputes the transaction.

**Dependencies:** Feature 1 (Auth), Feature 2 (User Profile).

**Best practice callouts:**
Reverb holds off on enforcing Stripe Connect until the seller's first sale is imminent — they allow listing without Connect but block checkout if the seller isn't connected. This is the right UX choice: don't create onboarding friction before the seller has proven intent by creating a listing. Nessi follows the same model. Etsy's payment setup is buried in account settings with no persistent prompt — sellers frequently don't realize they need to complete it until their first sale fails, at which point trust is damaged. Nessi's persistent dashboard banner prevents this.

**Do not build yet:** Stripe Connect Standard or Custom (use Express), multi-currency payouts, 1099-K tax form generation (required by IRS when gross payments exceed $600 — this is a compliance task for Year 1 Q4), seller payout acceleration (instant payouts for a fee).

---

### Feature 10 — Checkout: Guest + Account

**What it is:** The complete purchase flow from "Buy Now" to order confirmation. This is the most critical feature in the product — every architectural decision here has revenue implications. Get it right once.

**Why at this position:** Checkout depends on listings (Feature 4-5), Stripe Connect seller onboarding (Feature 9), and order management infrastructure (Feature 11 — build the schema together). Checkout cannot exist without a payment rail.

**UI Pattern:** Checkout is a full-page flow at `/checkout/[listing_id]`. It is never a modal. The reasoning is that checkout involves real money and potentially sensitive payment information — modals are dismissible by accident (click-outside, escape key) and do not support URL-based state recovery. A buyer who closes their browser mid-checkout needs to return to the same URL and find their cart intact.

Checkout flow has three steps on a single scrollable page (not separate pages — single-page checkout reduces abandonment by eliminating page loads between steps):

1. **Contact** (first for guest users): email address input. For logged-in users, email is pre-filled and this section is collapsed and locked.

2. **Shipping address**: full name, address line 1, address line 2 (optional), city, state (select), zip code. Address autocomplete is mandatory — use Google Places Autocomplete or Mapbox. No manual address entry on mobile.

3. **Payment**: Apple Pay and Google Pay as the first two options (large buttons, full-width), followed by "Pay with card" (which expands the Stripe Card Element). The card element must be the Stripe-hosted element — do not build a custom card input. PayPal is deferred to Phase 2.

An order summary panel is sticky on desktop (right column) and collapsed by default on mobile (tapping a summary bar at the top reveals it). The summary shows: listing photo (thumbnail), title, condition, price, Nessi fee breakdown ("Platform fee: $X.XX"), shipping cost (if buyer pays — calculated based on their zip from EasyPost rate, or "Free" if seller covers), and total.

Guest checkout: the buyer completes the flow without creating an account. After order confirmation, a full-width banner appears: "Save your order details and get shipping updates. Create a free account." with a one-click account creation (their email is pre-filled from checkout, they just need to set a password). This is an invitation, not a gate.

**Acceptance criteria:**

1. The checkout page is accessible at `/checkout/[listing_id]` for any active listing owned by a seller with `is_stripe_connected = true`.

2. Navigating to checkout for a listing that is `sold`, `deactivated`, `draft`, or `deleted` shows an error page: "This listing is no longer available" with a "Browse similar listings" section.

3. A seller cannot purchase their own listing. If the logged-in user is the listing owner, navigating to checkout redirects to the listing detail page.

4. Address autocomplete fires on the address line 1 field after 3 characters are typed. Selecting an autocomplete suggestion populates all address fields (address, city, state, zip) in a single action.

5. Apple Pay is shown only on Safari on iOS and macOS where the capability is available. Google Pay is shown on Chrome on Android and desktop Chrome. The payment method buttons detect capability correctly using the Stripe Payment Request Button API.

6. On successful payment, a Stripe Payment Intent is created with `application_fee_amount` set to Nessi's fee (99 cents for items under $15; 6% for items $15+, rounded to the nearest cent). The payment confirms, the listing status is set to `sold`, and an order record is created (Feature 11).

7. The buyer is redirected to the order confirmation page (`/orders/[order_id]`) immediately after payment confirmation. The page shows: order number, listing thumbnail and title, buyer's shipping address, estimated delivery, and a "View your order" link.

8. An order confirmation email is sent to the buyer's email address within 60 seconds of purchase. The email includes: order number, item details, shipping address, total paid, and a link to the order tracking page.

9. An order notification email (and, once Feature 13 is built, an in-platform message) is sent to the seller within 60 seconds: "You have a new sale. Ship [item] to [buyer first name] in [buyer city, state] by [ship-by date = today + 3 days]. Print your shipping label."

10. If the payment fails (card declined, insufficient funds), the checkout page shows an inline error above the payment section: "Payment failed: [Stripe's user-facing decline message]. Please try a different payment method." The form data is preserved. The listing status does not change.

11. Checkout pages are not indexed by search engines (add `noindex` meta tag).

12. The entire checkout flow (from "Buy Now" to order confirmation) is completable without ever needing to scroll back to the top of the page on mobile.

**Edge cases:**

- Listing sells to another buyer while the current buyer is on the checkout page: when the payment intent is created, a pre-authorization check confirms the listing is still active. If it sold, the checkout page shows "This listing just sold to another buyer. Here are similar listings."

- Browser back button on the confirmation page: show the confirmation page again (do not allow navigating back to checkout after payment).

**Data model notes:** `orders` table: `id` (UUID), `listing_id` (UUID, FK), `buyer_id` (UUID, FK to `profiles`, nullable — null for guest), `buyer_email` (text), `seller_id` (UUID, FK), `stripe_payment_intent_id` (text, unique), `amount_cents` (integer — total charged), `nessi_fee_cents` (integer), `shipping_cost_cents` (integer), `status` (enum: pending_payment, paid, shipped, delivered, disputed, refunded), `shipping_address` (JSONB), `created_at`, `updated_at`.

**Integration notes:** Stripe Payment Intents API (not Charges API — Payment Intents is the current Stripe standard). Webhook events to handle: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`. All webhooks verify the Stripe-Signature header. Idempotency keys on all Payment Intent creation calls.

**Dependencies:** Feature 4 (Listings), Feature 9 (Stripe Connect), Feature 3 (Image Upload — for listing thumbnail in order summary).

**Best practice callouts:**
Shop Pay (Shopify's accelerated checkout) achieves checkout in under 60 seconds for returning users because it stores shipping address and payment method server-side and surfaces them with a single tap. Nessi should store shipping address for logged-in users and pre-fill checkout on return. Poshmark's checkout requires creating an account before purchase — their conversion data shows this costs them 15-30% of potential transactions. Nessi's guest checkout directly addresses this. Never show Stripe error codes to users (e.g., "card_declined" or "insufficient_funds") — translate them to plain language using Stripe's `decline_code` field.

**Do not build yet:** Saved payment methods for logged-in buyers (Phase 2), PayPal (Phase 2), multi-item checkout cart (Nessi is single-item checkout at MVP — each listing is purchased individually), discount codes, gift cards.

---

### Feature 11 — Order Management

**What it is:** The system for tracking the lifecycle of a transaction after checkout: the buyer tracks their order, the seller manages fulfillment, and both parties have a shared record of the transaction.

**UI Pattern:** Buyer order history at `/orders` (requires login): a list of orders sorted by most recent, showing listing thumbnail, title, total paid, current status (a color-coded badge: Paid, Shipped, Delivered), and tracking number (clickable, opens carrier tracking page in a new tab). Each order is tappable and expands to a detail view — on mobile this is a full-page slide-in, on desktop it is a right-side drawer that opens alongside the list. The detail view shows the full order timeline (created, paid, label printed, shipped, delivered) as a vertical stepper.

Seller order management lives on the dashboard at `/dashboard/orders`. It shows pending orders (awaiting label generation) prominently at the top, separated from shipped and delivered orders. Each pending order shows the buyer's first name and city/state (not full address until the seller goes to print a label — privacy-forward default), the item sold, and a large "Print Shipping Label" button that connects to EasyPost (Feature 17, stubbed with a "Coming soon" state until Feature 17 is built).

**Acceptance criteria:**

1. A buyer can view all their past orders at `/orders`. Unauthenticated users are redirected to `/login?redirect=/orders`.

2. Each order in the buyer's list shows: listing cover photo (thumbnail), listing title, seller display name (linkable to seller shop profile), date purchased, total paid, and order status badge.

3. Order status progresses through: `paid` → `shipped` (when seller marks shipped or label is scanned by carrier) → `delivered` (when carrier marks delivered via tracking webhook or buyer confirms receipt). Status updates trigger email notifications to the buyer at each transition.

4. The seller dashboard orders tab shows all orders separated into: "Action Required" (paid but not yet shipped), "Shipped," and "Completed." The "Action Required" section has a red badge count in the tab label.

5. Sellers can manually mark an order as shipped (entering a tracking number from any carrier) as a fallback when EasyPost label generation is not yet available.

6. When tracking is added (manually or via EasyPost), the buyer's order detail page shows the tracking number with a link to the carrier tracking page. A "Track Package" button opens the carrier's tracking page in a new tab.

7. Orders older than 30 days with status `shipped` are automatically transitioned to `delivered` unless a dispute is open.

8. A seller can view the buyer's full shipping address only after the order is in `paid` status (not before). The address is shown on the order detail page in the dashboard, formatted for label printing.

**Dependencies:** Feature 10 (Checkout — orders are created by checkout), Feature 2 (User Profile).

**Best practice callouts:**
Reverb's order management is the strongest in the music gear vertical — the seller-side dashboard clearly separates "needs action" from "in progress" from "done," and the buyer-facing tracking page is updated automatically via carrier webhooks rather than requiring manual status updates. Nessi replicates this separation. eBay's order flow notoriously requires sellers to navigate through multiple pages to find the buyer's shipping address — Nessi's single-page order detail with address prominently shown saves meaningful time per transaction.

**Do not build yet:** Return/refund flow (handled via Stripe dispute at MVP), order cancellation (contact support at MVP), bulk order management, CSV export of orders.

---

### Feature 12 — Fee Calculation + Payout

**What it is:** The backend logic and seller-facing UI for Nessi's revenue: the platform fee withheld from each transaction and the resulting payout to the seller.

**UI Pattern:** Sellers see their payout balance and history at `/dashboard/payouts`. The page shows: pending balance (money from recent sales held during Stripe's standard payout period, typically 2 business days), available balance (money ready for payout, already transferred to the seller's bank account), and a payout history table. The table shows each payout: date, amount, order reference (linkable to the order detail), fee withheld, and net received.

The inline fee calculator (introduced in Feature 4 during listing creation) is also available as a standalone tool at `/sell` for sellers who want to price their gear without starting a listing.

**Acceptance criteria:**

1. For each completed checkout, Nessi's application fee is withheld automatically via Stripe's `application_fee_amount` parameter on the Payment Intent. The fee is: $0.99 for orders where `amount_cents < 1500`; `floor(amount_cents * 0.06)` for orders where `amount_cents >= 1500`.

2. Seller payouts are processed by Stripe on their standard schedule (2 business days after payment is captured). Nessi does not manually trigger payouts — Stripe Connect Express handles this automatically.

3. The payout history table at `/dashboard/payouts` shows all payouts from Stripe, fetched via the Stripe API using the seller's `stripe_account_id`. Data is fetched server-side and cached for 5 minutes.

4. If a buyer disputes a charge (Stripe chargeback), the associated order is automatically set to status `disputed` and both buyer and seller receive an email notification. The seller's payout for that transaction is held pending dispute resolution. Nessi's team is notified via an internal Slack webhook (or email) for every new dispute.

5. The standalone fee calculator at `/sell` shows: a price input, the Nessi fee, and the net payout. It also shows a comparison: "vs. eBay (~13.25%): you'd receive $X · vs. Etsy (~10%): you'd receive $X." The calculator requires no authentication.

**Dependencies:** Feature 10 (Checkout), Feature 9 (Stripe Connect).

**Best practice callouts:**
Reverb surfaces the fee at every point where price is entered — listing creation, price edits, the offer flow — so sellers never feel surprised by the payout amount. Nessi does the same from Feature 4 onward. Etsy's fee disclosure is the platform's single biggest trust problem — sellers regularly post about discovering fees they didn't know existed, and the stacked fee structure (transaction + payment processing + listing + optional ads) is genuinely opaque. Nessi's single flat fee (6%, clearly shown at every step) is a structural advantage over Etsy even when the percentage is similar.

**Do not build yet:** 1099-K generation, fee overrides for promotional periods, subscription fee tier for makers ($9.99/month for 4.5% rate — build the billing infrastructure for this in Phase 2 after maker subscriptions are validated), refund fee reversal logic (partially reversed on refund — Stripe handles this).

---

## Layer 4 — Trust & Communication

---

### Feature 13 — In-Platform Messaging

**What it is:** A per-listing message thread between buyer and seller for questions about condition, shipping, and negotiation. Not a general inbox — every conversation is anchored to a specific listing. This is the difference between anonymous marketplace messages (eBay) and contextual conversation (Reverb, where both parties always know what item is being discussed).

**UI Pattern:** Messaging is a full-page experience at `/messages` (inbox) and `/messages/[thread_id]` (thread detail). On mobile, the inbox shows a list of threads sorted by most recent message: listing thumbnail (40×40px), listing title (1 line), seller or buyer name, and message preview (1 line, truncated). Tapping a thread opens the full thread — a slide-in on mobile (not a new page navigation, but the back button works and the inbox remains in history). On desktop, the inbox list is the left column (300px) and the thread is the right column — classic email client layout.

Within a thread, messages are displayed in a chat bubble pattern: sender on the left (gray bubble), receiver on the right (green bubble — Nessi's forest green, not a generic blue). Each message shows timestamp on hover (desktop) or long-press (mobile). The input at the bottom is a text area that expands up to 4 lines before scrolling internally. Send on Enter on desktop (Shift+Enter for new line). On mobile, a "Send" button is always visible to the right of the input.

The listing context card is pinned to the top of every thread: listing thumbnail, title, price, condition badge. Tapping it navigates to the listing detail page. This eliminates the "what are we talking about?" problem that plagues general marketplace inboxes.

**Acceptance criteria:**

1. A logged-in buyer can initiate a message thread from any active listing by tapping "Message Seller." This creates a new thread record and navigates to the thread detail page. If a thread already exists between this buyer and this listing, the existing thread opens instead of creating a duplicate.

2. A seller receives an email notification when a new thread is created or when a new message is added to an existing thread. Email contains the message text, the sender's display name, and a link to the thread on Nessi. Notifications are sent no more than once per 15 minutes per thread (digest logic) to prevent spam.

3. A buyer receives an email notification when the seller replies. Same 15-minute digest logic applies.

4. Threads are archived (hidden from inbox, accessible at /messages/archived) when: the associated listing is sold, or either party manually archives the thread. Archived threads are not deleted.

5. Messages support plain text only at MVP. No rich text, no markdown, no link previews, no image attachments in messages. (Photo sharing in messages — "here's another photo of the reel" — is deferred to Phase 2 and explicitly noted as coming soon.)

6. The inbox at `/messages` shows unread message count as a badge on the "Inbox" nav item. The badge clears when the thread is opened.

7. Messages in a thread are fetched on page load (no real-time WebSocket at MVP). The thread page auto-refreshes on the buyer's screen every 60 seconds while open. A "Refresh" link appears below the last message: "Last updated [X seconds] ago. Refresh."

8. Sellers can see the buyer's fishing identity tags (species, technique) in the thread sidebar — this establishes shared context and is one of Nessi's differentiators from eBay's anonymous message system.

9. A "Report conversation" link at the top of every thread opens a bottom sheet with reasons: "Spam," "Inappropriate content," "Off-platform transaction request," "Other." Submitting a report creates a moderation record.

**Data model notes:** `message_threads` table: `id` (UUID), `listing_id` (UUID, FK), `buyer_id` (UUID, FK), `seller_id` (UUID, FK), `status` (enum: active, archived), `created_at`, `updated_at`. `messages` table: `id` (UUID), `thread_id` (UUID, FK), `sender_id` (UUID, FK), `content` (text), `is_read` (boolean, default false), `created_at`. Index on `thread_id` + `created_at` for fast thread fetch.

**Dependencies:** Feature 1 (Auth), Feature 4 (Listings), Feature 2 (User Profile).

**Best practice callouts:**
Reverb's messaging system is the gold standard for gear marketplaces — anchoring every conversation to a listing context eliminates the "what item are you asking about?" friction that kills eBay message threads. Nessi copies this pattern exactly. Depop's messaging has no listing context pin — conversations about multiple items in the same thread become genuinely confusing. Nessi prevents this by enforcing one-thread-per-listing.

**Do not build yet:** Real-time WebSocket messaging (Phase 2), photo attachments in messages (Phase 2), read receipts (seen indicators), typing indicators, group messages, direct messages not anchored to a listing.

---

### Feature 14 — Offers

**What it is:** An offer and counter-offer system embedded in the message thread. A buyer can propose a price lower than the listed price; the seller can accept, decline, or counter. This is how fishing gear actually transacts — Marcus knows a rod listed at $200 will sell for $160 if he asks.

**UI Pattern:** The offer flow lives inside the message thread (Feature 13). It is not a separate page or modal. At the top of the message input area on the buyer's side, a secondary button appears: "Make an Offer." Tapping it opens a bottom sheet on mobile (an inline expansion just above the input on desktop) with: a numeric price input pre-filled with 80% of the listing price, the Nessi fee breakdown for that offer amount, and "Send Offer" and "Cancel" buttons.

Offers appear in the thread as special message cards — visually distinct from plain text messages (a bordered card with the offer amount, expiry countdown, and action buttons). On the seller's side, the offer card shows "Accept," "Counter," and "Decline" — three buttons in a row. On the buyer's side, the offer card shows the current status and, if declined or expired, a "Make another offer" link.

Counter-offers follow the same bottom sheet pattern from the seller's side, pre-filled with a suggested counter (midpoint between the offer and listing price).

**Acceptance criteria:**

1. The "Make an Offer" button appears on any active listing's message thread, on the buyer's side, when the listing has `ships_from_state` set and `is_stripe_connected` is true on the seller's account.

2. The minimum offer is 70% of the listing price, rounded down to the nearest dollar. Entering a lower amount shows inline error: "Offers must be at least 70% of the asking price ($[minimum])." This is enforced client-side and server-side.

3. Submitting an offer creates an `offers` record and sends a push notification (email at MVP) to the seller: "[Buyer display_name] made an offer of $[amount] on your [listing title]. You have 24 hours to respond."

4. An offer expires 24 hours after creation. Expired offers are automatically set to status `expired` via a scheduled Supabase Edge Function or cron job. When an offer expires, the buyer receives an email: "Your offer on [listing title] expired. The listing is still available — make another offer or buy at the listed price."

5. The seller can accept, counter, or decline. Accepting creates a checkout session pre-filled at the offer price and sends the buyer a link: "Your offer was accepted. Complete your purchase within 4 hours." The listing is not reserved during these 4 hours (MVP behavior — reservation is a Phase 2 complication).

6. Countering creates a new offer in the thread from the seller's perspective with the counter amount. The counter follows all the same acceptance criteria.

7. Declining sends the buyer a notification: "Your offer was declined. The listing is still available."

8. A buyer can have only one active offer per listing at a time. Making a new offer while one is pending cancels the pending offer automatically.

9. Buyers must have a complete profile (avatar + bio + at least one species tag) to make an offer. If profile is incomplete, the "Make an Offer" button shows a tooltip: "Complete your profile to make offers — sellers want to know who they're dealing with."

**Data model notes:** `offers` table: `id` (UUID), `thread_id` (UUID, FK), `listing_id` (UUID, FK), `buyer_id` (UUID, FK), `seller_id` (UUID, FK), `amount_cents` (integer), `status` (enum: pending, accepted, declined, countered, expired, purchased), `expires_at` (timestamp), `created_at`.

**Dependencies:** Feature 13 (Messaging), Feature 10 (Checkout — accepted offers create pre-filled checkout sessions).

**Best practice callouts:**
Reverb's offer system uses a 48-hour expiry and allows sellers to initiate "price drop offers" to watchers from their dashboard — a powerful feature that converts passive interest into active transactions. Nessi should add seller-initiated offers in Phase 2. eBay's Best Offer system allows lowball offers down to $0.01 — the 70% floor on Nessi is intentional. Research from fishing community forums shows sellers find sub-70% offers insulting, which damages the trust relationship before any transaction begins.

**Do not build yet:** Seller-initiated price-drop offers to watchers (Phase 2), auto-accept rules ("automatically accept any offer above $X"), offer analytics for sellers.

---

### Feature 15 — Watchlist + Price Drop Alerts

**What it is:** A saved-listing system that lets buyers track gear they're interested in and receive notifications when the price drops. The watch count is visible to sellers as a demand signal — 12 watchers on a listing tells a seller their price is right; 0 watchers after two weeks tells them it's not.

**UI Pattern:** The heart/watch icon button overlays the top-right corner of every listing photo (on listing detail page and listing cards in browse grids). It is always visible — not hidden behind hover on desktop. On listing cards in the grid, the heart is in the top-right corner of the photo, 32×32px, with a semi-transparent dark background to ensure visibility against any photo color.

Tapping the heart on a listing card: optimistic UI (heart fills immediately), database write happens asynchronously. On the listing detail page: same behavior, plus a brief toast at the bottom: "Added to Watchlist — we'll tell you if the price drops."

The watchlist lives at `/account/watchlist` (or `/watchlist` with redirect from account). It is a standard listing grid showing the buyer's saved listings sorted by most recently watched. Each card in the watchlist shows the current price and, if the price dropped since the buyer watched, a "Price dropped from $X" badge in green beneath the price.

Saved searches ("Notify me when a Shimano Stradic CI4+ lists under $150") are deferred to Phase 2 — the infrastructure for email alerts built in this feature is the foundation.

**Acceptance criteria:**

1. The watch button is visible on every active listing card and listing detail page. For unauthenticated users, tapping it opens a login prompt (bottom sheet on mobile). For authenticated users, it toggles the watch state.

2. A buyer's watchlist at `/watchlist` is only accessible when logged in. It shows all actively watched listings (i.e., listings that are still active and not sold). Watched listings that have been sold show a "Sold" overlay on the card but remain in the watchlist for 7 days before being automatically removed.

3. When a seller reduces the price on a listing, all watchers receive an email notification within 15 minutes: "Price drop: [listing title] dropped from $[old] to $[new]. Buy now before it goes." The email includes a direct link to the listing and the "Buy Now" CTA.

4. Price drop emails are sent only for price reductions, not for price increases or other edits.

5. The seller's listing management (dashboard or edit view) shows the current watcher count per listing: "X people are watching this." The count updates within 5 minutes of a new watch action.

6. A buyer can remove a listing from their watchlist by tapping the heart again (toggle off). The listing disappears from `/watchlist` immediately (optimistic update).

7. A buyer can also remove a listing from the watchlist from the watchlist page itself — a three-dot menu on each card shows "Remove from Watchlist."

**Data model notes:** `watchers` table: `id` (UUID), `listing_id` (UUID, FK), `user_id` (UUID, FK), `watched_at` (timestamp). Unique constraint on `(listing_id, user_id)`. The `listings.watcher_count` is updated via a Postgres trigger on `watchers` insert/delete, or via an application-level increment/decrement — the trigger approach is more reliable. For price drop detection: store `last_notified_price_cents` on the `watchers` record — alerts fire when `listings.price_cents < watchers.last_notified_price_cents`.

**Dependencies:** Feature 1 (Auth), Feature 5 (Listings Browse — card component needs the heart icon), Feature 6 (Listings Edit — price changes trigger notifications).

**Best practice callouts:**
Reverb shows the watch count on each listing in the seller's dashboard with a "Price your gear right" tooltip linking to their pricing guide — turning watch data into seller behavior change. Nessi should surface the same signal. Vinted's heart icon is hidden on listing cards until hover on desktop, making it invisible to touch users — Nessi's always-visible heart solves this. Always-visible hearts also serve as social proof: seeing a heart on a card signals the item is desirable.

**Do not build yet:** Saved searches, "notify me when [specific item] lists," push notifications via PWA (Phase 2 after PWA setup), watchlist sorting and filtering.

---

### Feature 16 — Condition Grading UI

**What it is:** The fishing-specific condition framework applied as a guided UI component across the listing creation flow, listing detail pages, and search filters. The condition grade is what separates a trusted Nessi listing from an untrustworthy eBay listing where "used" could mean anything.

**The six tiers (exact copy — do not deviate):**

- **New (Unfished):** Never touched water. Original packaging, all parts, zero use. If it's been rigged and cast once, it's Excellent at best.

- **Excellent:** One or two sessions. No visible wear. Functions identically to new. Tip-top condition.

- **Very Good:** Regular light use. Minor cosmetic wear — light scratches on blank, slight cork compression at thumb position, minor line marks on spool. Functions perfectly.

- **Good:** Visible regular-use wear. May have minor repairs (replaced guide, re-spooled reel). All functional parts working as intended. Nothing that affects performance.

- **Fair:** Heavy use or storage wear. Functional but cosmetically rough. May have staining, handle wear, or minor functional quirks that are clearly disclosed. Price reflects condition.

- **For Parts / As-Is:** Does not fully function or has significant damage. Sold exactly as described. No returns accepted. Buyers know what they're getting.

**UI Pattern — Listing Creation (Step 2):** Condition is selected via a vertical radio list, not a dropdown. Each tier shows the tier name (bold) and a one-sentence summary beneath it. A "What does this mean for [category]?" expandable accordion below the list reveals fishing-specific photo guidance for the selected category (e.g., for Rods: "Photograph the cork grip at the thumb position, all guides including tip-top, the blank at mid-length, and the reel seat. Close-up of any scratches or wear."). This accordion is inline — not a new page, not a modal.

**UI Pattern — Listing Detail Page:** Condition appears as a color-coded badge (pill): New (Unfished) = forest green, Excellent = teal, Very Good = blue-gray, Good = amber, Fair = orange, For Parts = red. Tapping the badge on mobile, or hovering on desktop, opens a popover (not a modal) with the full tier description for the selected grade.

**UI Pattern — Search Filters:** Condition is a multi-select checkbox group in the filter rail/bottom sheet. All six tiers listed with their names. Counts next to each (number of active listings in that tier matching current search, updated live as other filters change).

**Acceptance criteria:**

1. Every listing has exactly one condition grade. The condition field is required — the wizard cannot advance past Step 2 without a selection.

2. Condition grades are stored as the enum values: `new_unfished`, `excellent`, `very_good`, `good`, `fair`, `for_parts`.

3. The condition badge on listing detail pages and listing cards uses the color scheme described above. Colors are accessible — each badge color achieves at minimum 4.5:1 contrast ratio with the white badge text in WCAG 2.1 AA.

4. The photo guidance accordion on Step 2 of the listing wizard changes content based on the category selected in the same step. For Rods: cork grip, guides, tip section, blank. For Reels: drag knob, bail, spool, body. For Lures (Hard Baits): all four sides, hooks, any paint chips. For Lures (Soft Plastics): full bag shot, individual lure close-up. For Flies: top-down with the hook gap visible, profile shot. For other categories: general "show any wear or damage" guidance.

5. The condition description popover on the listing detail page is dismissible by tapping outside (mobile) or moving the mouse away (desktop). It does not block any page content when open.

6. Search results can be filtered by one or more condition grades simultaneously. Selecting "Very Good" and "Excellent" returns listings in either tier.

**Dependencies:** Feature 4 (Listings Create — condition selection is part of the wizard), Feature 5 (Listings Browse — badge appears on listing cards), Feature 7 (Search — condition filter).

**Best practice callouts:**
Reverb's condition system (Mint, Excellent, Very Good, Good, Fair, Poor) is the direct reference — it is the only competitor with a standardized multi-tier condition framework, and it is widely credited as a key trust driver in the music gear market. Nessi's six-tier system adds the fishing-specific "New (Unfished)" distinction (critical for gear that may be in original packaging) and the "For Parts" tier (important for the collector and repair market that Kevin represents). eBay's condition system ("New," "Used") is so broad it is functionally meaningless for gear assessment. This is a structural trust advantage Nessi holds by default.

**Do not build yet:** AI-powered condition assessment from photos (Phase 2), buyer-reported condition disputes (dispute a condition grade after receiving the item — this is a moderation feature built after the review system is in place in Feature 19), condition history on seller profiles (average condition accuracy rating from buyers).

---

## Layer 5 — Shipping

---

### Feature 17 — EasyPost Integration

**What it is:** The shipping label generation system embedded in the seller dashboard. A seller who just sold a rod clicks "Print Shipping Label," selects a carrier and rate, and prints a pre-paid label — without leaving Nessi. This is the feature that makes selling fishing gear on Nessi meaningfully easier than eBay, where rod shipping is universally described as a nightmare.

**UI Pattern:** "Print Shipping Label" is a large, prominent button on the seller's order detail page in the dashboard. Tapping it opens a label generation flow — a bottom sheet on mobile, a modal on desktop (this is appropriate for modal: it's a quick 3-step action that doesn't need its own URL). The flow: Step 1 shows rates from USPS, UPS, and FedEx for the package dimensions entered at listing creation (pre-filled), with estimated delivery time and price for each. Step 2 is rate confirmation. Step 3 generates and displays the label as a PDF (opens in a new tab for printing) and returns to the order detail page with a "Label printed — mark as shipped" button.

A "Rod Shipping Guide" link appears on the label generation flow for listings in the Rods category. Tapping it opens a bottom sheet with specific guidance: rods under 7 feet (use a rod tube + standard box), rods over 7 feet (USPS Post Office-specific instructions, UPS long package surcharge warning), two-piece rods (separate transport vs. tube), and recommended box dimensions per rod type.

**Acceptance criteria:**

1. EasyPost API is integrated server-side (never expose API keys client-side). The integration supports USPS, UPS, and FedEx rate lookups.

2. For each paid order with package dimensions entered on the listing, three carrier rates are shown (or fewer if a carrier doesn't serve the route). Rates reflect the actual commercial EasyPost rates — not estimates.

3. The seller can select any rate. On confirmation, a shipment is created in EasyPost and a label is generated. The label URL is stored on the order record.

4. The label opens in a new browser tab as a PDF. It is formatted for a standard 4×6 inch shipping label (Dymo or similar thermal printer). It is also printable on standard 8.5×11 paper.

5. After printing, the order status updates to `shipped` and the tracking number is automatically populated on the order record. The buyer receives an email: "Your order has shipped. Tracking: [number]. Estimated delivery: [date]."

6. EasyPost tracking webhooks are received and update the order status in real time. When the carrier scans "Delivered," the order status updates to `delivered` and the buyer receives a delivery confirmation email.

7. If EasyPost returns an error (invalid address, unsupported package dimensions), the error is shown inline in the label generation flow in plain language: "We couldn't create a label for this address. Check that the buyer's address is correct, then try again."

8. The "Rod Shipping Guide" bottom sheet is shown for all listings in the Rods category regardless of condition or price.

9. Sellers who have not entered package dimensions on their listing see a prompt to add them before label generation: "Add package dimensions to get accurate rates." Tapping it opens an inline form on the order detail page.

**Integration notes:** EasyPost API key stored as a server-side environment variable. API calls are server-side only (Next.js API routes). Implement a retry with exponential backoff for EasyPost API calls (max 3 retries). Store the EasyPost `shipment_id` on the order record for webhook correlation.

**Dependencies:** Feature 11 (Order Management), Feature 4 (Listings Create — package dimensions captured at listing).

**Best practice callouts:**
Pirateship (a shipping platform popular with eBay sellers) achieves high seller loyalty entirely through simplified label generation and pre-negotiated carrier rates. The UX lesson from Pirateship: show the cheapest rate first, but always show all three carriers — sellers distrust platforms that hide options. Reverb's shipping label integration is the most-praised feature in seller reviews. eBay's label generation requires navigating to a separate "Seller Hub" page, breaking the order management workflow. Nessi's inline label generation within the order detail page — without navigation away — is the correct pattern.

**Do not build yet:** Shipping label markup (the $1-$3 fee per label that becomes a revenue stream — this is Phase 2 once volume justifies negotiated carrier rates), international shipping, return label generation, package pickup scheduling.

---

### Feature 18 — Shipping Calculator on Listings

**What it is:** A real-time shipping cost estimate on the listing detail page, triggered by the buyer entering their zip code. The #1 abandonment reason for used fishing gear purchases is uncertainty about shipping cost. Showing an estimate before checkout removes this blocker.

**UI Pattern:** Below the listing price on the listing detail page, a compact widget reads: "Estimate shipping to your zip: [zip code input] [Calculate]." The zip input is a 5-digit numeric field. Submitting shows: "Shipping to [zip]: USPS $X.XX · UPS $X.XX · FedEx $X.XX (estimated)." Results appear inline beneath the input — no modal, no new page, no full-page reload. The estimate is clearly labeled as an estimate: "Final shipping is calculated at checkout."

On mobile, the widget is positioned between the condition badge and the "Buy Now" sticky button — visible without scrolling for most listings.

If the seller selected "Free shipping" on the listing, the widget is replaced with a "Free shipping included" badge in green.

**Acceptance criteria:**

1. The shipping estimate widget appears on all active listings where `shipping_paid_by = 'buyer'` and the seller has entered package dimensions.

2. Entering a 5-digit zip and submitting triggers an EasyPost rate lookup (same API as Feature 17) using the listing's `ships_from_state`, package weight, and dimensions. The buyer's zip is the destination.

3. Results show up to three carrier rates. If fewer than three carriers serve the route, fewer are shown. If no carriers can be retrieved (network error, invalid zip), show: "Couldn't estimate shipping. Shipping will be calculated at checkout."

4. The estimate widget is accessible without authentication — no login required.

5. The buyer's entered zip is stored in `localStorage` and pre-filled on subsequent listing pages they visit in the same session (common shopping pattern: buyer checks shipping to their zip across multiple listings).

6. Listings with `shipping_paid_by = 'seller'` display "Free shipping" as a green badge. The estimate widget is not shown.

7. Listings where the seller has not entered package dimensions show: "Shipping: Contact seller for shipping quote" with a "Message Seller" link instead of the calculator widget.

**Dependencies:** Feature 5 (Listings Read — widget lives on listing detail page), Feature 17 (EasyPost — the rate API is shared).

**Do not build yet:** Shipping cost as a filter in search (requires indexing estimated costs, which requires a buyer zip — a Phase 2 personalization feature), carrier preference settings for buyers.

---

## Layer 6 — Reviews & Reputation

---

### Feature 19 — Seller Ratings + Reviews

**What it is:** The post-transaction rating system that builds seller reputation over time. This is what makes the fishing identity profile credible — not just who the seller says they are, but what buyers have confirmed about their condition accuracy, shipping speed, and communication.

**UI Pattern:** Review requests are triggered automatically 2 days after the order status transitions to `delivered`. The buyer receives an email with a review prompt — a single link that opens a focused review page (`/review/[order_id]`), not the order history or the listing. The review page is a single-screen experience: star rating (1-5, tap-to-select), three structured ratings (Condition as described / Shipping speed / Communication, each rated "Yes" or "No" — binary, not another star scale), and an optional text field ("Tell other buyers about this seller — what should they know?", max 500 characters). One "Submit Review" button. No account creation is required to leave a review via the emailed link — the review token in the URL authenticates the buyer for this specific action.

Reviews display on the seller's shop profile page and on each of their listing detail pages. The aggregate rating (calculated average of all star ratings) appears in the seller info strip on listing pages. Individual reviews are shown on the shop profile below the listings grid, sorted by most recent. Each review shows: star rating, buyer's display name (first name + last initial), date, and optional text. The three structured ratings (condition accuracy, shipping, communication) are aggregated into percentages shown as a compact stats block: "98% condition accuracy · 94% ships fast · 100% great communication."

**Acceptance criteria:**

1. A review request email is sent to the buyer 48 hours after the order `status` transitions to `delivered`. The email contains a single-use review link with a token valid for 30 days.

2. A buyer can submit exactly one review per order. Attempting to submit a second review with the same token returns an error page: "You've already reviewed this order."

3. The star rating (1-5) is required. The three structured ratings and text are optional. Submitting with only a star rating is valid.

4. Reviews are published immediately — no moderation hold at MVP. If a review contains reported profanity (basic client-side filter), it is held for manual review with a "Pending review" status and not shown publicly until approved.

5. The seller receives an email notification when a new review is published: "You have a new review from [buyer first name]." The email includes the star rating and text.

6. The seller's aggregate star rating on their shop profile is updated within 5 minutes of a new review being published.

7. Sellers cannot respond to reviews at MVP (response capability is Phase 2).

8. The `/review/[order_id]` page is accessible only via the token link. Navigating to it without a valid token shows a 404.

9. The aggregate rating is shown as a numeric score (e.g., "4.8") and a star display (filled and half-filled stars as needed) on the seller shop profile and listing detail page seller info strip. Sellers with fewer than 3 reviews show "New seller" instead of a rating.

**Data model notes:** `reviews` table: `id` (UUID), `order_id` (UUID, FK, unique — one review per order), `listing_id` (UUID, FK), `reviewer_id` (UUID, FK to profiles, nullable — for guest buyers who review via token), `seller_id` (UUID, FK), `star_rating` (integer 1-5), `condition_accurate` (boolean, nullable), `ships_fast` (boolean, nullable), `good_communication` (boolean, nullable), `text` (text, nullable, max 500 chars), `status` (enum: published, pending_moderation), `token` (text, unique — the single-use review link token), `created_at`. Add `average_rating` and `review_count` as denormalized columns on `profiles` — recalculated on each new review insert to avoid a slow aggregate query on every listing page render.

**Dependencies:** Feature 11 (Order Management — reviews are triggered by order delivery), Feature 8 (Seller Shop Profile — reviews display here).

**Best practice callouts:**
Reverb's structured ratings (Value, Accuracy, Communication, Shipping Speed) provide more actionable signal than a single star rating — a seller can learn specifically that their shipping is slow even if buyers rate them 5 stars overall. Nessi's binary Yes/No structured ratings are a simplification that reduces review abandonment (more buyers complete a binary than a multi-scale rating). eBay's feedback system allows negative feedback as a separate concept from star ratings, which creates anxiety for both buyers and sellers; Nessi's simple star system without a distinct negative/positive frame produces more accurate averages.

**Do not build yet:** Buyer ratings (seller rates buyer — Phase 2), review disputes, review responses by sellers, review analytics for sellers, review incentives (discounts for leaving a review).

---

### Feature 20 — Fishing Identity Verification

**What it is:** The structured fishing identity layer that makes Nessi's trust infrastructure fishing-native rather than generic. A seller with species tags, a home region, and 12 years of fishing experience is legible to another angler in a way that star ratings alone cannot convey. This is Nessi's structural trust advantage over eBay.

**What it is not:** Formal credential verification. At MVP, all fishing identity is self-reported. There is no license check, no tournament registration link. The value is in the structure and visibility of the data — not its verifiability. Verifiability is a Phase 2 trust layer.

**UI Pattern:** Fishing identity fields are part of the user profile (set up in Feature 2's onboarding). This feature is the display and usage layer: how those tags appear on listing cards, seller profiles, and in search. Fishing identity tags appear as small pills on the seller info strip of every listing detail page: "[Bass] [Spinning] [Tennessee]" — species, technique, state. These are not links at MVP (clicking them would ideally filter to similar sellers, but that requires search infrastructure that doesn't exist yet).

On the seller shop profile, fishing identity is displayed more prominently: a dedicated "About this angler" section above the listings grid with all tags, bio, and a "Fishing for X years" display.

The structured search filter for species (introduced in Feature 7 as a deferred UI element) becomes functional in this feature. Listings gain a `target_species` field (multi-select array of the same species enum from the profile) that sellers fill in on the listing form.

**Acceptance criteria:**

1. The listing creation wizard (Feature 4) adds a "Target species" optional multi-select field on Step 3 (Details). The same species enum from the user profile is used. Sellers select which species this gear is suited for. This field is optional at MVP — it can be left empty.

2. Listings with `target_species` populated appear in species-filtered search results (Feature 7's species filter now returns real results).

3. Fishing identity tags (species, technique, home state) appear on the seller info strip on listing detail pages. If a seller has not set any tags, the seller info strip shows only their display name and rating.

4. The seller shop profile's "About this angler" section shows: all species tags, all technique tags, home state, years fishing (if set), and bio. If none of these are set, the section shows: "This seller hasn't added their fishing profile yet." with a "Learn more about this seller" message link (Feature 13).

5. Listing cards in browse grids do not show fishing identity tags (too much information at card scale). Tags appear only on listing detail and seller profile pages.

**Dependencies:** Feature 2 (User Profile — tags are set here), Feature 4 (Listings Create — target_species field added), Feature 7 (Search — species filter becomes functional).

**Do not build yet:** Fishing license verification, tournament history linking (Bassmaster/FLW registration API), "Verified Angler" badge, community endorsements ("5 anglers vouch for this seller's muskie expertise").

---

## Layer 7 — Discovery & AI

---

### Feature 21 — Homepage Curation

**What it is:** The public homepage at `/` that serves as Nessi's front door for new visitors and a personalized re-entry point for returning buyers. It must communicate what Nessi is, show real inventory, and funnel users toward their first transaction — all without being an overwhelming product catalog.

**UI Pattern:** The homepage is not a traditional hero-section-plus-grid marketing page. It is a shopping surface with an editorial voice. Sections from top to bottom on mobile:

1. **Search bar** — full-width, auto-focused on page load for returning users (not for first-time visitors, where auto-focus is disorienting). Placeholder: "What are you fishing for?" — not "Search listings."

2. **Category tiles** — a horizontal scroll strip of 6 category tiles (Rods, Reels, Lures, Flies, Tackle, Custom/Handmade), each with an icon and label. Tappable, navigates to category browse.

3. **"Recently Listed"** — a horizontal scroll strip of 8 listing cards. Sorted by most recently published. This section requires real inventory — if fewer than 4 listings exist, hide the section entirely.

4. **"Maker Spotlight"** — a single featured maker card: their shop banner (or cover photo of their most recent listing), display name, species tags, and an "Explore their work" button. The featured maker rotates weekly. At MVP, this is manually curated (a simple config in the codebase). If no makers are designated, hide the section.

5. **AI Search CTA** — a distinct card section: forest green background, headline "Describe your fishing situation," a brief one-sentence explanation ("Tell us where you fish, what you target, and what time of year — we'll match the gear."), and an "Try AI Search →" button. This section markets the Feature 22 experience before it exists for non-logged-in users and serves as a re-entry point once it exists.

6. **"Recently Sold"** — 4 listing cards with "SOLD" overlays, showing what the market is actually transacting. This social proof is a Reverb-proven conversion driver: seeing that similar gear sells convinces hesitant sellers to list and hesitant buyers that the platform is active.

For logged-in users: insert a "Picked for you" section between "Recently Listed" and "Maker Spotlight" — 4 listings filtered by the user's species and technique tags. If the user has no tags or fewer than 4 matching listings, this section is hidden (never show an empty "Picked for you" section).

**Acceptance criteria:**

1. The homepage renders in under 2 seconds on a 4G connection (Lighthouse performance score ≥ 80). Listing images use Next.js Image component with lazy loading and WebP format.

2. The homepage is server-side rendered with a 60-second ISR (Incremental Static Regeneration) cache. Fresh inventory appears within 60 seconds of publication.

3. All horizontal scroll strips use native CSS `overflow-x: scroll` with `-webkit-overflow-scrolling: touch` for momentum scrolling on iOS. Scroll snap is enabled (`scroll-snap-type: x mandatory`). No JavaScript carousel library.

4. The homepage is fully accessible with keyboard navigation and screen readers. All listing cards have descriptive `alt` text on images. All interactive elements are reachable via Tab.

5. If the platform has fewer than 8 total active listings, the "Recently Listed" strip shows all available listings. If fewer than 4, the section is hidden and replaced with: "New listings coming soon — be the first to sell your gear. [Start a listing]."

6. The "Recently Sold" section shows the 4 most recently sold listings (status: `sold`). If fewer than 4 sold listings exist, hide the section.

**Dependencies:** Feature 4-5 (Listings — needs real inventory), Feature 8 (Seller Shop Profile — maker spotlight links here), Feature 22 (AI Search — AI CTA section is a placeholder until this feature is built).

**Best practice callouts:**
Reverb's homepage is organized around "what's happening right now" — recently listed, recently sold, trending categories — which creates a sense of a live, active marketplace. This is more compelling than a static hero section. Etsy's homepage is heavily personalized to the logged-in user — effective when you have behavioral data, but hollow for new visitors. Nessi's homepage works for both audiences by serving static curated sections to new visitors and overlaying personalized sections for returning logged-in users.

**Do not build yet:** "Trending searches" section (requires search volume data), personalized email digests ("New listings matching your interests"), homepage A/B testing, seasonal promotional banners.

---

### Feature 22 — AI Scenario Search

**What it is:** Nessi's flagship differentiating feature. A buyer describes their fishing situation in plain language — "I'm fishing from a kayak in January in East Texas targeting largemouth bass in cold clear water" — and Nessi returns a ranked list of products suited for that specific scenario, with a one-sentence explanation for each recommendation. No other fishing platform does this. It is the reason a buyer bookmarks Nessi instead of Google.

**UI Pattern:** AI Search lives at `/search/ai` and is also accessible from the homepage CTA and a "Search by scenario" tab on the standard search results page. The interface is a single large text area (full-width, minimum 100px tall on mobile, expanding up to 250px as the user types) with a placeholder: "Describe where you're fishing and what you're after. The more detail, the better. Example: 'Fishing from the bank in January, East Texas, targeting largemouth bass in cold clear water.'" A "Find gear" button submits the query.

Results appear below the input (the input stays visible at the top — do not navigate to a separate results page). Each result is a listing card with an additional element: a brief AI-generated reasoning line beneath the listing title: "Recommended because: cold-water lure in a natural shad color pattern for low-activity winter bass." The reasoning is 1 sentence, plain language, no jargon the angler didn't use themselves. The matched listings use standard listing cards from Feature 5 — no new card design.

A "Refine" button beneath the results allows the buyer to edit their scenario and re-run without clearing the input.

**Acceptance criteria:**

1. The AI scenario search is accessible at `/search/ai`. It requires no authentication to use.

2. The user's plain language input is sent to an LLM (OpenAI GPT-4o or equivalent) via a Next.js API route. The prompt instructs the model to: parse the scenario into structured attributes (location, season, species, technique, water conditions), generate a ranked list of fishing gear categories and characteristics suited for those conditions, and return a structured JSON response.

3. The structured JSON response is used to query the Nessi listings database using the extracted attributes as filters: species match (from `target_species` field on listings), category relevance, and any condition or price signals derived from the scenario.

4. If insufficient listings match the structured query exactly, the query is relaxed (category-only, then no filter) and results are returned with a note: "We matched these by category — more precise gear will appear as more sellers list."

5. Each returned listing is accompanied by a one-sentence recommendation reason generated by the LLM, grounded in the user's scenario. The reason is generated server-side (not client-side) and cached per listing for 24 hours.

6. The AI search response (from LLM call to results displayed) completes within 5 seconds on a standard connection. A skeleton loading state appears immediately after form submission while results load. If the response exceeds 8 seconds, a timeout error is shown: "Taking longer than expected. Try again or use regular search."

7. An empty scenario (fewer than 20 characters) shows an inline error: "Tell us a bit more — where are you fishing and what are you targeting?"

8. The scenario input and results are not stored in the database at MVP. Analytics on queries (anonymized scenario text + result click-through) are stored for future model improvement.

9. The "Find gear" button is disabled during loading (prevents double-submit). It re-enables after results render or error state appears.

10. AI Search results link to standard listing detail pages (Feature 5) — no special AI-search-specific listing view.

**Integration notes:** LLM API key (OpenAI) stored server-side only. Implement a rate limit on the AI search endpoint: 10 requests per user session per hour (tracked via a session cookie). Rate limit exceeded state: "You've used a lot of AI searches recently. Try again in an hour, or use regular search." Cost management: use GPT-4o-mini for the structured extraction pass and GPT-4o for the recommendation reasoning — this reduces API cost per query by approximately 80%.

**Dependencies:** Feature 7 (Search — listing query infrastructure is reused), Feature 20 (Fishing Identity — `target_species` on listings is required for relevant matching), Feature 21 (Homepage — AI Search CTA drives traffic here).

**Best practice callouts:**
Airbnb's natural language search ("I want a cozy cabin in the mountains for a family of 4 in January") is the best UX reference for scenario-to-results mapping in a marketplace. The key design insight from Airbnb: keep the input visible while results are shown, and make refinement the primary next action (not "start over"). Nessi follows this with the persistent input and "Refine" button. The risk with AI search is returning results that don't match the intent and making the buyer feel the feature is unreliable — mitigate this with the fallback messaging ("We matched these by category") rather than pretending a weak match is a strong recommendation.

**Do not build yet:** Conversational AI (multi-turn "what if I'm targeting bigger fish?"), saved AI searches, AI-powered pricing recommendations for sellers, AI condition assessment from photos.

---

### Feature 23 — Maker Directory

**What it is:** A curated, browsable directory of Nessi's custom gear makers — lure builders, fly tiers, rod builders, and small-batch artisans. This is Leo's home on the internet. It is also Nessi's most defensible content moat: a directory of 200 active makers, each with a profile and active listings, cannot be replicated by eBay or built overnight by a competitor.

**UI Pattern:** The Maker Directory lives at `/makers`. The browse experience on mobile is a 2-column card grid. Each maker card is taller than a listing card — it shows the maker's shop banner (or their cover photo), display name, primary species they make for, home state, a 1-line bio excerpt, and an active listing count ("12 active listings"). Tapping a maker card navigates to their shop profile (Feature 8).

Filter controls (accessible via a bottom sheet on mobile, left rail on desktop): Species (multi-select), Technique/Style (multi-select: crankbaits, soft plastics, flies, rod building, etc. — distinct from the general technique tags), State, Ships to (at MVP: all ship within US — this filter is a placeholder). Sort options: Most Active (listing count), Most Recently Listed, Newest Members.

A "Are you a maker?" CTA appears at the bottom of the directory — a banner with "List your handmade gear. 6% fee, no algorithm to beat, an audience that actually fishes." and a "Start selling" button.

**Acceptance criteria:**

1. The Maker Directory at `/makers` shows all sellers who have at least one active listing in the `custom_handmade` category. No manual curation is required to appear — listing a custom item makes a seller eligible for the directory.

2. Makers are shown in the directory sorted by most recently active (most recent listing published) by default.

3. Each maker card shows: shop banner (custom if set, default fishing-themed placeholder if not), display name, species tags, home state, bio excerpt (first 80 characters), and active listing count.

4. The species and state filters update results without a page reload (URL parameters, Next.js client navigation).

5. A seller can appear in the Maker Directory without any profile customization — bare minimum is one active listing in the custom/handmade category. Sellers with a complete profile (avatar, bio, species tags) are shown with a "Full profile" visual indicator (small checkmark or completed badge on the card) to encourage profile completion.

6. The "Are you a maker?" CTA is shown to all users including logged-in sellers, but links to the listing creation wizard (Feature 4) for logged-in sellers and to the registration page (Feature 1) for unauthenticated users.

7. The Maker Directory page is server-side rendered with 5-minute ISR cache. Title tag: "Custom Fishing Gear Makers | Nessi." Meta description: "Find handmade lures, custom flies, and artisan fishing gear from independent makers. Browse [count] makers on Nessi."

**Dependencies:** Feature 4 (Listings — makers are sellers with custom/handmade listings), Feature 8 (Seller Shop Profile — maker cards link here), Feature 20 (Fishing Identity — species tags filter).

**Best practice callouts:**
Etsy's "Shop" directory buries small makers beneath larger shops that have gamed SEO — a maker with 3 beautiful listings is invisible next to a shop with 300 generic items. Nessi's directory default sort (most recently active) gives new makers immediate visibility on listing, which is a direct recruitment incentive. Reverb's "Shops" directory is genre-filtered — the fishing equivalent (species-filtered makers) is the right adaptation.

**Do not build yet:** Commission request forms ("DM this maker for a custom order"), maker verification or featured placement (editorial picks), maker analytics (views, clicks from directory), maker newsletter or community digest.

---

## Layer 8 — Seller Dashboard

_These features require real transaction data to be meaningful. Build the shells early for UI consistency, but populate them with real data only after Layer 3 is complete and real sales are occurring._

---

### Feature 24 — Dashboard: Analytics

**What it is:** The seller-facing analytics view that turns transaction data into actionable insights — which listings are getting views, which are getting watched, what's sold, what's earning. This is what keeps Danny coming back to Nessi instead of eBay: a dashboard that tells him his $200 rod has 8 watchers and no offers, suggesting he price it at $175.

**UI Pattern:** The analytics tab at `/dashboard/analytics` is a single scrollable page on mobile, not a tabbed sub-navigation. Sections:

1. **Overview stats bar** (4 metrics, horizontal scroll on mobile): Total Revenue (all time), Listings Live, Total Views (30 days), Watchers Active.

2. **Revenue chart** — a simple line chart (30 days, daily revenue) or bar chart (by month if more than 3 months of history). Uses a minimal axis, no grid lines, no legend. Shows $0 bars/points on days with no revenue — do not hide zero days.

3. **Listing performance table** — each active listing as a row: thumbnail, title, views (30 days), watchers, days listed, price. Sortable by any column. On mobile, a horizontal scroll table (fixed listing column, scrollable data columns). An "Adjust price" quick-action link on each row opens the quick-edit price bottom sheet (from Feature 6).

4. **Recent sales** — a simple list of the last 10 completed transactions: item, sale price, fee, net received, date. Links to the order detail page.

**Acceptance criteria:**

1. The analytics dashboard at `/dashboard/analytics` is accessible only to authenticated sellers (`is_seller = true` on their profile, set when Stripe Connect is completed).

2. All metrics are calculated from real transaction and listing data — no synthetic or placeholder data is shown. If a seller has no sales yet, each metric shows "0" or "$0.00" with an empty state message beneath the chart/table: "No data yet — your stats will appear here after your first sale."

3. The overview stats bar's four metrics update within 5 minutes of a new transaction completing or a new listing going live.

4. The revenue chart defaults to the last 30 days. A date range selector (7 days, 30 days, 90 days, All time) appears above the chart. Changing the range rerenders the chart without a page reload.

5. The listing performance table is sortable by Views (default, descending), Watchers, Days Listed, and Price. Tapping a column header toggles between ascending and descending.

6. "Adjust price" quick-edit from the listing performance table opens a bottom sheet with: current price, a new price input with the live fee calculator, and "Save." Saving updates the listing price and, if watchers exist, triggers price drop notifications (Feature 15).

7. The analytics page is not indexed by search engines (`noindex` meta tag).

**Dependencies:** Feature 11 (Orders — revenue data), Feature 5 (Listings Browse — view count), Feature 15 (Watchlist — watcher count), Feature 9 (Stripe Connect — gates access to analytics).

**Best practice callouts:**
Reverb's seller dashboard analytics are the best-designed in the used gear category: the "listing performance" table with views + watchers + days-listed in one view gives sellers the exact signal they need to decide whether to relist, reduce price, or deactivate. eBay's seller analytics require a separate Seller Hub login and are buried in multiple tabs — sellers report rarely using them. Nessi's single-page dashboard with the most important metrics in one view (no navigation required) solves this.

**Do not build yet:** Traffic source analytics (where buyers found the listing — requires UTM tracking, Phase 2), conversion funnel analytics (views → watches → purchases), email digest of weekly stats, benchmark comparisons ("Your listings average 3x more views than similar sellers").

---

### Feature 25 — Dashboard: Bulk Tools

**What it is:** Power-seller tools for managing multiple listings efficiently. These tools are built in response to real seller behavior — Danny has 15 listings and wants to run a weekend sale. Jen has inherited 40 pieces of gear and wants to list them without doing 40 individual wizards.

**These tools require real sellers with real inventory to design correctly. Build them only after at least 20 active sellers have been on the platform for 30 days and have expressed specific needs. Do not build from assumption.**

**UI Pattern:** Bulk tools live at `/dashboard/listings` — the listings management tab. Checkboxes appear on each listing row when the seller enters "Manage" mode (a toggle in the top-right of the tab). Selecting multiple listings reveals a bulk action toolbar at the bottom of the screen (a sticky bottom bar on mobile): "Edit price," "Deactivate," "Mark as Sold," "Delete." Each bulk action opens a confirmation bottom sheet showing the count of affected listings and the specific action.

**Acceptance criteria:**

1. The "Manage" mode toggle is accessible from the listings tab in the seller dashboard.

2. In Manage mode, each listing row has a checkbox. A "Select all" checkbox selects all listings on the current page (not all listings if paginated).

3. "Edit price" in bulk mode opens a bottom sheet with: "Reduce price by [X]%" (percentage input) or "Set all selected to $[price]." Both options preview the resulting prices before applying. Applying fires price drop notifications to any watchers on affected listings.

4. "Deactivate" bulk action sets all selected listings to `deactivated` status. A confirmation: "Deactivate [X] listings? They'll be hidden from buyers but saved in your dashboard." with "Deactivate" and "Cancel."

5. "Delete" bulk action requires a second confirmation: "Permanently delete [X] listings? This can't be undone." with "Delete" in red and "Cancel."

6. After any bulk action completes, a toast confirms: "[X] listings updated."

7. Bulk actions on more than 50 listings at once are blocked with: "Select fewer than 50 listings at a time." This prevents performance issues and accidental mass-changes.

**Dependencies:** Feature 4-6 (Listings CRUD), Feature 15 (Watchlist — price edits trigger notifications), Feature 11 (Orders — "Mark as Sold" writes an order record).

**Best practice callouts:**
eBay's bulk listing editor is a desktop-only experience that has not been updated in years — mobile sellers have no bulk tool access. Nessi's mobile-first bulk tools (the sticky bottom action bar on mobile) are a direct response to this gap. Poshmark's "Closet Clear Out" feature (discount all unwatched listings by 10% with one tap) is the best single bulk tool in C2C commerce — a Nessi equivalent ("Weekend Sale: reduce all listings by [X]%") should be the first bulk tool shipped.

**Do not build yet:** CSV import for bulk listing creation (requires a significant listing validation layer), listing template library (duplicate a past listing as a starting point), automated repricing rules ("reduce price by 5% every 7 days if no watchers").

---

## Appendix A — UX Pattern Reference

This appendix applies platform-wide. Any feature not covered above should default to these patterns.

**Modal:** Use for quick confirmation actions with fewer than 3 inputs that do not benefit from a URL (confirm delete, confirm logout, share sheet, report action). Maximum 2 CTA buttons. Always closeable by clicking outside or pressing Escape. Never auto-open — always require a user action.

**Bottom Sheet (mobile):** Use for any action where the user benefits from seeing the content behind it (offers, watchlist toggle, filter selection, label generation, photo guidance). Maximum 6 options or 4 input fields. A drag handle at the top indicates dismissibility. Closes on swipe-down or tap-outside.

**Full Page:** Use for any flow with more than 3 steps, any flow with photo upload, any flow with a real-money action (checkout, Stripe Connect), and any content that should be shareable or bookmarkable. Always has a URL.

**Inline Expansion (Accordion):** Use for explanatory content that the user may or may not need: condition grade explanations, fee breakdowns, packaging guidance, FAQ content. Never navigate away from the current page for informational content.

**Toast:** Use for transient confirmations of single actions: "Saved," "Added to Watchlist," "Copied link," "Label printed." Duration: 2.5 seconds. Position: bottom of screen on mobile, bottom-right on desktop. One toast visible at a time — queue if multiple fire.

**Skeleton Screen:** Use for any list, grid, or data table that loads asynchronously. Skeleton matches the layout of the content it replaces — not a generic gray rectangle. Use for: listing grids, search results, order history, dashboard tables, message inbox.

**Optimistic UI:** Use for toggle actions where the outcome is nearly certain and a failure would be visible immediately: watchlist heart toggle, read/unread state, offer accept/decline. Revert to previous state and show an error toast on failure.

---

## Appendix B — Error Message Standards

All error messages follow this format: plain language (no technical codes), specific (identify the problem, not just "something went wrong"), and actionable (tell the user what to do next).

| Scenario                    | ❌ Don't say                  | ✅ Say                                                                              |
| --------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Invalid login credentials   | "Invalid credentials"         | "Incorrect password. Try again or reset your password."                             |
| Non-existent email at login | "User not found"              | "We couldn't find an account with that email. Did you mean to sign up?"             |
| Card payment failed         | "card_declined"               | "Your card was declined. Try a different card or contact your bank."                |
| Network timeout             | "Error 504"                   | "That took too long. Check your connection and try again."                          |
| Image upload failed         | "Upload error"                | "That photo didn't upload. Try again — if it keeps failing, try a different photo." |
| Offer below floor           | "Invalid offer amount"        | "Offers must be at least 70% of the asking price ($[minimum])."                     |
| Duplicate display name      | "Unique constraint violation" | "That name is already taken. Try adding your state or a number."                    |

---

_This document is the build specification. It supersedes all previous feature documentation. Update it when UX decisions change — do not let it drift from the actual build._
