# Component Extraction -- Nessi Design System v2.0

Source: `https://0m34aamgen-7200.hosted.obvious.ai/design-system.html`
Extracted: 2026-03-23

---

## Navigation

### Navigation System
- **Atomic level:** Organism
- **Description:** Three persistent navigation elements forming the app shell. Never hidden, never animated away.
- **Sub-components:**
  - **Top Nav (Home/Browse):** Parchment bg, full-width search pill (not inline-editable -- opens overlay on tap), 40px avatar circle (initials, green bg), 10px orange notification dot with 2px parchment ring
  - **Top Nav (Browse active):** Forest green bg, live-editable search, filter icon with 7px orange dot when filters applied
  - **Top Nav (Detail pages):** Parchment bg, back arrow (44x44px min), "Nessi" centered DM Sans Medium 16px, right icons (share + watchlist)
  - **Filter Chip Strip:** 36px height, sticky below top nav at z:150, horizontal scroll, no scrollbar. Active: `--c-orange` fill, Inactive: `--c-fill` bg + `--c-border` border
  - **Bottom Tab Bar:** Floating glass pill (`rgba(237,224,203,0.82)` + `backdrop-filter:blur(20px) saturate(1.4)`), 64px height, 5 slots: Home, Browse, Sell (FAB), Inbox, Saved
  - **Sell FAB:** 48px orange circle, +6px above baseline, `--shadow-sell`, scale(1.08) on hover
- **States:** Guest (no dots), Member with unread (8px orange dot on Inbox), active tab (green icon+label), inactive (text-2 color)
- **Tokens:** `--surface-nav`, `--surface-nav-pill`, `--height-nav-top` (56px), `--height-nav-bottom` (60px), `--z-nav-bottom` (300), `--min-touch-target` (44px)
- **Responsive:** Mobile only -- desktop nav is a different pattern (not defined in this DS version)
- **A11y:** All nav items 44x44px min tap target, `role="navigation"`, active tab indicated via `aria-current="page"`

---

## Atoms

### Buttons & Links
- **Atomic level:** Atom
- **Variants:** Primary (green), Ghost (outlined), Orange (accent/sell), Ghost Parchment (on dark surfaces), Danger (red), Ghost Danger, Ghost Orange, Text Links (primary green, orange accent, secondary muted, inline body copy, destructive)
- **Sizes:** Large (52px, `--height-btn-lg`), Medium (44px, `--height-btn-md`), Small (36px, `--height-btn-sm`), XS (28px, `--height-btn-xs`)
- **States:** Default, Hover (green-600/orange-600), Active (green-700/orange-700 + scale(0.98)), Focus (box-shadow ring, outline:none), Disabled (opacity:0.38, pointer-events:none), Loading (spinner replaces text, opacity:0.7, pointer-events:none), Success (green-success bg + checkmark)
- **Icon Buttons:** Square (44x44px default), always 44px min touch target even if visually smaller. Variants: filled, ghost bordered, circle subtle
- **Responsive:** Mobile: full-width stacked in purchase bar. Tablet: side-by-side 48px. Desktop: fixed-width, right-aligned
- **Tokens:** `--radius-400` (10px), `--font-family-sans`, `--font-weight-600`, `--shadow-focus-green`, `--shadow-focus-orange`, `--shadow-focus-error`, `--easing-out`, `--duration-100`
- **A11y:** `aria-busy` when loading, `aria-label` for icon-only buttons, `:focus-visible` ring

