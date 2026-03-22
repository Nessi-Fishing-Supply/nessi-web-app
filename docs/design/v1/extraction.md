# Nessi Design System v2.0 — Complete Extraction

Extracted from the Stitch design system page. Every token, value, and specification needed to implement in code.

---

## 1. CSS Custom Properties (Complete `:root` Token Set)

### 1.1 Color Tokens — Base Palette

| Token           | Hex       | RGB                  | Usage                                                                      |
| --------------- | --------- | -------------------- | -------------------------------------------------------------------------- |
| `--c-parchment` | `#EDE0CB` | `rgb(237, 224, 203)` | Page background. Every screen. Every gap. The ground state.                |
| `--c-green`     | `#1E4A40` | `rgb(30, 74, 64)`    | Top nav, primary buttons, active tab, active filter, condition fill.       |
| `--c-orange`    | `#E27739` | `rgb(226, 119, 57)`  | Sell FAB, watcher heart, SHOP pill, card prices, active offer, unread dot. |
| `--c-maroon`    | `#681A19` | `rgb(104, 26, 25)`   | "For Parts / As-Is" badge only. Never a button fill.                       |
| `--c-text`      | `#1C1C1C` | `rgb(28, 28, 28)`    | Headings, body, listing price in detail header, spec values.               |
| `--c-text-2`    | `#7A6E62` | `rgb(122, 110, 98)`  | Labels, metadata, secondary copy. Always warm — never cool grey.           |
| `--c-border`    | `#D9CCBA` | `rgb(217, 204, 186)` | All borders, dividers, inactive thumbnails, skeleton base.                 |
| `--c-fill`      | `#F0E8DA` | `rgb(240, 232, 218)` | Input bg, stats rows, inactive pills, skeleton highlight.                  |
| `--c-white`     | `#FFFFFF` | `rgb(255, 255, 255)` | White surfaces (seller card, modals, sheets, toasts).                      |

### 1.2 Color Tokens — Semantic Colors

| Token                | Hex       | Usage                                                   |
| -------------------- | --------- | ------------------------------------------------------- |
| `--c-success`        | `#1A6B43` | Net payout, successful upload, transaction complete.    |
| `--c-success-bg`     | `#D4EDDA` | Success background fill.                                |
| `--c-success-border` | `#A8D9BC` | Success border.                                         |
| `--c-warning`        | `#B86E0A` | Offer expiring, verification incomplete, action needed. |
| `--c-warning-bg`     | `#FEF3DC` | Warning background fill.                                |
| `--c-warning-border` | `#F5D08A` | Warning border.                                         |
| `--c-error`          | `#B91C1C` | Payment failed, upload failed, validation error.        |
| `--c-error-bg`       | `#FDE8E8` | Error background fill.                                  |
| `--c-error-border`   | `#F5B5B5` | Error border.                                           |
| `--c-info`           | `#1E4A40` | Contextual help, shipping guidance, platform updates.   |
| `--c-info-bg`        | `#D6E9E4` | Info background fill.                                   |
| `--c-info-border`    | `#9ECABB` | Info border.                                            |

### 1.3 Color Tokens — Interactive States

| Token               | Hex       | Usage                                       |
| ------------------- | --------- | ------------------------------------------- |
| `--c-green-hover`   | `#163831` | Green button/element hover state.           |
| `--c-green-active`  | `#0E2822` | Green button/element active/pressed state.  |
| `--c-orange-hover`  | `#CC6830` | Orange button/element hover state.          |
| `--c-orange-active` | `#B55A28` | Orange button/element active/pressed state. |

Disabled state: `opacity: 0.38; pointer-events: none;`
Loading state: `pointer-events: none;` with spinner overlay.

### 1.4 Color Tokens — CRUD State Colors

| Token                | Hex       | Usage                                              |
| -------------------- | --------- | -------------------------------------------------- |
| `--c-crud-create`    | `#1E4A40` | Publish listing, post message, submit form.        |
| `--c-crud-create-bg` | `#D6E9E4` | Create action background.                          |
| `--c-crud-read`      | `#1C1C1C` | View listing, browse, read message, order history. |
| `--c-crud-read-bg`   | `#F0E8DA` | Read action background.                            |
| `--c-crud-update`    | `#E27739` | Edit listing, update price, counter offer.         |
| `--c-crud-update-bg` | `#FBE9D9` | Update action background.                          |
| `--c-crud-delete`    | `#B91C1C` | Remove listing, decline offer, cancel order.       |
| `--c-crud-delete-bg` | `#FDE8E8` | Delete action background.                          |

### 1.5 Condition Badge Colors (Computed)

| Condition         | Background RGB      | Hex Equivalent                   |
| ----------------- | ------------------- | -------------------------------- |
| New (Unfished)    | `rgb(30, 74, 64)`   | `#1E4A40` (same as `--c-green`)  |
| Excellent         | `rgb(46, 107, 94)`  | `#2E6B5E`                        |
| Very Good         | `rgb(61, 122, 108)` | `#3D7A6C`                        |
| Good              | `rgb(92, 122, 78)`  | `#5C7A4E`                        |
| Fair              | `rgb(181, 149, 90)` | `#B5955A`                        |
| For Parts / As-Is | `rgb(104, 26, 25)`  | `#681A19` (same as `--c-maroon`) |

All condition badges use white text.

---

## 2. Typography

### 2.1 Font Families

| Token       | Value                                |
| ----------- | ------------------------------------ |
| `--f-sans`  | `"DM Sans", system-ui, sans-serif`   |
| `--f-serif` | `"DM Serif Display", Georgia, serif` |

### 2.2 Font Weights

| Token          | Value | Name     |
| -------------- | ----- | -------- |
| `--w-light`    | `300` | Light    |
| `--w-regular`  | `400` | Regular  |
| `--w-medium`   | `500` | Medium   |
| `--w-semibold` | `600` | SemiBold |
| `--w-bold`     | `700` | Bold     |

### 2.3 Line Heights

