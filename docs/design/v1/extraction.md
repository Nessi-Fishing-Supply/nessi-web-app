# Nessi Design System v2.0 — Full Token Extraction

**Source:** https://0m34aamgen-7200.hosted.obvious.ai/design-system.html
**Extracted:** 2026-03-23
**Version:** v1 (first sync)

---

## Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Border Radius](#border-radius)
5. [Shadows](#shadows)
6. [Motion & Animation](#motion--animation)
7. [Z-Index Stacking Order](#z-index-stacking-order)
8. [Breakpoints](#breakpoints)
9. [Fixed Component Heights](#fixed-component-heights)
10. [Semantic Aliases](#semantic-aliases)
11. [Component Specifications](#component-specifications)

---

## Color System

Every token follows `--color-{name}-{scale}` where scale runs 100-900. Scale 500 is always the brand value. Legacy `--c-*` aliases still work but are deprecated.

### CSS Custom Properties — `:root`

```css
:root {
  /* ===== GREEN — Brand Primary ===== */
  --color-green-100: #d6e9e4;
  --color-green-200: #9ecabb;
  --color-green-300: #6bad99;
  --color-green-400: #3d8c75;
  --color-green-500: #1e4a40; /* PRIMARY */
  --color-green-600: #163831;
  --color-green-700: #0e2822;
  --color-green-800: #081812;
  --color-green-900: #030c09;

  /* ===== ORANGE — Brand Accent ===== */
  --color-orange-100: #fbe9d9;
  --color-orange-200: #f5c8a0;
  --color-orange-300: #eea86b;
  --color-orange-400: #e89048;
  --color-orange-500: #e27739; /* PRIMARY */
  --color-orange-600: #cc6830;
  --color-orange-700: #b55a28;
  --color-orange-800: #8a4018;
  --color-orange-900: #5c2a0c;

  /* ===== MAROON — Reserved & Destructive ===== */
  --color-maroon-100: #f5d0d0;
  --color-maroon-200: #e8a0a0;
  --color-maroon-300: #d47070;
  --color-maroon-400: #b84040;
  --color-maroon-500: #681a19; /* PRIMARY */
  --color-maroon-600: #551414;
  --color-maroon-700: #410f0f;
  --color-maroon-800: #2a0909;
  --color-maroon-900: #150404;

  /* ===== SAND — App Background & Surfaces ===== */
  --color-sand-100: #faf7f2;
  --color-sand-200: #f5eddf;
  --color-sand-300: #ede0cb; /* BG (parchment) */
  --color-sand-400: #e3d1b4;
  --color-sand-500: #d9ccba; /* BORDER */
  --color-sand-600: #c4b49e;
  --color-sand-700: #a89278;
  --color-sand-800: #7a6e62; /* TEXT2 */
  --color-sand-900: #4a3f35;

  /* ===== NEUTRAL — Text & UI ===== */
  --color-neutral-100: #f8f8f7;
  --color-neutral-200: #efefed;
  --color-neutral-300: #e0dfdc;
  --color-neutral-400: #c8c6c1;
  --color-neutral-500: #a09d97;
  --color-neutral-600: #78756f;
  --color-neutral-700: #524f4a;
  --color-neutral-800: #2e2c28;
  --color-neutral-900: #1c1c1c; /* TEXT */

  /* ===== WHITE ===== */
  --color-white: #ffffff;

  /* ===== SEMANTIC — Success ===== */
  --color-success-100: #d4edda;
  --color-success-200: #a8d9bc;
  --color-success-500: #1a6b43;
  --color-success-700: #0f4028;

  /* ===== SEMANTIC — Warning ===== */
  --color-warning-100: #fef3dc;
  --color-warning-200: #f5d08a;
  --color-warning-500: #b86e0a;
  --color-warning-700: #7a4706;

  /* ===== SEMANTIC — Error ===== */
  --color-error-100: #fde8e8;
  --color-error-200: #f5b5b5;
  --color-error-500: #b91c1c;
  --color-error-700: #7a1010;

  /* ===== SEMANTIC — Info ===== */
  --color-info-100: #d6e9e4;
  --color-info-200: #9ecabb;
  --color-info-500: #1e4a40;
  --color-info-700: #0e2822;
}
```

### Color Palette Tables

#### Green (Brand Primary)

| Token               | Value     | Usage                                  |
| ------------------- | --------- | -------------------------------------- |
| `--color-green-100` | `#D6E9E4` | Selected card bg, CRUD create bg       |
| `--color-green-200` | `#9ECABB` | Info semantic 200                      |
| `--color-green-300` | `#6BAD99` | —                                      |
| `--color-green-400` | `#3D8C75` | —                                      |
| `--color-green-500` | `#1E4A40` | Primary brand, nav bg, primary buttons |
| `--color-green-600` | `#163831` | Hover state                            |
| `--color-green-700` | `#0E2822` | Active/pressed state                   |
| `--color-green-800` | `#081812` | —                                      |
| `--color-green-900` | `#030C09` | —                                      |

#### Orange (Brand Accent)

| Token                | Value     | Usage                                     |
| -------------------- | --------- | ----------------------------------------- |
| `--color-orange-100` | `#FBE9D9` | CRUD update bg                            |
| `--color-orange-200` | `#F5C8A0` | —                                         |
| `--color-orange-300` | `#EEA86B` | —                                         |
| `--color-orange-400` | `#E89048` | —                                         |
| `--color-orange-500` | `#E27739` | Accent, sell FAB, card price, upgrade CTA |
| `--color-orange-600` | `#CC6830` | Hover state                               |
| `--color-orange-700` | `#B55A28` | Active/pressed state                      |
| `--color-orange-800` | `#8A4018` | —                                         |
| `--color-orange-900` | `#5C2A0C` | —                                         |

#### Maroon (Reserved & Destructive)

| Token                | Value     | Usage                        |
| -------------------- | --------- | ---------------------------- |
| `--color-maroon-100` | `#F5D0D0` | —                            |
| `--color-maroon-200` | `#E8A0A0` | —                            |
| `--color-maroon-300` | `#D47070` | —                            |
| `--color-maroon-400` | `#B84040` | —                            |
| `--color-maroon-500` | `#681A19` | Reserved/destructive primary |
| `--color-maroon-600` | `#551414` | —                            |
| `--color-maroon-700` | `#410F0F` | —                            |
| `--color-maroon-800` | `#2A0909` | —                            |
| `--color-maroon-900` | `#150404` | —                            |

#### Sand (App Background & Surfaces)

| Token              | Value     | Usage                    |
| ------------------ | --------- | ------------------------ |
| `--color-sand-100` | `#FAF7F2` | Overlay surface          |
| `--color-sand-200` | `#F5EDDF` | Raised surface, fill bg  |
| `--color-sand-300` | `#EDE0CB` | Page surface (parchment) |
| `--color-sand-400` | `#E3D1B4` | —                        |
| `--color-sand-500` | `#D9CCBA` | Border color             |
| `--color-sand-600` | `#C4B49E` | —                        |
| `--color-sand-700` | `#A89278` | —                        |
| `--color-sand-800` | `#7A6E62` | Secondary text           |
| `--color-sand-900` | `#4A3F35` | —                        |

#### Neutral (Text & UI)

| Token                 | Value     | Usage        |
| --------------------- | --------- | ------------ |
| `--color-neutral-100` | `#F8F8F7` | —            |
| `--color-neutral-200` | `#EFEFED` | —            |
| `--color-neutral-300` | `#E0DFDC` | —            |
| `--color-neutral-400` | `#C8C6C1` | —            |
| `--color-neutral-500` | `#A09D97` | —            |
| `--color-neutral-600` | `#78756F` | —            |
| `--color-neutral-700` | `#524F4A` | —            |
| `--color-neutral-800` | `#2E2C28` | —            |
| `--color-neutral-900` | `#1C1C1C` | Primary text |

#### Semantic Colors

| Category | 100       | 200       | 500       | 700       |
| -------- | --------- | --------- | --------- | --------- |
| Success  | `#D4EDDA` | `#A8D9BC` | `#1A6B43` | `#0F4028` |
| Warning  | `#FEF3DC` | `#F5D08A` | `#B86E0A` | `#7A4706` |
| Error    | `#FDE8E8` | `#F5B5B5` | `#B91C1C` | `#7A1010` |
| Info     | `#D6E9E4` | `#9ECABB` | `#1E4A40` | `#0E2822` |

### Surface Tokens

| Token                | Value                    | Usage                           |
| -------------------- | ------------------------ | ------------------------------- |
| `--surface-page`     | `var(--color-sand-300)`  | Main page background            |
| `--surface-raised`   | `var(--color-sand-200)`  | Cards, elevated surfaces        |
| `--surface-overlay`  | `var(--color-sand-100)`  | Overlays, popovers              |
| `--surface-sunken`   | `var(--color-sand-400)`  | Inset areas                     |
| `--surface-nav`      | `var(--color-green-500)` | Navigation background           |
| `--surface-nav-pill` | `rgba(237,224,203,0.82)` | Bottom nav pill (frosted glass) |

### Interactive State Mapping

| State          | Green Token                                               | Orange Token            | Notes                           |
| -------------- | --------------------------------------------------------- | ----------------------- | ------------------------------- |
| Default        | `--color-green-500`                                       | `--color-orange-500`    | Resting state                   |
| Hover          | `--color-green-600`                                       | `--color-orange-600`    | cursor:pointer                  |
| Active/Pressed | `--color-green-700`                                       | `--color-orange-700`    | scale(0.98)                     |
| Focus          | `--shadow-focus-green`                                    | `--shadow-focus-orange` | outline:none + box-shadow       |
| Disabled       | opacity:0.38, cursor:not-allowed                          | —                       | Never change color, use opacity |
| Loading        | opacity:0.7, cursor:wait                                  | —                       | Spinner replaces label          |
| Error          | `--color-error-500` border + `--shadow-focus-error`       | —                       | Inputs only                     |
| Success        | `--color-success-500` border                              | —                       | Inputs: valid state             |
| Selected       | `--color-green-500` border (2px) + `--color-green-100` bg | —                       | Cards, options, pills           |

---

## Typography

Two fonts. **DM Sans** for all functional UI. **DM Serif Display** for editorial moments only.

### CSS Custom Properties

```css
:root {
  /* Font Families */
  --font-family-sans: 'DM Sans', system-ui, sans-serif;
  --font-family-serif: 'DM Serif Display', Georgia, serif;

  /* Font Sizes (fixed px values, not modular scale) */
  --font-size-100: 9px;
  --font-size-200: 10px;
  --font-size-300: 11px;
  --font-size-400: 12px;
  --font-size-500: 13px;
  --font-size-600: 14px;
  --font-size-700: 15px;
  --font-size-800: 17px;
  --font-size-900: 20px;
  --font-size-1000: 22px;
  --font-size-1100: 24px;
  --font-size-1200: 28px;
  --font-size-1300: 32px;
  --font-size-1400: 40px;
  --font-size-1500: 48px;

  /* Font Weights */
  --font-weight-300: 300; /* Light */
  --font-weight-400: 400; /* Regular */
  --font-weight-500: 500; /* Medium */
  --font-weight-600: 600; /* SemiBold */
  --font-weight-700: 700; /* Bold */

  /* Line Heights */
  --line-height-100: 1.2; /* Display heads (--lh-tight) */
  --line-height-200: 1.3; /* (--lh-snug) */
  --line-height-300: 1.45; /* (--lh-normal) */
  --line-height-400: 1.6; /* (--lh-relaxed) */
  --line-height-500: 1.8; /* (--lh-loose) */

  /* Letter Spacing */
  --letter-spacing-100: -0.02em;
  --letter-spacing-200: 0em;
  --letter-spacing-300: 0.04em;
  --letter-spacing-400: 0.06em;
  --letter-spacing-500: 0.08em;
}
```

### Full Type Scale

| Size | Preview                   | Font             | Weight         | Line Height | Letter Spacing | Usage                                                          |
| ---- | ------------------------- | ---------------- | -------------- | ----------- | -------------- | -------------------------------------------------------------- |
| 48px | "Just Listed"             | DM Serif Display | 400            | 1.2         | —              | Hero editorial headers only                                    |
| 40px | "Maker Spotlight"         | DM Serif Display | 400            | 1.2         | —              | Large editorial section headers                                |
| 32px | "Condition"               | DM Serif Display | 400            | 1.25        | —              | Section titles on listing detail, shop pages                   |
| 28px | "$140"                    | DM Sans          | 700 (Bold)     | 1.25        | —              | Listing price in detail header. Always --c-text, never orange. |
| 24px | "$131.60"                 | DM Sans          | 700 (Bold)     | 1.3         | —              | Fee calculator net payout, offer amount                        |
| 22px | "Shimano Stradic FL 2500" | DM Sans          | 600 (SemiBold) | 1.25        | —              | Listing detail title (DM Sans, not Serif)                      |
| 20px | "More from Caleb"         | DM Serif Display | 400            | 1.3         | —              | In-page section headers                                        |
| 17px | "Caleb's Gear Lab"        | DM Sans          | 600 (SemiBold) | 1.35        | —              | Shop name, profile name, modal title                           |
| 15px | Body copy                 | DM Sans          | 400 (Regular)  | 1.5         | —              | Body copy, inputs, seller name, nav search                     |
| 14px | Description               | DM Sans          | 400 (Regular)  | 1.65        | —              | Listing description, long-form copy                            |
| 13px | "Ships from Tennessee"    | DM Sans          | 400 (Regular)  | 1.5         | —              | Metadata, helper text, secondary body                          |
| 12px | "LISTING TITLE"           | DM Sans          | 600 (SemiBold) | —           | +0.05em        | Form field labels, eyebrows (uppercase)                        |
| 11px | "RiverGuide Crafts"       | DM Sans          | 400 (Regular)  | 1.5         | —              | Card seller line, timestamps                                   |
| 10px | "GEAR RATIO"              | DM Sans          | 600 (SemiBold) | —           | +0.07em        | Spec table keys, nav tab labels (uppercase)                    |
| 9px  | "VERY GOOD"               | DM Sans          | 500 (Medium)   | —           | +0.05em        | Condition badges and status pills only (uppercase)             |

### Font Weight Aliases

| Weight   | Value | Alias          |
| -------- | ----- | -------------- |
| Light    | 300   | `--w-light`    |
| Regular  | 400   | `--w-regular`  |
| Medium   | 500   | `--w-medium`   |
| SemiBold | 600   | `--w-semibold` |
| Bold     | 700   | `--w-bold`     |

### Line Height Aliases

| Value | Alias          | Usage              |
| ----- | -------------- | ------------------ |
| 1.20  | `--lh-tight`   | Display heads      |
| 1.35  | `--lh-snug`    | Card titles, UI    |
| 1.50  | `--lh-normal`  | Body default       |
| 1.65  | `--lh-relaxed` | Long descriptions  |
| 1.80  | `--lh-loose`   | Instructional copy |

### Serif Usage Rules

**Serif IS used for:** Section headers ("Condition", "More from Caleb", "Similar Gear", "Just Listed", "Maker Spotlight"). Empty state headlines. The Nessi wordmark.

**NEVER serif on:** Listing titles. Any price. Navigation labels. Buttons. Form labels or inputs. Filter chips. Condition badges. Spec values. Error messages. Anywhere interactive.

---

## Spacing & Layout

4px base grid. All spacing values are multiples of 4.

### CSS Custom Properties

```css
:root {
  --spacing-100: 4px;
  --spacing-200: 8px;
  --spacing-300: 12px;
  --spacing-400: 16px;
  --spacing-500: 20px;
  --spacing-600: 24px;
  --spacing-700: 32px;
  --spacing-800: 40px;
  --spacing-900: 48px;
  --spacing-1000: 64px;

  /* Page Margins */
  --spacing-page-sm: 16px;
  --spacing-page-md: 24px;
  --spacing-page-lg: 40px;
}
```

### Spacing Scale Table

| Token            | Value | Notes                                                                           |
| ---------------- | ----- | ------------------------------------------------------------------------------- |
| `--spacing-100`  | 4px   | Smallest unit                                                                   |
| `--spacing-200`  | 8px   | Browse grid gap, card gaps                                                      |
| `--spacing-300`  | 12px  | Purchase bar vertical padding                                                   |
| `--spacing-400`  | 16px  | Page horizontal padding (mobile), seller card padding, form group bottom margin |
| `--spacing-500`  | 20px  | Bottom sheet side padding                                                       |
| `--spacing-600`  | 24px  | Bottom sheet bottom padding, page padding (md)                                  |
| `--spacing-700`  | 32px  | —                                                                               |
| `--spacing-800`  | 40px  | Page padding (lg)                                                               |
| `--spacing-900`  | 48px  | —                                                                               |
| `--spacing-1000` | 64px  | —                                                                               |

### Component Spacing Reference

| Component                      | Spacing                           |
| ------------------------------ | --------------------------------- |
| Page horizontal padding        | `--spacing-page-sm`: 16px         |
| Browse grid gap (3-col mobile) | 8px between cards                 |
| Card metadata row gap          | 3px between rows                  |
| Seller card internal padding   | 16px all sides                    |
| Sticky purchase bar padding    | 12px vertical, 16px horizontal    |
| Form group bottom margin       | 16px                              |
| Modal internal padding         | 28px                              |
| Bottom sheet padding           | 16px top, 20px sides, 24px bottom |

---

## Border Radius

### CSS Custom Properties

```css
:root {
  --radius-100: 4px;
  --radius-200: 6px;
  --radius-300: 8px;
  --radius-400: 10px;
  --radius-500: 12px;
  --radius-600: 16px;
  --radius-700: 24px;
  --radius-800: 999px;
  --radius-circle: 50%;
}
```

### Radius Scale Table

| Token             | Value | Alias        | Usage             |
| ----------------- | ----- | ------------ | ----------------- |
| `--radius-100`    | 4px   | `--r-xs`     | Micro tags        |
| `--radius-200`    | 6px   | `--r-sm`     | Small button      |
| `--radius-300`    | 8px   | `--r-base`   | Photo/thumbnail   |
| `--radius-400`    | 10px  | `--r-md`     | Cards, inputs     |
| `--radius-500`    | 12px  | `--r-lg`     | Sheet top corners |
| `--radius-600`    | 16px  | `--r-xl`     | Modal             |
| `--radius-700`    | 24px  | `--r-2xl`    | Sheet edge        |
| `--radius-800`    | 999px | `--r-pill`   | All pills         |
| `--radius-circle` | 50%   | `--r-circle` | Avatar, FAB       |

---

## Shadows

Warm, subtle shadows -- never cool blue-grey. Shadow is proportional to elevation.

### CSS Custom Properties

```css
:root {
  --shadow-100: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-200: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-300: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-400: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --shadow-500: 0 16px 48px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.06);

  /* Special Shadows */
  --shadow-sell: 0 4px 12px rgba(226, 119, 57, 0.45);
  --shadow-focus-green: 0 0 0 3px rgba(30, 74, 64, 0.28);
  --shadow-focus-orange: 0 0 0 3px rgba(226, 119, 57, 0.28);
  --shadow-focus-error: 0 0 0 3px rgba(185, 28, 28, 0.22);
}
```

### Shadow Scale Table

| Token                   | Alias               | Value                                                       | Usage                         |
| ----------------------- | ------------------- | ----------------------------------------------------------- | ----------------------------- |
| `--shadow-100`          | `--sh-xs`           | `0 1px 2px rgba(0,0,0,0.06)`                                | Filter chips                  |
| `--shadow-200`          | `--sh-sm`           | `0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`    | Seller card                   |
| `--shadow-300`          | `--sh-md`           | `0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)`   | Toast                         |
| `--shadow-400`          | `--sh-lg`           | `0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)`   | Bottom sheet                  |
| `--shadow-500`          | `--sh-xl`           | `0 16px 48px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.06)` | Modal                         |
| `--shadow-sell`         | `--sh-sell`         | `0 4px 12px rgba(226,119,57,0.45)`                          | Sell FAB only                 |
| `--shadow-focus-green`  | `--sh-focus-green`  | `0 0 0 3px rgba(30,74,64,0.28)`                             | Primary inputs, green buttons |
| `--shadow-focus-orange` | `--sh-focus-orange` | `0 0 0 3px rgba(226,119,57,0.28)`                           | Orange button focus           |
| `--shadow-focus-error`  | `--sh-focus-error`  | `0 0 0 3px rgba(185,28,28,0.22)`                            | Error inputs                  |

---

## Motion & Animation

Nessi moves fast and feels physical. Animations should feel like the gear -- purposeful, quick, no flourish.

### CSS Custom Properties

```css
:root {
  /* Duration Tokens */
  --duration-100: 100ms; /* Button hover, icon color, tab active, pill selection */
  --duration-200: 180ms; /* Default -- card hover, input focus, accordion, toggle */
  --duration-300: 300ms; /* Page transitions, bottom sheet open, condition track */
  --duration-400: 450ms; /* Modal entrance, toast slide-in */
  --duration-500: 600ms; /* Skeleton shimmer cycle, progress bars, photo cross-fade */

  /* Easing Tokens */
  --easing-out: cubic-bezier(0.16, 1, 0.3, 1); /* Default for almost all UI */
  --easing-in: cubic-bezier(0.4, 0, 1, 1); /* Exit and dismissal only */
  --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Micro-interactions with overshoot */
  --easing-linear: linear; /* Progress bars, skeleton shimmer */
}
```

### Duration Scale

| Token            | Value | Alias           | Usage                                                   |
| ---------------- | ----- | --------------- | ------------------------------------------------------- |
| `--duration-100` | 100ms | `--dur-fast`    | Button hover, icon color, tab active, pill selection    |
| `--duration-200` | 180ms | `--dur-base`    | Default -- card hover, input focus, accordion, toggle   |
| `--duration-300` | 300ms | `--dur-slow`    | Page transitions, bottom sheet open, condition track    |
| `--duration-400` | 450ms | `--dur-slower`  | Modal entrance, toast slide-in                          |
| `--duration-500` | 600ms | `--dur-slowest` | Skeleton shimmer cycle, progress bars, photo cross-fade |

### Easing Curves

| Token             | Value                               | Alias           | Usage                             |
| ----------------- | ----------------------------------- | --------------- | --------------------------------- |
| `--easing-out`    | `cubic-bezier(0.16, 1, 0.3, 1)`     | `--ease-out`    | Default for almost all UI         |
| `--easing-in`     | `cubic-bezier(0.4, 0, 1, 1)`        | `--ease-in`     | Exit and dismissal only           |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | `--ease-spring` | Micro-interactions with overshoot |
| `--easing-linear` | `linear`                            | —               | Progress bars, skeleton shimmer   |

---

## Z-Index Stacking Order

Never use arbitrary z-index values.

### CSS Custom Properties

```css
:root {
  --z-100: 0; /* base: Normal flow */
  --z-200: 10; /* raised: Card hover */
  --z-300: 20; /* — */
  --z-400: 100; /* sticky: Top nav, filter strip */
  --z-500: 150; /* filter: Filter strip */
  --z-600: 300; /* nav-bottom: Bottom tab bar */
  --z-700: 400; /* sheet-backdrop: Sheet dim backdrop */
  --z-800: 410; /* sheet: Bottom sheet panel */
  --z-900: 500; /* modal-backdrop: Modal dim backdrop */
  --z-1000: 510; /* modal: Modal panel */
  --z-1100: 600; /* toast: Toasts -- above modals */
  --z-1200: 700; /* tooltip: Always topmost */
}
```

### Z-Index Aliases

| Alias            | Points to  | Value | Usage                 |
| ---------------- | ---------- | ----- | --------------------- |
| `--z-sticky`     | `--z-400`  | 100   | Top nav, filter strip |
| `--z-filter`     | `--z-500`  | 150   | Filter strip          |
| `--z-nav-bottom` | `--z-600`  | 300   | Bottom tab bar        |
| `--z-sheet`      | `--z-800`  | 410   | Bottom sheet panel    |
| `--z-modal`      | `--z-1000` | 510   | Modal panel           |
| `--z-toast`      | `--z-1100` | 600   | Toasts                |

---

## Breakpoints

Mobile-first. Base CSS targets 375px. Desktop overrides: `@media (min-width: 1024px)`. Never use device names or orientation -- only viewport width.

| Token | Value  | Name | Notes                                                                  |
| ----- | ------ | ---- | ---------------------------------------------------------------------- |
| —     | 320px  | xs   | Small phones. All layouts must work. No horizontal overflow.           |
| —     | 375px  | sm   | Primary design target (iPhone 14). 3-column card grid. Bottom tab bar. |
| —     | 768px  | md   | Tablet. 4-column grid. Bottom nav persists. Sidebar layouts emerge.    |
| —     | 1024px | lg   | Desktop. Top nav replaces bottom nav. Category pill row.               |
| —     | 1280px | xl   | Large desktop. Max content width 1200px centered.                      |

---

## Fixed Component Heights

```css
:root {
  --height-nav-top: 56px;
  --height-nav-bottom: 60px; /* + env(safe-area-inset-bottom) */
  --height-filter-strip: 40px;
  --height-btn-lg: 52px;
  --height-btn-md: 44px;
  --height-btn-sm: 36px;
  --height-btn-xs: 28px;
  --height-input: 48px;
  --height-input-sm: 40px;
  --height-purchase-bar: 80px; /* + safe-area-inset-bottom */
  --min-touch-target: 44px;
}
```

### Height Aliases

| Alias            | Points to             | Value |
| ---------------- | --------------------- | ----- |
| `--h-nav-top`    | `--height-nav-top`    | 56px  |
| `--h-nav-bottom` | `--height-nav-bottom` | 60px  |
| `--h-btn-lg`     | `--height-btn-lg`     | 52px  |
| `--h-btn-md`     | `--height-btn-md`     | 44px  |
| `--h-btn-sm`     | `--height-btn-sm`     | 36px  |
| `--h-btn-xs`     | `--height-btn-xs`     | 28px  |
| `--h-input`      | `--height-input`      | 48px  |
| `--h-input-sm`   | `--height-input-sm`   | 40px  |
| `--min-tap`      | `--min-touch-target`  | 44px  |

---

## Semantic Aliases (Deprecated `--c-*` layer)

These are convenience aliases that map to the primitive tokens above. The design system notes these are deprecated in favor of direct primitive usage, but they are still defined.

### Color Aliases

```css
:root {
  --c-parchment: var(--color-sand-300);
  --c-green: var(--color-green-500);
  --c-orange: var(--color-orange-500);
  --c-maroon: var(--color-maroon-500);
  --c-text: var(--color-neutral-900);
  --c-text-2: var(--color-sand-800);
  --c-border: var(--color-sand-500);
  --c-fill: var(--color-sand-200);
  --c-white: var(--color-white);

  /* Semantic System Aliases */
  --c-success: var(--color-success-500);
  --c-success-bg: var(--color-success-100);
  --c-success-border: var(--color-success-200);
  --c-warning: var(--color-warning-500);
  --c-warning-bg: var(--color-warning-100);
  --c-warning-border: var(--color-warning-200);
  --c-error: var(--color-error-500);
  --c-error-bg: var(--color-error-100);
  --c-error-border: var(--color-error-200);
  --c-info: var(--color-info-500);
  --c-info-bg: var(--color-info-100);
  --c-info-border: var(--color-info-200);

  /* Interactive State Aliases */
  --c-green-hover: var(--color-green-600);
  --c-green-active: var(--color-green-700);
  --c-orange-hover: var(--color-orange-600);
  --c-orange-active: var(--color-orange-700);

  /* CRUD Aliases */
  --c-crud-create: var(--color-green-500);
  --c-crud-create-bg: var(--color-green-100);
  --c-crud-update: var(--color-orange-500);
  --c-crud-update-bg: var(--color-orange-100);
  --c-crud-delete: var(--color-error-500);
  --c-crud-delete-bg: var(--color-error-100);
}
```

### Other Aliases

```css
:root {
  /* Font Aliases */
  --f-sans: var(--font-family-sans);
  --f-serif: var(--font-family-serif);

  /* Shadow Aliases */
  --sh-xs: var(--shadow-100);
  --sh-sm: var(--shadow-200);
  --sh-md: var(--shadow-300);
  --sh-lg: var(--shadow-400);
  --sh-xl: var(--shadow-500);
  --sh-sell: var(--shadow-sell);
  --sh-focus-green: var(--shadow-focus-green);
  --sh-focus-orange: var(--shadow-focus-orange);
  --sh-focus-error: var(--shadow-focus-error);

  /* Radius Aliases */
  --r-xs: var(--radius-100);
  --r-sm: var(--radius-200);
  --r-base: var(--radius-300);
  --r-md: var(--radius-400);
  --r-lg: var(--radius-500);
  --r-xl: var(--radius-600);
  --r-2xl: var(--radius-700);
  --r-pill: var(--radius-800);
  --r-circle: var(--radius-circle);

  /* Duration Aliases */
  --dur-fast: var(--duration-100);
  --dur-base: var(--duration-200);
  --dur-slow: var(--duration-300);
  --dur-slower: var(--duration-400);
  --dur-slowest: var(--duration-500);

  /* Easing Aliases */
  --ease-out: var(--easing-out);
  --ease-in: var(--easing-in);
  --ease-spring: var(--easing-spring);

  /* Spacing Page Alias */
  --sp-page: var(--spacing-page-sm);
}
```

---

## Component Specifications

### Buttons

Four variants x four sizes x nine states.

**Variants:** Primary (Green), Ghost (Outlined), Orange (Accent/Sell), Ghost Parchment (on dark surfaces)

**Sizes:**

- Large: 52px (`--height-btn-lg`) -- Purchase bar
- Medium: 44px (`--height-btn-md`) -- Default
- Small: 36px (`--height-btn-sm`) -- Inline/cards
- XS: 28px (`--height-btn-xs`) -- Admin/badges

**States:** Default, Hover, Active, Focus, Disabled, Loading, Success, Destructive

**Icon Buttons:** All must have min 44x44px touch target even if visually smaller.

**Breakpoint behavior:**

- Mobile (<768px): Full-width. Sticky in purchase bar.
- Tablet (768-1023px): Side by side. 48px height.
- Desktop (1024px+): Fixed width, right-aligned. In sticky sidebar.

### Form Inputs

48px height, `--c-fill` background, 1px `--c-border`, 10px radius. Validation on blur -- never on submit. Focus: green border + white bg + shadow ring.

**States:** Default, Hover (border darkens), Focus, Success, Error, Disabled, Read-only

**Variants:** Standard, With prefix ($), With suffix (inches), Select/Dropdown, Textarea, Small input (40px)

### Product Cards

No white background. No border. No shadow. Photo is the card -- metadata floats on parchment below it.

- 1:1 square photo, 8px radius, dark letterbox bg
- Price: 14px SemiBold `--c-orange`
- Title: 13px Regular, max 2 lines
- Seller: 11px `--c-text-2`
- SHOP pill inline after seller name
- Watch icon: frosted glass circle, top-right
- No buy button -- whole card is the tap target

### Seller Card

White surface (one of the few white surfaces in the app).

- White bg, 10px radius, 1px `--c-border`, 16px padding
- Stats row: `--c-fill` bg
- Message btn: 28px xs green
- Shop avatar: 2px `--c-orange` ring

### Bottom Navigation Bar

```css
.bnav-pill {
  background: rgba(237, 224, 203, 0.82);
  backdrop-filter: blur(20px) saturate(1.4);
  border-radius: 999px;
  border: 1px solid rgba(217, 204, 186, 0.6);
  height: 64px;
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom));
  width: calc(100% - 32px);
  max-width: 440px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.12),
    0 1px 4px rgba(0, 0, 0, 0.06);
  z-index: var(--z-nav-bottom);
}
```

### Modals & Bottom Sheets

- **Scrim:** rgba(28,28,28,0.48) -- never pure black
- **Surface:** var(--c-parchment) -- never white, never green
- **Bottom sheet radius:** 16px top corners
- **Centered modal radius:** 12px all corners
- **Handle:** 36x4px pill, var(--c-border), centered 8px from top
- **Animation:** Bottom sheet: slide up 300ms ease-out. Modal: fade+scale(0.96->1) 180ms ease-out.

### Toast Notifications

- Non-blocking, top-center mobile, bottom-right desktop
- Auto-dismiss 4s, action toasts persist until dismissed
- Z-index: 600
- Variants: Success (green), Error (red), Warning (orange), Info (blue/green)

### Avatars

- Circular, show initials when no photo
- Sizes: lg (48px), md (40px), sm (32px), xs (24px)
- Shop owners: 2px `--c-orange` border ring
- Gradient is deterministic per user -- never random on re-render

### Condition Badges

- 6 tiers: New (Unfished), Excellent, Very Good, Good, Fair, For Parts / As-Is
- 9px on photo overlay, 11px in condition section
- Always uppercase
- Positioned: absolute bottom:8px left:8px z:2 on cards

### Pills & Badges

- All pills: 999px radius, DM Sans Medium, uppercase, +0.05em tracking
- Condition badges, listing status pills, shop pills, filter chips, member badges
- SHOP pill: always --c-orange fill / white text