### Pills & Badges
- **Atomic level:** Atom
- **Sub-types:**
  - **Condition Badges:** New (green-500), Excellent (#2E6B5E), Very Good (#3D7A6C), Good (#5C7A4E), Fair (#B5955A), For Parts (maroon-500). Always 9px on photo overlay, 11px in condition section. Uppercase.
  - **Listing Status:** Active (success-bg/success-text), Pending Sale (warning-bg/warning-text), Sold (sand bg/text-2), Draft (fill bg/text-2). Dashboard only.
  - **SHOP Pill:** Orange fill, white text. lg on shop header, default on seller card, sm on product card seller line.
  - **Filter Chips:** Active (orange fill), Inactive (fill bg + border). Filter pills also have "x" for removal.
  - **Category Pills:** Active (green-500 fill, white text), Inactive (transparent bg, border, text color).
  - **Usage Tags:** fill bg + border, text-2 color. e.g., "FRESHWATER ONLY", "MAINTAINED"
  - **Member Badges:** Earned (green bg, white text), Locked (fill bg, border, 60% opacity). Tap opens tooltip.
- **Sizes:** pill-lg (11px, 5px 12px padding), default (9px, 3px 9px), pill-sm (8px, 2px 7px)
- **Tokens:** `--radius-800` (999px pill), font 9px/11px DM Sans Medium, uppercase, letter-spacing 0.05em

### Form Elements
- **Atomic level:** Atom
- **Components:** Input, Textarea, Select, Checkbox, Radio, Toggle
- **Input specs:** 48px height (`--height-input`), `--radius-400` (10px), 1px `--c-border`, `--c-fill` bg, 15px font
- **States:** Default, Hover (border darkens to #C0B3A0), Focus (green border + overlay bg + focus shadow), Success (success border + checkmark icon), Error (error border + error shadow + error message), Disabled (opacity:0.45, pointer-events:none), Read-only (fill bg, border, text-2)
- **Variants:** With prefix ($), With suffix (inches), Small input (40px, `--height-input-sm`)
- **Toggle:** 44x24px, pill radius, `--c-border` off bg, `--c-green` on bg, 18px white knob
- **Validation:** On blur, never on submit
- **Tokens:** `--height-input`, `--height-input-sm`, `--surface-overlay`, `--shadow-focus-green`, `--shadow-focus-error`
- **A11y:** `aria-required`, `aria-describedby` for errors, `aria-invalid` on error, proper `autocomplete`

### Dividers
- **Atomic level:** Atom
- **Variants:**
  - Horizontal rule: 1px solid `--color-sand-400`
  - Section separator with label: two rules flanking centered uppercase text (11px medium, `--color-neutral-500`, 0.06em letter-spacing)
  - Vertical divider: 1px wide, `--color-sand-400`, used in stat rows (32px height)

### Tooltips
- **Atomic level:** Atom
- **Specs:** Dark fill (`--color-neutral-900`), white text, 11px DM Sans Medium, max-width 220px, 6px 10px padding, `--radius-200` (6px). Arrow: 5px CSS border triangle.
- **Trigger:** Hover on desktop, tap on mobile
- **Placement:** Above by default (with bottom arrow)
- **Max content:** 80 characters
- **Use cases:** Condition grade explanations, fee breakdowns, badge meanings

### Date & Time Display
- **Atomic level:** Atom
- **Variants:**
  - Relative: "Listed 2 hours ago", "Listed 3 days ago" (clock icon, 13px regular, neutral-600)
  - Absolute: "Sold March 14, 2026", "Member since 2023" (calendar icon)
  - Response time: "Responds in < 2 hrs" (clock icon)
  - Urgent countdown: "Offer expires in 4 hrs" (clock icon, error-500 color + medium weight)
- **Tokens:** `--color-neutral-600` default, `--color-error-500` for urgent

### Location Chip
- **Atomic level:** Atom
- **Variants:**
  - Inline text: map pin icon + "Ships from Tennessee" (12px regular, neutral-600)
  - Pill: map pin + "Tennessee, USA" in sand-200 bg, sand-400 border, pill radius
  - Local pickup: filled green map pin + "Local pickup -- Nashville, TN" (green-500 color)

---

## Molecules

### Avatars
- **Atomic level:** Molecule
- **Sizes:** lg (48px, 18px font), md (40px, 15px font), sm (32px, 12px font), xs (24px, 9px font)
- **Variants:** Green gradient, Orange gradient, Maroon gradient, Photo (with fallback to initials)
- **Shop ring:** 2px `--c-orange` border on all shop owner avatars
- **Gradient:** Deterministic per user (never random on re-render), `linear-gradient(135deg, ...)`
- **Tokens:** `--radius-circle` (50%)

### Rating Display
- **Atomic level:** Molecule
- **Sub-components:**
  - **Star Row:** Filled stars in `--c-orange`, empty in `--c-border`, 16px size, 2px gap. Followed by "4.9 (124)" in 13px text-2.
  - **Rating Breakdown Bar:** 5 rows (5 to 1), label (12px, 16px wide), track (6px tall, fill bg, pill radius), fill bar (orange, pill radius), count (12px, 24px wide)
- **Rules:** Never show rating for fewer than 3 completed transactions. No data: italic "New seller -- no reviews yet"

### Product Cards
- **Atomic level:** Molecule
- **Anatomy:** Photo (1:1 square, 8px radius, dark letterbox bg) + Condition badge (absolute bottom-left) + Watch icon (frosted glass circle, absolute top-right, 30px) + Price (14px SemiBold `--c-orange`) + Title (13px Regular, max 2 lines via `-webkit-line-clamp:2`) + Seller line (11px `--c-text-2`, SHOP pill inline)
- **States:** Default, Hover (scale(1.025) + opacity:0.92), Active (scale(0.98)), Watched (watch icon: `rgba(226,119,57,0.85)` bg)
- **No buy button** -- whole card is tap target
- **Tokens:** `--radius-300` (8px), `--easing-out`, transition 180ms

### Seller Card
- **Atomic level:** Molecule
- **Variants:** Individual member, Shop account (2px orange avatar ring + SHOP pill)
- **Anatomy:** White surface (`--surface-raised`), 10px radius, 1px border, 16px padding. Top: Avatar (lg) + Name + Rating line + Message button (28px xs green). Stats row: `--c-fill` bg, 2-column grid (Response time, Joined/Ships In). Trust row: green checkmark badges
- **Message button:** 28px height, 12px font, green bg

### Condition Grading (Condition Track)
- **Atomic level:** Molecule
- **Description:** 6-tier visual track. Left = worst, right = best. Interactive in creation flow, expanded on listing detail.
- **Tiers:** Fair, Good, Very Good, Excellent, Mint, New (Unfished)
- **Dot states:** Past (orange filled), Current (18px green with checkmark), Future (border only)
- **Track:** 2px line, filled portion in orange, unfilled in `--c-border`. Animated on selection (300ms ease-out).

### Tabs & Accordion
- **Atomic level:** Molecule
- **Tabs:** Bottom border 2px `--c-border`. Active: green text + 2px green bottom border + SemiBold. Inactive: text-2, Medium weight. Count in parentheses.
- **Accordion:** Border-bottom per item. Header: 15px SemiBold, chevron rotates 180deg when open. Body: 14px text-2, line-height 1.65. Specs start expanded on listing detail.

### Price Display & Specs
- **Atomic level:** Molecule
- **Price variants:** Standard ($140 + "or offer"), Below average signal (green "below avg resale"), Price drop (strikethrough old + red new + % badge)
- **Price rules:** Main listing price always `--c-text`. Card price always `--c-orange`. Watcher count: orange heart + orange uppercase text.
- **Fee Calculator:** White surface, border, 20px padding. Rows: listing price, fee, divider, net payout (success green, 20px bold). Info banner about shop discount.
- **Spec Table:** Key (10px SemiBold uppercase text-2), Value (14px Medium text), 1px fill divider. Never show empty rows.

### Messaging
- **Atomic level:** Molecule
- **Thread layout:** Column of message bubbles, 12px gap, 16px padding, fill bg
- **Received:** White bg (`--surface-raised`), radius: md md md 4px. Avatar (sm) left-aligned.
- **Sent:** Green bg, white text, radius: md md 4px md. Avatar right-aligned.
- **Offer Bubble:** White bg, 1.5px orange border, md radius. Offer label (10px bold uppercase orange), amount (24px bold), note (12px text-2), expiry. Actions: Accept (primary sm), Counter (ghost sm), Decline (ghost-danger sm "x").
- **Offer expiry:** 24 hours

### Watchlist Toggle
- **Atomic level:** Molecule
- **States:** Unsaved (outlined heart, neutral-500 stroke), Saved (filled heart, orange-500 fill+stroke), On photo unsaved (frosted glass circle 32px, white stroke), On photo saved (frosted glass, orange fill), Watcher count badge (pill with filled orange heart + "12 watching" in orange semibold)
- **Behavior:** Optimistic UI -- state flips instantly, error reverts silently.
- **A11y:** `aria-pressed` toggle state, `aria-label="Save to watchlist"` / `aria-label="Remove from watchlist"`

### Search Input
- **Atomic level:** Molecule
- **States:** In nav (green bg, placeholder text), Expanded with suggestions (white surface, shadow-400, search icon, clear X). Sections: Recent (clock icon, 14px text), Suggestions (green search icon, 14px text, category label right-aligned)

### Filter Panel
- **Atomic level:** Molecule
- **Layout:** Mobile: bottom sheet. Desktop: sidebar drawer 280px.
- **Filter types:** Price range (dual input + slider), Condition checkboxes (with count), Shipping toggle, Apply/Clear footer
- **Footer:** Clear All (ghost 1fr) + Show N Results (primary 2fr)

### Page Header
- **Atomic level:** Molecule
- **Variants:** A (back only), B (back + title + share + watchlist -- listing detail), C (back + section title + action -- settings)
- **Height:** 56px, parchment bg
- **Back button:** 44x44px touch target, chevron-left icon

### Stepper & Progress
- **Atomic level:** Molecule
- **Step indicator:** Completed (green circle + checkmark), Active (green circle + number + glow ring), Upcoming (bordered circle + grey number). Labels on desktop, numbers on mobile.
- **Progress bar:** 4px tall, sand-400 bg, green-500 fill, pill radius. Label: "Step N of M -- Name" + percentage.
- **Connecting lines:** 2px, green for completed, sand-400 for pending

### Inline Banner
- **Atomic level:** Molecule
- **Variants:** Warning (warning bg/border/text, triangle icon, action button), Error (error bg/border/text, circle-exclamation icon, action button), Info (info bg/border/text, info icon, no action), Success (success bg/border/text, checkmark icon, no action)
- **Not dismissible** unless action taken
- **Layout:** Icon (16px, flex-shrink:0) + Content (title 13px semibold + description 12px regular) + Optional action button

### Photo Upload
- **Atomic level:** Molecule
- **Grid:** 3-column, first slot spans 2x2 (cover photo)
- **States:** Empty primary (dashed green border, camera icon, "Add cover photo"), Uploaded (photo with X delete button), Uploading (spinner + "Uploading"), Error (error bg, exclamation icon, "Failed. Retry?"), Empty (dashed sand border, plus icon)
- **Rules:** Min 2, max 12. Drag to reorder. First photo is cover.

### Shipping Rate Card
- **Atomic level:** Molecule
- **Anatomy:** Carrier logo (40x28px, sand bg), carrier name (13px semibold), delivery estimate (11px text), price (15px bold)
- **States:** Selected (2px green border + checkmark circle), Unselected (1px sand border)
- **Free shipping:** Price shows "Free" in green text

### Order Timeline
- **Atomic level:** Molecule
- **Vertical stepper:** Completed steps (28px green circle + checkmark + green connecting line), Active step (28px orange circle + icon + glow), Pending steps (28px bordered circle + grey icon). Timestamps on each completed step.

### Category Tile
- **Atomic level:** Molecule
- **Specs:** 1:1 square, 8px radius, photo bg with gradient overlay (to top, black 0.65 to transparent), label centered at bottom (11px semibold uppercase white, 0.06em tracking)
- **Grid:** Mobile 2-col, desktop 4-col

### Pagination & Load More
- **Atomic level:** Molecule
- **Components:** Results counter ("Showing 24 of 284"), progress bar (3px, green fill), Load More button (ghost green), Loading spinner state
- **Behavior:** Auto-loads at 80% scroll depth. Manual fallback button.

### Quantity Stepper
- **Atomic level:** Molecule
- **Specs:** Bordered container with - / count / + buttons. Minimum always 1.
- **Sizes:** Default (44px buttons), Small, XS

### Notification Row
- **Atomic level:** Molecule
- **Anatomy:** Icon (colored bg circle) + Title (13px semibold) + Description (12px text-2) + Timestamp (11px text-2, right-aligned) + Unread dot (8px orange)
- **Types:** Sale, Offer received, Message, Price drop, Review

### Settings Row
- **Atomic level:** Molecule
- **Anatomy:** Icon (optional) + Label (14px medium) + Value/Toggle (right-aligned) + Chevron
- **Variants:** Toggle row, navigation row (with chevron), value display row

---

## Trust & Identity

### Fishing Identity Tag
- **Atomic level:** Molecule
- **Tag types:**
  - Species/technique: green bg (rgba 0.08), green border (rgba 0.2), green-700 text. e.g., "Bass", "Fly Fishing"
  - Location: orange bg (rgba 0.1), orange border (rgba 0.25), orange-600 text. e.g., "Tennessee"
  - Role/craft: sand-200 bg, sand-400 border, neutral-600 text. e.g., "Lure Maker"
- **Specs:** Pill radius (999px), 12px DM Sans Medium, 5px 10px padding

### Verification Badge
- **Atomic level:** Molecule
- **Badge set:** Trusted Seller (success green), Tournament Angler (green), Verified Maker (orange), Top Seller (maroon), Fly Tier (neutral), SHOP (neutral)
- **Specs:** Pill radius, 11px semibold, 6px 12px padding, icon + text. Tap opens tooltip explaining how badge was earned.

### Trust Stat Row
- **Atomic level:** Molecule
- **Anatomy:** Avatar + Name + Rating + Message button, then 3-stat row below (Response time, Joined/Member since, Sales count)
- **Layout:** Stats separated by 1px vertical divider, centered text, label 10px uppercase

### Offer UI
- **Atomic level:** Molecule
- **States:**
  - Pending: White bg, 1.5px orange border, amount (28px bold orange), strikethrough original, expiry, 3 buttons (Decline ghost, Counter ghost-green, Accept green)
  - Floor warning: Error bg, error border, warning icon + "Minimum offer is $98 (70% of asking)"
  - Accepted: Success bg, success border, "Offer Accepted -- $115" + "Proceed to checkout" + Checkout Now button
- **Rules:** 70% floor enforced client-side. 24-hour expiry.

---

## Dashboard

### KPI Stat Tile
- **Atomic level:** Molecule
- **Anatomy:** Label (11px uppercase neutral-500), Value (26px bold), Trend indicator (arrow + percentage + "this month/vs last")
- **Trend colors:** Up = success-500, Down = warning-500, Flat = neutral-400
- **Layout:** 2x2 grid on mobile, single row on desktop
- **Surface:** raised bg, 8px radius, shadow-200, 16px padding

### Listing Performance Row
- **Atomic level:** Molecule
- **Anatomy:** Thumbnail (52px square, 6px radius), Title (13px semibold, truncated), Metrics (views, watching, age), Price (14px bold), Status pill
- **States:** Active (full opacity), Sold (60% opacity), Draft (full opacity with draft pill)
- **Mobile:** Swipe left to reveal edit/delete actions

### Quick Action Card
- **Atomic level:** Molecule
- **Anatomy:** Icon (40px circle, semantic color bg), Label (14px medium), Optional count badge (20px orange circle), Optional value text, Chevron
- **Actions:** Create Listing, View Orders (with count), Check Payouts (with amount)

### Sparkline
- **Atomic level:** Molecule
- **Specs:** Pure CSS + SVG polyline, 120x32 viewBox. Green stroke for uptrend, fill area rgba 0.08. No chart library.
- **Context:** Inside KPI tile with label, value, and trend text below

### Shop Upgrade Prompt
- **Atomic level:** Molecule
- **Specs:** Dark green gradient bg, decorative circles. Orange "Upgrade Available" pill, serif headline "Open Your Shop", benefits checklist (checkmarks in white), CTAs: "Open My Shop" (white bg, green text) + "Later" (ghost white border)
- **Trigger:** Appears when member has 3+ listings or $100+ in sales. Dismissible but reappears monthly.

---

## Unique / Editorial

### Shop Highlight
- **Atomic level:** Molecule
- **Anatomy:** Hero image (160px, gradient overlay), SHOP badge (top-right), Avatar + Name + Location (bottom-left over image), Body: quote, fishing identity tags, 3-item preview grid (prices overlaid), rating + sales count, "Visit Shop" CTA (pill-radius green button)

### Maker Story Block
- **Atomic level:** Molecule
- **Anatomy:** Photo (200px, 8px radius, location caption), Pull quote (serif italic 18px, 3px orange left border, 16px padding-left, cite), Narrative paragraph (14px regular, 1.6 line-height), Ghost green CTA
- **Font:** DM Serif Display for the pull quote -- one of the sanctioned editorial moments

### Featured Listing Card
- **Atomic level:** Molecule
- **Specs:** 16:9 aspect ratio, full gradient overlay (to top, 0.8 black at bottom), Featured badge + condition pill top-left, watchlist button top-right (frosted glass), bottom overlay: seller line (11px uppercase), title (20px bold white), price (22px bold white) + "or offer" + watcher count
- **Use:** Homepage "Maker Spotlight" and "Editor's Pick" sections

### Species Browse Row
- **Atomic level:** Molecule
- **Specs:** Horizontal scroll row with snap. Each item: 64px circle (gradient bg, 3px border, emoji icon center) + 11px semibold label below. Active: green-500 border. Inactive: sand-400 border.

### Social Proof Strip
- **Atomic level:** Molecule
- **Variants:**
  - Stat strip: Green-500 bg, 3-stat horizontal (white text, 18px bold values, 10px labels), vertical dividers
  - Activity feed: Sand-100 bg, green pulse dot, "Marcus T. in Tennessee just sold..." + timestamp

### Price Drop Alert
- **Atomic level:** Molecule
- **Variants:**
  - In-app banner: Success bg/border, dollar icon, "Price dropped! Was $160 -> now $140"
  - Saved tab row: Thumbnail + title + new price (success bold) + old price (strikethrough) + drop badge pill

### Recently Sold Ticker
- **Atomic level:** Molecule
- **Specs:** Sand-200 bg, sand border, header "Recently Sold" with green pulse dot. Rows: thumbnail (36px), title (12px, truncated), timestamp (10px), price (13px bold). Auto-scrolls upward every 4 seconds.

---

## Organisms

### Modals & Overlays
- **Atomic level:** Organism
- **Types documented (12 total):**
  1. Confirm destructive (centered, no scrim dismiss)
  2. Quick edit / price (bottom sheet, live fee calc)
  3. Make an offer (bottom sheet, 70% floor, error validation)
  4. Condition detail (bottom sheet, read-only, educational)
  5. Share listing (bottom sheet, native share API fallback)
  6. Sign in / join prompt (bottom sheet, contextual icon/title)
  7. Report listing (centered modal, radio options)
  8. Shipping options (bottom sheet, radio select)
  9. Photo viewer (full-screen takeover, z:600, swipe/pinch)
  10. Upgrade to shop (centered modal, conversion-focused)
  11. Photo upload progress (inline, non-blocking)
  12. Order status (bottom sheet / right drawer)
- **Shared specs:**
  - Scrim: `rgba(28,28,28,0.48)` -- never pure black
  - Surface: Parchment bg (never white, never green)
  - Bottom sheet: 16px top radius, handle 36x4px `--c-border`, max 85vh
  - Centered modal: 12px radius, max 480px desktop, full-width mobile
  - Z-index: Scrim 500, Surface 510, Photo viewer 600, Toast 700
  - Animation: Bottom sheet slide up 300ms ease-out; Modal fade+scale(0.96->1) 180ms ease-out

### Bottom Sheet
- **Specs:** Handle (36x4px centered), title (17px semibold), content area, optional CTA. Rounded top corners (24px), max 85vh scrollable.

---

## Feedback

### Loading States
- **Atomic level:** Molecule
- **Types:**
  - **Skeleton screens:** Shimmer animation (1.8s ease-in-out infinite), sand gradient (D9CCBA to E8DCC8), `--radius-200` (6px). Browse grid: square photo + 3 text lines. Seller card: circle avatar + text lines + button shape.
  - **Button loading:** Spinner replaces text, same dimensions, pointer-events disabled. Spinner: 18px, 2px border, white border-top-color, 0.7s spin animation.
- **Rules:** Optimistic UI for watch/offer/message. Never show blank content.

### Empty States
- **Atomic level:** Molecule
- **Anatomy:** Icon (48px, 50% opacity) + Serif headline (22px, max 6 words) + Description (14px text-2, max 280px, 1.65 line-height) + Primary CTA button
- **Instances:** No listings, Nothing matches (search), No messages, Nothing saved, No orders, No reviews
- **Rule:** Empty states are marketing moments -- never raw "No results found."

### Error States
- **Atomic level:** Molecule
- **Types:**
  - Inline form errors: Red border + shadow + descriptive message below
  - Page-level banners: Red/warning bg, descriptive text + action button
  - 404: Empty state pattern with "The one that got away." headline
- **Language rules:** Specific, honest, human. Never expose error codes. Preserve form data. Always offer a path forward.

### Toast Notifications
- **Atomic level:** Molecule
- **Variants:** Success (green border-left), Error (red), Warning (orange), Info (green)
- **Anatomy:** Icon (18px) + Body (title 14px semibold + description 13px text-2) + Close X (18px)
- **Specs:** White surface (`--surface-raised`), 4px left border, `--shadow-300`, min 280px, max 380px, `--radius-400`
- **Behavior:** Top-center mobile, bottom-right desktop. Auto-dismiss 4s. Action toasts persist. Z-index 600.
- **A11y:** `role="status"` or `role="alert"` with `aria-live`

---

## Patterns

### Voice & Tone
- **Type:** Documentation only (not a component)
- **Personality:** Knowledgeable fishing friend -- not a platform. Earned, specific, tactile.
- **Test:** Would a 52-year-old muskie collector or a 26-year-old lure maker read this and think "these people get it"?
- **Do:** Use species-specific language, tell stories about the gear's life, be honest about condition
- **Don't:** Use generic marketplace language, exclamation marks, "Don't miss out!", expose error codes