| Token          | Value  | Usage              |
| -------------- | ------ | ------------------ |
| `--lh-tight`   | `1.20` | Display heads      |
| `--lh-snug`    | `1.35` | Card titles, UI    |
| `--lh-normal`  | `1.50` | Body default       |
| `--lh-relaxed` | `1.65` | Long descriptions  |
| `--lh-loose`   | `1.80` | Instructional copy |

### 2.4 Full Type Scale

| Size   | Font             | Weight         | Line Height | Letter Spacing | Usage                                                            |
| ------ | ---------------- | -------------- | ----------- | -------------- | ---------------------------------------------------------------- |
| `48px` | DM Serif Display | 400            | 1.2         | —              | Hero editorial headers only                                      |
| `40px` | DM Serif Display | 400            | 1.2         | —              | Large editorial section headers                                  |
| `32px` | DM Serif Display | 400            | 1.25        | —              | Section titles on listing detail, shop pages                     |
| `28px` | DM Sans          | 700 (Bold)     | 1.25        | —              | Listing price in detail header. Always `--c-text`, never orange. |
| `24px` | DM Sans          | 700 (Bold)     | 1.3         | —              | Fee calculator net payout, offer amount in bubble                |
| `22px` | DM Sans          | 600 (SemiBold) | 1.25        | —              | Listing detail title (DM Sans, not Serif)                        |
| `20px` | DM Serif Display | 400            | 1.3         | —              | In-page section headers on listing detail                        |
| `17px` | DM Sans          | 600 (SemiBold) | 1.35        | —              | Shop name, profile name, modal title                             |
| `15px` | DM Sans          | 400 (Regular)  | 1.5         | —              | Body copy, inputs, seller name, nav search                       |
| `14px` | DM Sans          | 400 (Regular)  | 1.65        | —              | Listing description, long-form copy                              |
| `13px` | DM Sans          | 400 (Regular)  | 1.5         | —              | Metadata, helper text, secondary body                            |
| `12px` | DM Sans          | 600 (SemiBold) | —           | `+0.05em`      | Form field labels, eyebrows (uppercase)                          |
| `11px` | DM Sans          | 400 (Regular)  | 1.5         | —              | Card seller line, timestamps, secondary metadata                 |
| `10px` | DM Sans          | 600 (SemiBold) | —           | `+0.07em`      | Spec table keys, nav tab labels, stat labels (uppercase)         |
| `9px`  | DM Sans          | 500 (Medium)   | —           | `+0.05em`      | Condition badges and status pills only (uppercase)               |

### 2.5 Serif Usage Rules

**Use Serif (DM Serif Display) for:**

- Section headers: "Condition", "More from Caleb", "Similar Gear", "Just Listed", "Maker Spotlight"
- Empty state headlines
- The Nessi wordmark

**Never use Serif on:**

- Listing titles
- Any price
- Navigation labels
- Buttons
- Form labels or inputs
- Filter chips
- Condition badges
- Spec values
- Error messages
- Anything interactive

---

## 3. Spacing & Layout

### 3.1 Spacing Scale (4px Base Grid)

All spacing values are multiples of 4:

| Value  | Usage                                                                              |
| ------ | ---------------------------------------------------------------------------------- |
| `4px`  | Micro spacing                                                                      |
| `8px`  | Browse grid gap (3-col mobile), tight gaps                                         |
| `12px` | Component internal gaps                                                            |
| `16px` | `--sp-page` page horizontal padding, form group bottom margin, seller card padding |
| `20px` | Bottom sheet side padding, section headers                                         |
| `24px` | Bottom sheet bottom padding                                                        |
| `28px` | Modal internal padding                                                             |
| `32px` | Large section spacing                                                              |
| `40px` | Section separators                                                                 |
| `48px` | Large section padding                                                              |
| `64px` | Maximum spacing                                                                    |

### 3.2 Component Spacing Reference

| Component                      | Spacing                                 |
| ------------------------------ | --------------------------------------- |
| Page horizontal padding        | `--sp-page: 16px`                       |
| Browse grid gap (3-col mobile) | `8px` between cards                     |
| Card metadata row gap          | `3px` between rows                      |
| Seller card internal padding   | `16px` all sides                        |
| Sticky purchase bar padding    | `12px` vertical, `16px` horizontal      |
| Form group bottom margin       | `16px`                                  |
| Modal internal padding         | `28px`                                  |
| Bottom sheet padding           | `16px` top, `20px` sides, `24px` bottom |

---

## 4. Border Radius

| Token        | Value   | Usage                                |
| ------------ | ------- | ------------------------------------ |
| `--r-xs`     | `4px`   | Micro tags                           |
| `--r-sm`     | `6px`   | Small button                         |
| `--r-base`   | `8px`   | Photo/thumbnails                     |
| `--r-md`     | `10px`  | Cards, inputs                        |
| `--r-lg`     | `12px`  | Sheet top corners                    |
| `--r-xl`     | `16px`  | Modal                                |
| `--r-2xl`    | `24px`  | Sheet edge, bottom sheet top corners |
| `--r-pill`   | `999px` | All pills                            |
| `--r-circle` | `50%`   | Avatar, FAB                          |

---

## 5. Shadows

| Token               | Value                                                       | Usage                               |
| ------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `--sh-xs`           | `0 1px 2px rgba(0,0,0,0.06)`                                | Filter chips                        |
| `--sh-sm`           | `0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`    | Seller card                         |
| `--sh-md`           | `0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)`   | Toast                               |
| `--sh-lg`           | `0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)`   | Bottom sheet                        |
| `--sh-xl`           | `0 16px 48px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.06)` | Modal                               |
| `--sh-sell`         | `0 4px 12px rgba(226,119,57,0.45)`                          | Sell FAB only                       |
| `--sh-focus-green`  | `0 0 0 3px rgba(30,74,64,0.28)`                             | Primary inputs, green buttons focus |
| `--sh-focus-orange` | `0 0 0 3px rgba(226,119,57,0.28)`                           | Orange elements focus               |
| `--sh-focus-error`  | `0 0 0 3px rgba(185,28,28,0.22)`                            | Error inputs focus                  |

Shadows are warm (black alpha) — never cool blue-grey.

---

## 6. Motion & Animation

### 6.1 Duration Tokens

| Token           | Value   | Usage                                                   |
| --------------- | ------- | ------------------------------------------------------- |
| `--dur-fast`    | `100ms` | Button hover, icon color, tab active, pill selection    |
| `--dur-base`    | `180ms` | Default — card hover, input focus, accordion, toggle    |
| `--dur-slow`    | `300ms` | Page transitions, bottom sheet open, condition track    |
| `--dur-slower`  | `450ms` | Modal entrance, toast slide-in                          |
| `--dur-slowest` | `600ms` | Skeleton shimmer cycle, progress bars, photo cross-fade |

### 6.2 Easing Tokens

| Token           | Value                               | Usage                                                                                                                 |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--ease-out`    | `cubic-bezier(0.16, 1, 0.3, 1)`     | Default for almost all UI. Card hover, input focus, pill transitions, bottom sheet open. Fast start, smooth finish.   |
| `--ease-in`     | `cubic-bezier(0.4, 0, 1, 1)`        | Exit and dismissal only: modal close, toast disappear, bottom sheet dismiss. Starts slow, accelerates away.           |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Micro-interactions with slight overshoot: Sell FAB hover, toggle switch, heart/watchlist tap, star fill. Feels alive. |
| `ease-linear`   | `linear`                            | Progress bars, skeleton shimmer, spinner rotation. Mechanical and continuous.                                         |

### 6.3 Keyframe Animations

```css
@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    background-position: -400% 0;
  }
  100% {
    background-position: 400% 0;
  }
}
```

---

## 7. Z-Index Stacking Order

| Token            | Value | Usage                                    |
| ---------------- | ----- | ---------------------------------------- |
| (base)           | `0`   | Normal flow                              |
| (raised)         | `10`  | Card hover                               |
| `--z-sticky`     | `100` | Top nav, filter strip                    |
| `--z-filter`     | `150` | Filter chip strip (sticky below top nav) |
| `--z-nav-bottom` | `300` | Bottom tab bar — always on top           |
| (sheet-backdrop) | `400` | Sheet dim backdrop                       |
| `--z-sheet`      | `410` | Bottom sheet panel                       |
| (modal-backdrop) | `500` | Modal dim backdrop                       |
| `--z-modal`      | `510` | Modal panel                              |
| `--z-toast`      | `600` | Toasts — above modals                    |
| (tooltip)        | `700` | Always topmost                           |

---

## 8. Breakpoints

| Width    | Name | Description                                                                                           |
| -------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `320px`  | xs   | Small phones. All layouts must work. No horizontal overflow.                                          |
| `375px`  | sm   | **Primary design target** (iPhone 14). 3-column card grid. Bottom tab bar.                            |
| `768px`  | md   | Tablet. 4-column grid. Bottom nav persists. Sidebar layouts emerge.                                   |
| `1024px` | lg   | Desktop. Top nav replaces bottom nav. Category pill row. Right-column sticky panel on listing detail. |
| `1280px` | xl   | Large desktop. Max content width 1200px centered.                                                     |

**Mobile-first.** Base CSS targets 375px. Desktop overrides: `@media (min-width: 1024px)`. Never use device names or orientation — only viewport width.

---

## 9. Fixed Component Heights

| Token / Component   | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| `--h-nav-top`       | `56px` — Top nav (both green and parchment variants)      |
| `--h-nav-bottom`    | `60px` — Bottom tab bar (+ `env(safe-area-inset-bottom)`) |
| `--h-btn-lg`        | `52px` — Large button                                     |
| `--h-btn-md`        | `44px` — Medium button (default)                          |
| `--h-btn-sm`        | `36px` — Small button                                     |
| `--h-btn-xs`        | `28px` — Extra-small button                               |
| `--h-input`         | `48px` — Text input                                       |
| `--h-input-sm`      | `40px` — Small text input                                 |
| `--min-tap`         | `44px` — Minimum tap target (44x44px)                     |
| `--sp-page`         | `16px` — Page horizontal padding                          |
| Sell FAB            | `48x48px`, floats `8px` above bar                         |
| Filter chip strip   | `40px` height                                             |
| Sticky purchase bar | `80px` + `safe-area-inset-bottom`                         |
| Thumbnail strip     | `56x56px` each                                            |

---

## 10. Navigation System

### 10.1 Top Nav — Browse/Home (Forest Green)

- Background: `--c-green` (`#1E4A40`)
- Height: `56px` (`--h-nav-top`)
- Wordmark: DM Sans SemiBold `20px`, white
- Search input:
  - Background: `rgba(255, 255, 255, 0.13)`
  - Text: white
  - Placeholder opacity: `0.5` (55%)
  - Search icon: left-aligned, SVG in background
  - Height: `36px`
  - Border radius: `--r-md` (`10px`)
  - Padding: `0 12px 0 36px`
  - Font: `14px`, `--f-sans`
- Filter icon: right side, with `--c-orange` 7px dot when active
- Nav icon tap target: `44x44px`, hover bg: `rgba(255, 255, 255, 0.12)`

### 10.2 Top Nav — Detail/Profile (Parchment)

- Background: `--c-parchment`
- Height: `56px`
- Back arrow: left, `44x44px` tap target
- "Nessi" centered: DM Sans Medium `16px`
- Context actions right: share + watchlist on listing detail, share on profiles
- Border bottom: `1px solid --c-border`

### 10.3 Filter Chip Strip

- Scrollable horizontally, no scrollbar
- Height: `40px`
- Background: `--c-parchment`
- Padding: `8px 16px`
- Gap: `8px`
- Active chip: `--c-orange` fill, white text
- Inactive chip: `--c-fill` bg, `--c-border` border, `--c-text` color
- Sticky below top nav at `z:150`
- Border bottom: `1px solid --c-border`

### 10.4 Category Pill Row (Desktop Only)

- Background: `--c-fill`
- Padding: `8px 16px`
- Gap: `8px`
- Active pill: `--c-green` bg, white text
- Inactive pill: transparent bg, `1px solid --c-border`, `--c-text` color
- Height: `28px`
- Padding: `0 14px`
- Border radius: `--r-pill` (`999px`)
- Font: `13px`, weight `500`

### 10.5 Bottom Tab Bar

- Background: white
- Border top: `1px solid --c-border`
- Height: `60px` + safe area
- Active tab: `--c-green` color
- Inactive tab: `--c-text-2` color
- Tab labels: `10px`, weight `500`, uppercase, `letter-spacing: 0.06em`
- Tab icons: `20px`
- Sell circle: `48px` `--c-orange`, floats `8px` above baseline, no label
  - Shadow: `--sh-sell`
  - Hover: `--c-orange-hover`, `scale(1.08)` with `--ease-spring`
- Inbox unread: `8px` solid dot only — no number

---

## 11. Buttons

### 11.1 Base Button Styles

- Font: `--f-sans`, weight `600`
- Display: `inline-flex`, centered
- Gap: `8px`
- Border: none
- Border radius: `--r-md` (`10px`) default
- Transition: `all 100ms var(--ease-out)`
- Min tap target: `44x44px`

### 11.2 Button Sizes

| Size     | Height                | Padding  | Font Size | Border Radius      |
| -------- | --------------------- | -------- | --------- | ------------------ |
| `btn-lg` | `52px` (`--h-btn-lg`) | `0 28px` | `16px`    | `--r-md` (`10px`)  |
| `btn-md` | `44px` (`--h-btn-md`) | `0 20px` | `15px`    | `--r-md` (`10px`)  |
| `btn-sm` | `36px` (`--h-btn-sm`) | `0 14px` | `13px`    | `--r-base` (`8px`) |
| `btn-xs` | `28px` (`--h-btn-xs`) | `0 10px` | `12px`    | `--r-sm` (`6px`)   |

### 11.3 Button Variants

**Primary (`.btn-primary`)**

- Background: `--c-green`
- Color: white
- Hover: `--c-green-hover`
- Active: `--c-green-active`, `transform: scale(0.98)`
- Focus: `box-shadow: --sh-focus-green`

**Ghost/Secondary (`.btn-ghost`)**

- Background: transparent
- Color: `--c-text`
- Border: `1.5px solid --c-text`
- Hover: bg `--c-fill`
- Active: `scale(0.98)`

**Orange Accent (`.btn-orange`)**

- Background: `--c-orange`
- Color: white
- Hover: `--c-orange-hover`
- Active: `scale(0.98)`
- Focus: `--sh-focus-orange`

**Ghost Orange (`.btn-ghost-orange`)**

- Background: transparent
- Color: `--c-orange`
- Border: `1.5px solid --c-orange`
- Hover: bg `rgba(226, 119, 57, 0.07)`

**Danger/Destructive (`.btn-danger`)**

- Background: `--c-error` (`#B91C1C`)
- Color: white
- Hover: `rgb(155, 26, 26)` (darker)
- Active: `scale(0.98)`
- Focus: `--sh-focus-error`

**Ghost Danger (`.btn-ghost-danger`)**

- Background: transparent
- Color: `--c-error`
- Border: `1.5px solid --c-error`
- Hover: bg `--c-error-bg`

### 11.4 Button States

- **Disabled:** `opacity: 0.38; pointer-events: none;`
- **Loading:** `pointer-events: none;` button text `opacity: 0;` with centered spinner:
  - `18px` x `18px`
  - `2px` border
  - `border-color: white rgba(255,255,255,0.4) rgba(255,255,255,0.4)`
  - Animation: `spin 0.7s linear infinite`

### 11.5 Special Buttons

**Message Button (`.btn-msg`)**

- Height: `28px`
- Padding: `0 12px`
- Font: `12px`, weight `500`
- Border radius: `--r-sm` (`6px`)
- Background: `--c-green`, hover: `--c-green-hover`

**Sell FAB**

- `48px` x `48px`, border-radius `50%`
- Background: `--c-orange`
- Shadow: `--sh-sell`
- Hover: `--c-orange-hover`, `scale(1.08)` with `--ease-spring`
- Position: relative, `top: -6px` (floats above bar)

**Sticky Purchase Bar**

- Two-button split: `40/60` ratio
- "Make Offer" ghost + "Buy Now" primary
- No price. No shipping copy.

---

## 12. Pills & Badges

### 12.1 Base Pill Styles

- Display: `inline-flex`, centered
- Gap: `4px`
- Border radius: `--r-pill` (`999px`)
- Font: `--f-sans`, weight `500`
- Font size: `9px` (default)
- Text transform: uppercase
- Letter spacing: `0.05em`
- Padding: `3px 9px`

### 12.2 Pill Sizes

| Size      | Font Size | Padding    |
| --------- | --------- | ---------- |
| Default   | `9px`     | `3px 9px`  |
| `pill-lg` | `11px`    | `5px 12px` |
| `pill-sm` | `8px`     | `2px 7px`  |

### 12.3 Condition Badges

Position: absolute, `bottom: 8px`, `left: 8px`, `z-index: 2` on photo overlays.
9px on photo overlay. 11px in condition section. Always uppercase.

| Condition         | Class             | Background | Text  |
| ----------------- | ----------------- | ---------- | ----- |
| New (Unfished)    | `.pill-new`       | `#1E4A40`  | white |
| Excellent         | `.pill-excellent` | `#2E6B5E`  | white |
| Very Good         | `.pill-verygood`  | `#3D7A6C`  | white |
| Good              | `.pill-good`      | `#5C7A4E`  | white |
| Fair              | `.pill-fair`      | `#B5955A`  | white |
| For Parts / As-Is | `.pill-parts`     | `#681A19`  | white |

### 12.4 Listing Status Pills

| Status       | Class           | Background       | Color         | Border                         |
| ------------ | --------------- | ---------------- | ------------- | ------------------------------ |
| Active       | `.pill-active`  | `--c-success-bg` | `--c-success` | `1px solid --c-success-border` |
| Pending Sale | `.pill-pending` | `--c-warning-bg` | `--c-warning` | `1px solid --c-warning-border` |
| Sold         | `.pill-sold`    | `#EDE0CB`        | `--c-text-2`  | `1px solid --c-border`         |
| Draft        | `.pill-draft`   | `--c-fill`       | `--c-text-2`  | `1px solid --c-border`         |

Dashboard and order management only. Never on buyer-facing browse or listing detail.

### 12.5 SHOP Pill

- Class: `.pill-shop`
- Background: `--c-orange`
- Color: white
- Sizes: lg (shop page header), default (seller card), sm (product card seller line)
- Never modified.

### 12.6 Filter Chips

- Active: `.pill-fon` — `--c-orange` bg, white text
- Inactive: `.pill-foff` — `--c-fill` bg, `1px solid --c-border`, `--c-text` color

### 12.7 Category Pills

- Active: `.pill-con` — `--c-green` bg, white text
- Inactive: `.pill-coff` — transparent bg, `1px solid --c-border`, `--c-text` color

### 12.8 Usage Tags

- Class: `.pill-tag`
- Background: `--c-fill`
- Border: `1px solid --c-border`
- Color: `--c-text-2`
- Examples: FRESHWATER ONLY, MAINTAINED, ORIGINAL PARTS, LIGHT USE

### 12.9 Member Badges

- Earned: `.badge-earned` — `--c-green` bg, white text
- Locked: `.badge-locked` — `--c-fill` bg, `1px solid --c-border`, `--c-text-2` color, `opacity: 0.6`
- Locked badges: tap opens tooltip with requirements
- Badge types: 100 SALES, FAST SHIPPER, TOP RATED, ELITE SELLER, VERIFIED ANGLER, MAKER CERTIFIED

---

## 13. Form Elements

### 13.1 Text Input Base

- Height: `--h-input` (`48px`)
- Border radius: `--r-md` (`10px`)
- Border: `1px solid --c-border`
- Background: `--c-fill`
- Padding: `0 14px`
- Font: `15px`, `--f-sans`
- Color: `--c-text`
- Placeholder: `--c-text-2`, opacity `0.8`
- Transition: `all 100ms var(--ease-out)`

### 13.2 Input States

| State     | Border                               | Background | Shadow                   |
| --------- | ------------------------------------ | ---------- | ------------------------ |
| Default   | `--c-border`                         | `--c-fill` | none                     |
| Hover     | `rgb(192, 179, 160)` (darker border) | `--c-fill` | none                     |
| Focus     | `--c-green`                          | white      | `--sh-focus-green`       |
| Success   | `--c-success`                        | white      | none                     |
| Error     | `--c-error`                          | white      | `--sh-focus-error`       |
| Disabled  | `--c-border`                         | `--c-fill` | none, `opacity: 0.45`    |
| Read-only | `--c-border`                         | `--c-fill` | none, color `--c-text-2` |

### 13.3 Small Input

- Height: `--h-input-sm` (`40px`)
- Font size: `14px`

### 13.4 Textarea

- Min height: `120px`
- Border radius: `--r-md`
- Padding: `12px 14px`
- Font: `15px`, `--f-sans`
- Resize: vertical
- Focus: same as text input (green border, white bg, focus ring)

### 13.5 Select/Dropdown

- Same dimensions as text input
- Appearance: none (custom chevron via SVG background image)
- Chevron: SVG arrow positioned `right 12px center`
- Padding: `0 36px 0 14px`

### 13.6 Checkbox & Radio

- Size: `18px` x `18px`
- Accent color: `--c-green`
- Label: `14px`, `--c-text`
- Wrapper gap: `10px`
- Padding: `4px 0`

### 13.7 Toggle Switch

- Width: `44px`, Height: `24px`
- Border radius: `--r-pill`
- Off state: `--c-border` background
- On state: `--c-green` background
- Knob: `18px` x `18px`, white, `50%` radius
- Knob position: `3px` from edge, slides to `23px` when on
- Shadow: `--sh-xs` on knob
- Transition: `background 180ms var(--ease-out)`
- Label gap: `12px`

### 13.8 Form Labels

- Font size: `12px`
- Font weight: `600`
- Text transform: uppercase
- Letter spacing: `0.05em`
- Color: `--c-text-2`
- Margin bottom: `6px`

### 13.9 Form Messages

- Font size: `12px`
- Margin top: `5px`
- Success (`.smsg`): color `--c-success`
- Error (`.emsg`): color `--c-error`
- Hint (`.hint`): color `--c-text-2`

### 13.10 Input Variants

- **With prefix ($):** prefix positioned inside input
- **With suffix (e.g., "inches"):** suffix positioned inside input
- **Form group margin:** `16px` bottom

### 13.11 Price Input with Live Net Payout Calculator

- Under $15: flat $0.99 fee
- $15+: 6% fee
- Shop account: 4.5% fee
- Updates in real-time
- Never show Stripe fees — only net payout
- Net payout display: `20px`, weight `700`, color `--c-success`

---

## 14. Product Cards

### 14.1 Card Structure

- **No white background. No border. No shadow.** Photo is the card — metadata floats on parchment below.
- Entire card is the tap target (no separate buy button)
- Hover: `transform: scale(1.025); opacity: 0.92;`
- Active: `transform: scale(0.98);`
- Transition: `transform 180ms var(--ease-out), opacity 180ms`

### 14.2 Card Photo

- Aspect ratio: `1:1` square
- Border radius: `--r-base` (`8px`)
- Background: `#1C1C1C` (dark letterbox)
- Inner gradient: `linear-gradient(135deg, #2A2A2A, #1A1A1A)`
- Overflow: hidden

### 14.3 Condition Badge Position

- Position: absolute
- Bottom: `8px`, Left: `8px`
- Z-index: `2`

### 14.4 Watch Icon

- Position: absolute, top: `8px`, right: `8px`, z-index: `2`
- Size: `30px` x `30px`
- Background: `rgba(255, 255, 255, 0.2)`, `backdrop-filter: blur(4px)`
- Border radius: `50%`
- Font size: `14px`
- Hover: `rgba(255, 255, 255, 0.35)`
- Watched state: `rgba(226, 119, 57, 0.85)`

### 14.5 Card Metadata

- Margin top: `8px`
- Price: `14px`, weight `600`, color `--c-orange`
- Title: `13px`, weight `400`, color `--c-text`, line-height `1.35`, max 2 lines (`-webkit-line-clamp: 2`)
- Seller: `11px`, color `--c-text-2`, margin-top `3px`, flex with `4px` gap
- SHOP pill inline after seller name
- Secondary metadata: `11px`, `--c-text-2`

---

## 15. Seller Card

### 15.1 Card Container

- Background: white (one of the few white surfaces)
- Border radius: `--r-md` (`10px`)
- Border: `1px solid --c-border`
- Padding: `16px`
- Used on listing detail and shop pages only

### 15.2 Card Layout

- Top row: avatar + name/rating, flex with `12px` gap
- Name: `15px`, weight `600`
- Rating: `11px`, `--c-text-2`, uppercase, `letter-spacing: 0.04em`
- Message button: `28px` xs green button

### 15.3 Stats Row

- Grid: `2 columns`
- Background: `--c-fill`
- Border radius: `--r-base`
- Margin top: `12px`
- Stat label: `9px`, weight `700`, uppercase, `letter-spacing: 0.07em`, `--c-text-2`
- Stat value: `15px`, weight `600`, `--c-text`
- Padding per stat: `10px 16px`
- Divider: `1px solid --c-border` (right border between columns)

### 15.4 Trust Row

- Flex with `6px` gap, wrapping
- Margin top: `10px`
- Trust indicator: `11px`, `--c-success` color
- Checkmark + text

### 15.5 Shop Avatar

- 2px `--c-orange` ring around shop owner avatars

---

## 16. Avatars

### 16.1 Avatar Sizes

| Size        | Class    | Dimensions      | Font Size |
| ----------- | -------- | --------------- | --------- |
| Large       | `.av-lg` | `48px` x `48px` | `18px`    |
| Medium      | `.av-md` | `40px` x `40px` | `15px`    |
| Small       | `.av-sm` | `32px` x `32px` | `12px`    |
| Extra Small | `.av-xs` | `24px` x `24px` | `9px`     |

### 16.2 Avatar Style

- Border radius: `50%`
- Font weight: `600`
- Color: white
- Flex-shrink: `0`
- Shows initials when no photo set

### 16.3 Avatar Gradients (Deterministic per User)

| Variant | Class   | Gradient                                    |
| ------- | ------- | ------------------------------------------- |
| Green   | `.av-g` | `linear-gradient(135deg, #1E4A40, #2E6B5E)` |
| Orange  | `.av-o` | `linear-gradient(135deg, #E27739, #C47030)` |
| Maroon  | `.av-m` | `linear-gradient(135deg, #681A19, #8B2525)` |

Shop owners: `2px --c-orange` border ring everywhere their avatar appears.
Gradient is deterministic per user — never random on re-render.

---

## 17. Condition Grading

### 17.1 Condition Track

- 6 tiers: Fair, Good, Very Good, Excellent, Mint, New
- Left = worst, right = best
- Always expanded on listing detail
- Interactive in listing creation flow

### 17.2 Track Visual

- Past tiers: `--c-orange` filled dots (`10px`)
- Active tier: `18px` `--c-green` dot with white checkmark, `margin-top: -4px`
- Future tiers: `--c-border` unfilled, `2px` border, white fill
- Track line: `2px` height, `--c-border` base, `--c-orange` fill for past portion
- Fill animates on selection: `width 300ms var(--ease-out)`
- Dot transition: `180ms`
- Labels: `9px`, weight `600`, uppercase, `letter-spacing: 0.04em`, `--c-text-2`
- Active label: `--c-text`, weight `700`

### 17.3 Condition Tier Descriptions (Exact Language — Never Paraphrase)

| Tier                  | Description                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **New (Unfished)**    | Never used, original packaging or equivalent. No wear of any kind.                                    |
| **Excellent**         | Used briefly (1-2 trips), no visible wear, functions perfectly, all original parts.                   |
| **Very Good**         | Normal use, minor cosmetic wear only (light scratches, slight cork compression), functions perfectly. |
| **Good**              | Visible wear consistent with regular use. May have minor repairs. Functions as intended.              |
| **Fair**              | Heavy use or storage wear. Functional but cosmetic condition is rough. Priced to reflect.             |
| **For Parts / As-Is** | Does not fully function or has significant damage. Sold as described, no returns.                     |

---

## 18. Rating Display

### 18.1 Stars

- Filled stars: `--c-orange`, `16px`
- Empty stars: `--c-border`, `16px`
- Gap: `2px`
- Never show a rating for fewer than 3 completed transactions

### 18.2 Rating Breakdown Bar

- Star label: `12px`, `--c-text-2`, `16px` width, right-aligned
- Track: flex `1`, `6px` height, `--c-fill` bg, `--r-pill` radius
- Fill: `--c-orange`, `--r-pill` radius
- Count: `12px`, `--c-text-2`, `24px` width
- Row gap: `10px`, margin-bottom: `6px`

---

## 19. Tabs & Accordion

### 19.1 Tabs

- Container: flex, `2px solid --c-border` bottom border
- Tab: padding `10px 16px`, `14px`, weight `500`, `--c-text-2`
- Tab hover: `--c-text`
- Active tab: `--c-green` color, weight `600`, `2px` bottom border `--c-green`
- Tab body padding: `20px 0`
- Tab label includes count in parentheses when relevant
- Active: 2px bottom border. No filled background.

### 19.2 Accordion

- Item: `1px solid --c-border` bottom border
- Header: flex, space-between, padding `16px 0`, cursor pointer
- Title: `15px`, weight `600`, `--c-text`
- Chevron: `18px`, `--c-text-2`
- Chevron rotation: `rotate(180deg)` when open, `180ms var(--ease-out)`
- Body: padding `0 0 16px`, `14px`, `--c-text-2`, line-height `1.65`
- Specs start expanded on listing detail. Shipping and Policy start collapsed.

---

## 20. Messaging

### 20.1 Message Thread

- Container: flex column, `12px` gap, padding `16px`, `--c-fill` bg, `--r-md` radius
- Max width: `400px`

### 20.2 Message Bubbles

- Max width: `70%`
- Padding: `10px 14px`
- Font: `14px`, line-height `1.65`

**Received (`.msg-r`):**

- Background: white
- Border radius: `--r-md --r-md --r-md 4px` (flat bottom-left corner)
- Color: `--c-text`

**Sent (`.msg-s`):**

- Background: `--c-green`
- Border radius: `--r-md --r-md 4px --r-md` (flat bottom-right corner)
- Color: white

### 20.3 Timestamps

- Font size: `10px`
- Color: `--c-text-2`
- Sent messages: right-aligned

### 20.4 Offer Bubble

- Background: white
- Border: `1.5px solid --c-orange`
- Border radius: `--r-md`
- Padding: `14px`
- Max width: `260px`
- Label: `10px`, weight `700`, uppercase, `letter-spacing: 0.07em`, `--c-orange`
- Amount: `24px`, weight `700`, `--c-text`
- Note: `12px`, `--c-text-2`
- Actions: flex, `8px` gap, margin-top `12px`
- Expires: 24hrs
- Accept triggers checkout flow

---

## 21. Price Display & Specs

### 21.1 Price Display

- **Main listing price (detail):** `28px`, weight `700`, always `--c-text` (`#1C1C1C`), never orange
- **Card price:** `14px`, weight `600`, always `--c-orange`
- **"or offer" suffix:** `13px`, `--c-text-2`
- **Watcher count:** orange heart + `12px` weight `600` uppercase `--c-orange`, `letter-spacing: 0.05em`
- **Below-average signal:** `--c-success` color
- **Original price (strikethrough):** alongside discounted price
- **Discount badge:** percentage off

### 21.2 Fee Calculator

- Container: white bg, `--r-md` radius, `20px` padding, `1px solid --c-border`
- Max width: `380px`
- Title: `12px`, weight `700`, uppercase, `letter-spacing: 0.07em`, `--c-text-2`
- Fee row labels: `13px`, `--c-text-2`
- Fee row values: `13px`, weight `500`, `--c-text`
- Divider: `1px solid --c-border`, margin `4px 0`
- Net label: `14px`, weight `600`, `--c-text`
- Net amount: `20px`, weight `700`, `--c-success`

### 21.3 Spec Table

- Grid: `2 columns` (`1fr 1fr`)
- Row padding: `10px 0`
- Row divider: `1px solid --c-fill`
- Key: `10px`, weight `600`, uppercase, `letter-spacing: 0.05em`, `--c-text-2`
- Value: `14px`, weight `500`, `--c-text`
- Never show empty rows

---

## 22. Loading States

### 22.1 Skeleton Screen

- Gradient: `linear-gradient(90deg, #D9CCBA 25%, #E8DCc8 50%, #D9CCBA 75%)`
- Background size: `400% 100%`
- Animation: `shimmer 1.8s ease-in-out infinite`
- Border radius: `--r-sm`

### 22.2 Button Loading

- Spinner replaces text
- Button holds same dimensions
- Pointer events disabled
- Spinner: `18px` x `18px`, `2px` border, colors `white rgba(255,255,255,0.4) rgba(255,255,255,0.4)`
- Animation: `spin 0.7s linear infinite`

### 22.3 Optimistic UI

Use optimistic UI for: watch/offer/message actions. Never show blank content.

---

## 23. Empty States

### 23.1 Empty State Structure

- Container: flex column, centered, `text-align: center`, padding `48px 24px`
- Icon: `48px`, `opacity: 0.5`, margin-bottom `16px`
- Title: `--f-serif`, `22px`, `--c-text`, margin-bottom `8px`
- Description: `14px`, `--c-text-2`, max-width `280px`, line-height `1.65`, margin-bottom `20px`
- CTA: primary button

Empty states are marketing moments — never a raw "No results found."

### 23.2 Empty State Examples

| Context           | Icon      | Title            | Description                                                                      | CTA                  |
| ----------------- | --------- | ---------------- | -------------------------------------------------------------------------------- | -------------------- |
| No listings       | fish      | No listings yet. | Start with your most-used rod — that's the one someone else would actually want. | List Your First Item |
| No search results | search    | Nothing matches. | Try "Shimano" or "7ft medium rod" — or clear your filters.                       | Clear Filters        |
| No messages       | checkmark | No messages yet. | When buyers ask about your listings, threads appear here.                        | Browse Listings      |
| No watchlist      | heart     | Nothing saved.   | Tap the heart on any listing. You'll know when the price drops.                  | Start Browsing       |
| No orders         | box       | No orders yet.   | Your purchase history lives here once you've bought something.                   | Browse Gear          |
| No reviews        | star      | No reviews yet.  | Reviews appear after completed transactions. First sale is the hardest one.      | View Listings        |

---

## 24. Error States

### 24.1 Inline Form Errors

- Font: `12px`, `--c-error` color
- Prefix: `x` symbol
- Input border: `--c-error`
- Input shadow: `--sh-focus-error`
- Specific, honest messages (never generic "invalid" text)

### 24.2 Page-Level Banners

- Full-width banner with action button
- Specific error messages with path forward
- Examples:
  - "Payment didn't go through — your card was declined." + "Try Again"
  - "This listing may no longer be available." + "Refresh"
  - "No internet connection. We've saved your listing draft — come back when you're back online."

### 24.3 404 / Not Found

- Same structure as empty states
- Title (serif): "The one that got away."
- Description: specific and helpful, not generic
- CTA: "Browse Similar Gear"

### 24.4 Error Language Rules

**Do write:** "That email isn't registered — try a different one." / "Payment didn't go through — your card was declined." / "That listing isn't here anymore."

**Never write:** "Invalid credentials." / "Error 404." / "Something went wrong." / "An unexpected error occurred." / Any Stripe code.

---

## 25. Toast Notifications

### 25.1 Toast Container

- Display: flex, `12px` gap
- Padding: `14px 16px`
- Border radius: `--r-md`
- Shadow: `--sh-md`
- Width: min `280px`, max `380px`
- Position: top-center mobile, bottom-right desktop
- Z-index: `600`
- Auto-dismiss: `4s` (action toasts persist until dismissed)

### 25.2 Toast Variants

| Variant | Class      | Border Left             |
| ------- | ---------- | ----------------------- |
| Success | `.toast-s` | `4px solid --c-success` |
| Error   | `.toast-e` | `4px solid --c-error`   |
| Warning | `.toast-w` | `4px solid --c-warning` |
| Info    | `.toast-i` | `4px solid --c-info`    |

All toasts: white background, left border accent.

### 25.3 Toast Content

- Icon: `18px`, flex-shrink `0`
- Title: `14px`, weight `600`, `--c-text`
- Description: `13px`, `--c-text-2`, margin-top `2px`
- Close button: `18px`, `--c-text-2`, cursor pointer

---

## 26. Overlays

### 26.1 Bottom Sheet

- Background: white
- Top border radius: `--r-2xl` (`24px`)
- Padding: `16px 20px 24px`
- Shadow: `--sh-xl`
- Max width: `420px`
- Border: `1px solid --c-border`
- Z-index: `410`
- Max height: `85vh`, scrollable inside
- Handle: `36px` x `4px`, `--r-pill` radius, `--c-border` color, centered, margin-bottom `20px`
- Title: `17px`, weight `600`, `--c-text`, margin-bottom `16px`

### 26.2 Modal

- Background: white
- Border radius: `--r-xl` (`16px`)
- Padding: `28px`
- Shadow: `--sh-xl`
- Max width: `380px`
- Border: `1px solid --c-border`
- Z-index: `510`
- Backdrop: `rgba(28, 28, 28, 0.65)`
- Title: `18px`, weight `700`, `--c-text`, margin-bottom `8px`
- Description: `14px`, `--c-text-2`, line-height `1.65`, margin-bottom `24px`
- Actions: flex, `12px` gap
- **Destructive action always on the right**

---

## 27. Voice & Tone

Knowledgeable fishing friend — not a platform. Earned, specific, tactile.

**Test:** Would a 52-year-old muskie collector or a 26-year-old lure maker read this and think "these people get it"?

### Listing Descriptions

- DO: Specific gear details, honest condition notes, personal experience, fishing-specific language
- DON'T: Generic superlatives, "must-have", "don't miss out", exclamation marks

### Seller Onboarding

- DO: "You know this gear better than we do. Tell buyers what they actually need to know..."
- DON'T: "Welcome to Nessi! Complete your seller profile to start listing..."

### Marketing Emails

- DO: Seasonal, specific, understated — "It's April. The bass are shallow..."
- DON'T: Emoji-heavy, ALL CAPS, "Don't miss out — listings go fast!"

### Error Messages

- DO: Specific, honest, with a path forward
- DON'T: Error codes, generic "something went wrong", Stripe codes

### Empty States

- DO: Short headline + one helpful sentence + CTA
- DON'T: Raw "No results found" or generic marketplace language

---

## Appendix: Complete CSS Variable Declaration

```css
:root {
  /* Colors — Base Palette */
  --c-parchment: #ede0cb;
  --c-green: #1e4a40;
  --c-orange: #e27739;
  --c-maroon: #681a19;
  --c-text: #1c1c1c;
  --c-text-2: #7a6e62;
  --c-border: #d9ccba;
  --c-fill: #f0e8da;
  --c-white: #ffffff;

  /* Colors — Semantic */
  --c-success: #1a6b43;
  --c-success-bg: #d4edda;
  --c-success-border: #a8d9bc;
  --c-warning: #b86e0a;
  --c-warning-bg: #fef3dc;
  --c-warning-border: #f5d08a;
  --c-error: #b91c1c;
  --c-error-bg: #fde8e8;
  --c-error-border: #f5b5b5;
  --c-info: #1e4a40;
  --c-info-bg: #d6e9e4;
  --c-info-border: #9ecabb;

  /* Colors — Interactive States */
  --c-green-hover: #163831;
  --c-green-active: #0e2822;
  --c-orange-hover: #cc6830;
  --c-orange-active: #b55a28;

  /* Colors — CRUD */
  --c-crud-create: #1e4a40;
  --c-crud-create-bg: #d6e9e4;
  --c-crud-read: #1c1c1c;
  --c-crud-read-bg: #f0e8da;
  --c-crud-update: #e27739;
  --c-crud-update-bg: #fbe9d9;
  --c-crud-delete: #b91c1c;
  --c-crud-delete-bg: #fde8e8;

  /* Typography */
  --f-sans: 'DM Sans', system-ui, sans-serif;
  --f-serif: 'DM Serif Display', Georgia, serif;

  /* Shadows */
  --sh-xs: 0 1px 2px rgba(0, 0, 0, 0.06);
  --sh-sm: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --sh-md: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --sh-lg: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --sh-xl: 0 16px 48px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.06);
  --sh-sell: 0 4px 12px rgba(226, 119, 57, 0.45);
  --sh-focus-green: 0 0 0 3px rgba(30, 74, 64, 0.28);
  --sh-focus-orange: 0 0 0 3px rgba(226, 119, 57, 0.28);
  --sh-focus-error: 0 0 0 3px rgba(185, 28, 28, 0.22);

  /* Border Radius */
  --r-xs: 4px;
  --r-sm: 6px;
  --r-base: 8px;
  --r-md: 10px;
  --r-lg: 12px;
  --r-xl: 16px;
  --r-2xl: 24px;
  --r-pill: 999px;
  --r-circle: 50%;

  /* Motion — Durations */
  --dur-fast: 100ms;
  --dur-base: 180ms;
  --dur-slow: 300ms;
  --dur-slower: 450ms;
  --dur-slowest: 600ms;

  /* Motion — Easings */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Fixed Heights */
  --h-nav-top: 56px;
  --h-nav-bottom: 60px;
  --h-btn-lg: 52px;
  --h-btn-md: 44px;
  --h-btn-sm: 36px;
  --h-btn-xs: 28px;
  --h-input: 48px;
  --h-input-sm: 40px;
  --min-tap: 44px;

  /* Spacing */
  --sp-page: 16px;

  /* Z-Index */
  --z-sticky: 100;
  --z-filter: 150;
  --z-nav-bottom: 300;
  --z-sheet: 410;
  --z-modal: 510;
  --z-toast: 600;
}
```
