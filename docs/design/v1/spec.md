# Design System Implementation Spec — v1

**Generated:** 2026-03-23
**Source:** https://0m34aamgen-7200.hosted.obvious.ai/design-system.html (v2.0)
**Status:** Approved

---

## Naming Convention

All tokens use **semantic role names with numeric scales**. No raw color names (no `--color-green-*`), no semantic aliases (no `--z-modal`).

Pattern: `--{category}-{role}-{scale}` or `--{category}-{scale}`

---

## 1. Colors

### 1a. Brand Palettes

```scss
:root {
  // Primary (Green)
  --color-primary-100: #d6e9e4;
  --color-primary-200: #9ecabb;
  --color-primary-300: #6bad99;
  --color-primary-400: #3d8c75;
  --color-primary-500: #1e4a40;
  --color-primary-600: #163831;
  --color-primary-700: #0e2822;
  --color-primary-800: #081812;
  --color-primary-900: #030c09;

  // Accent (Orange)
  --color-accent-100: #fbe9d9;
  --color-accent-200: #f5c8a0;
  --color-accent-300: #eea86b;
  --color-accent-400: #e89048;
  --color-accent-500: #e27739;
  --color-accent-600: #cc6830;
  --color-accent-700: #b55a28;
  --color-accent-800: #8a4018;
  --color-accent-900: #5c2a0c;

  // Surface (Sand)
  --color-surface-100: #faf7f2;
  --color-surface-200: #f5eddf;
  --color-surface-300: #ede0cb;
  --color-surface-400: #e3d1b4;
  --color-surface-500: #d9ccba;
  --color-surface-600: #c4b49e;
  --color-surface-700: #a89278;
  --color-surface-800: #7a6e62;
  --color-surface-900: #4a3f35;

  // Destructive (Maroon)
  --color-destructive-100: #f5d0d0;
  --color-destructive-200: #e8a0a0;
  --color-destructive-300: #d47070;
  --color-destructive-400: #b84040;
  --color-destructive-500: #681a19;
  --color-destructive-600: #551414;
  --color-destructive-700: #410f0f;
  --color-destructive-800: #2a0909;
  --color-destructive-900: #150404;

  // Neutral (Text & UI)
  --color-neutral-100: #f8f8f7;
  --color-neutral-200: #efefed;
  --color-neutral-300: #e0dfdc;
  --color-neutral-400: #c8c6c1;
  --color-neutral-500: #a09d97;
  --color-neutral-600: #78756f;
  --color-neutral-700: #524f4a;
  --color-neutral-800: #2e2c28;
  --color-neutral-900: #1c1c1c;

  // White (kept)
  --color-white: #ffffff;
}
```

### 1b. Semantic Colors (4-shade scales)

```scss
:root {
  // Success
  --color-success-100: #d4edda;
  --color-success-200: #a8d9bc;
  --color-success-500: #1a6b43;
  --color-success-700: #0f4028;

  // Warning
  --color-warning-100: #fef3dc;
  --color-warning-200: #f5d08a;
  --color-warning-500: #b86e0a;
  --color-warning-700: #7a4706;

  // Error
  --color-error-100: #fde8e8;
  --color-error-200: #f5b5b5;
  --color-error-500: #b91c1c;
  --color-error-700: #7a1010;

  // Info
  --color-info-100: #d6e9e4;
  --color-info-200: #9ecabb;
  --color-info-500: #1e4a40;
  --color-info-700: #0e2822;
}
```

### 1c. Surface Tokens

```scss
:root {
  --surface-page: var(--color-surface-300);
  --surface-raised: var(--color-surface-200);
  --surface-overlay: var(--color-surface-100);
  --surface-sunken: var(--color-surface-400);
  --surface-nav: var(--color-primary-500);
}
```

### 1d. Token Migration Map — Colors

| Old Token                  | New Token                 | Notes                                                       |
| -------------------------- | ------------------------- | ----------------------------------------------------------- |
| `--color-primary`          | `--color-primary-500`     | Same value (#1E4A40)                                        |
| `--color-primary--light`   | `--color-primary-400`     | Value changes: #2f7464 → #3D8C75                            |
| `--color-primary--dark`    | `--color-primary-700`     | Value changes: #122b25 → #0E2822                            |
| `--color-secondary`        | `--color-accent-500`      | Same value (#E27739)                                        |
| `--color-secondary--light` | `--color-accent-300`      | Value changes: #ea9d71 → #EEA86B                            |
| `--color-secondary--dark`  | `--color-accent-600`      | Value changes: #c35a1d → #CC6830                            |
| `--color-tertiary`         | `--color-destructive-500` | Same value (#681A19)                                        |
| `--color-tertiary--light`  | `--color-destructive-400` | Value changes: #942624 → #B84040                            |
| `--color-tertiary--dark`   | `--color-destructive-600` | Value changes: #521514 → #551414                            |
| `--color-off-white`        | `--color-surface-300`     | Same value (#EDE0CB)                                        |
| `--color-light`            | `--color-surface-100`     | Value changes: #fff9f0 → #FAF7F2                            |
| `--color-cream`            | Remove                    | No equivalent; use `--color-surface-100` or `--color-white` |
| `--color-dark`             | `--color-neutral-900`     | Value changes: #252422 → #1C1C1C                            |
| `--color-black`            | Remove                    | Use `--color-neutral-900`                                   |
| `--color-gray-50`          | `--color-neutral-100`     | Value changes: #f2f2f2 → #F8F8F7 (warm)                     |
| `--color-gray-100`         | `--color-neutral-200`     | Value changes: #e6e6e6 → #EFEFED (warm)                     |
| `--color-gray-200`         | `--color-neutral-300`     | Value changes: #ccc → #E0DFDC (warm)                        |
| `--color-gray-300`         | `--color-neutral-400`     | Value changes: #b3b3b3 → #C8C6C1 (warm)                     |
| `--color-gray-400`         | `--color-neutral-500`     | Value changes: #999 → #A09D97 (warm)                        |
| `--color-gray-500`         | `--color-neutral-500`     | Value changes: #808080 → #A09D97 (warm)                     |
| `--color-gray-600`         | `--color-neutral-600`     | Value changes: #666 → #78756F (warm)                        |
| `--color-gray-700`         | `--color-neutral-700`     | Value changes: #4d4d4d → #524F4A (warm)                     |
| `--color-gray-800`         | `--color-neutral-800`     | Value changes: #333 → #2E2C28 (warm)                        |
| `--color-gray-900`         | `--color-neutral-900`     | Value changes: #1a1a1a → #1C1C1C (warm)                     |
| `--color-success-500`      | `--color-success-500`     | Value changes: #22c55e → #1A6B43                            |
| `--color-success-200`      | `--color-success-200`     | Value changes: #bbf7d0 → #A8D9BC                            |
| `--color-success-700`      | `--color-success-700`     | Value changes: #15803d → #0F4028                            |
| `--color-success-50`       | `--color-success-100`     | Renamed + value changes                                     |
| `--color-success-900`      | Remove                    | No 900 in DS                                                |
| `--color-success-400`      | Remove                    | No 400 in DS                                                |
| `--color-success`          | `--color-success-500`     | Shorthand removed                                           |
| `--color-error-500`        | `--color-error-500`       | Value changes: #ef4444 → #B91C1C                            |
| `--color-error-200`        | `--color-error-200`       | Value changes: #fecaca → #F5B5B5                            |
| `--color-error-700`        | `--color-error-700`       | Value changes: #b91c1c → #7A1010                            |
| `--color-error-50`         | `--color-error-100`       | Renamed + value changes                                     |
| `--color-error-900`        | Remove                    | No 900 in DS                                                |
| `--color-error`            | `--color-error-500`       | Shorthand removed                                           |
| `--color-warning`          | `--color-warning-500`     | Value changes: #f80 → #B86E0A                               |
| `--color-white`            | `--color-white`           | Unchanged                                                   |

---

## 2. Typography

### 2a. Font Families

```scss
:root {
  --font-family-sans: 'DM Sans', system-ui, sans-serif;
  --font-family-serif: 'DM Serif Display', Georgia, serif;
}
```

Replaces `--font-family-primary: var(--font-inter)`. Update `next/font` config to load DM Sans + DM Serif Display instead of Inter.

### 2b. Font Sizes (fixed + responsive for 1200+)

```scss
:root {
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
  --font-size-1200: 24px; // scales to 28px at md
  --font-size-1300: 28px; // scales to 32px at md
  --font-size-1400: 32px; // scales to 40px at md
  --font-size-1500: 40px; // scales to 48px at md
}

@media (min-width: 768px) {
  :root {
    --font-size-1200: 28px;
    --font-size-1300: 32px;
    --font-size-1400: 40px;
    --font-size-1500: 48px;
  }
}
```

### 2c. Font Weights

```scss
:root {
  --font-weight-300: 300;
  --font-weight-400: 400;
  --font-weight-500: 500;
  --font-weight-600: 600;
  --font-weight-700: 700;
}
```

### 2d. Line Heights

```scss
:root {
  --line-height-100: 1.2;
  --line-height-200: 1.3;
  --line-height-300: 1.45;
  --line-height-400: 1.6;
  --line-height-500: 1.8;
}
```

### 2e. Letter Spacing

```scss
:root {
  --letter-spacing-100: -0.02em;
  --letter-spacing-200: 0em;
  --letter-spacing-300: 0.04em;
  --letter-spacing-400: 0.06em;
  --letter-spacing-500: 0.08em;
}
```

### 2f. Token Migration Map — Typography

| Old Token               | New Token                 | Notes                    |
| ----------------------- | ------------------------- | ------------------------ |
| `--font-family-primary` | `--font-family-sans`      | Inter → DM Sans          |
| (none)                  | `--font-family-serif`     | New — DM Serif Display   |
| `--font-size-base`      | Remove                    | Use explicit size tokens |
| `--font-scale-ratio`    | Remove                    | Modular scale removed    |
| `--font-size-xs`        | `--font-size-200` (10px)  | Was calc-based           |
| `--font-size-sm`        | `--font-size-500` (13px)  | Was calc-based           |
| `--font-size-md`        | `--font-size-800` (17px)  | Was calc-based           |
| `--font-size-lg`        | `--font-size-900` (20px)  | Was calc-based           |
| `--font-size-xl`        | `--font-size-1000` (22px) | Was calc-based           |
| `--font-size-2xl`       | `--font-size-1100` (24px) | Was calc-based           |
| `--font-size-3xl`       | `--font-size-1300` (32px) | Was calc-based           |
| `--font-size-4xl`       | `--font-size-1400` (40px) | Was calc-based           |

---

## 3. Spacing

```scss
:root {
  --spacing-50: 2px; // Extra (kept from codebase)
  --spacing-100: 4px;
  --spacing-200: 8px;
  --spacing-300: 12px;
  --spacing-400: 16px;
  --spacing-500: 20px; // New
  --spacing-600: 24px;
  --spacing-700: 32px;
  --spacing-800: 40px;
  --spacing-900: 48px;
  --spacing-1000: 64px;
  --spacing-1100: 80px; // Extra (kept from codebase)
  --spacing-1200: 160px; // Extra (kept from codebase)

  // Page margins
  --spacing-page-sm: 16px;
  --spacing-page-md: 24px;
  --spacing-page-lg: 40px;
}
```

### Token Migration Map — Spacing

| Old Token      | New Token        | Notes                 |
| -------------- | ---------------- | --------------------- |
| `--space-3xs`  | `--spacing-50`   | 2px (kept as extra)   |
| `--space-2xs`  | `--spacing-100`  | 4px                   |
| `--space-xs`   | `--spacing-200`  | 8px                   |
| `--space-sm`   | `--spacing-300`  | 12px                  |
| `--space-base` | `--spacing-400`  | 16px                  |
| `--space-md`   | `--spacing-600`  | 24px                  |
| `--space-lg`   | `--spacing-700`  | 32px                  |
| `--space-xl`   | `--spacing-800`  | 40px                  |
| `--space-2xl`  | `--spacing-900`  | 48px                  |
| `--space-3xl`  | `--spacing-1000` | 64px                  |
| `--space-4xl`  | `--spacing-1100` | 80px (kept as extra)  |
| `--space-5xl`  | `--spacing-1200` | 160px (kept as extra) |

---

## 4. Border Radius

```scss
:root {
  --radius-100: 4px;
  --radius-200: 6px; // New
  --radius-300: 8px;
  --radius-400: 10px; // New
  --radius-500: 12px; // New
  --radius-600: 16px;
  --radius-700: 24px;
  --radius-800: 999px; // New — pill
  --radius-circle: 50%; // New — avatar/FAB
}
```

### Token Migration Map — Radius

| Old Token      | New Token      | Notes        |
| -------------- | -------------- | ------------ |
| `--radius-sm`  | `--radius-100` | 4px          |
| `--radius-md`  | `--radius-300` | 8px          |
| `--radius-lg`  | `--radius-600` | 16px         |
| `--radius-xl`  | `--radius-700` | 24px         |
| `--radius-2xl` | Remove         | 40px dropped |

---

## 5. Shadows

```scss
:root {
  --shadow-100: 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-200: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-300: 0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-400: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
  --shadow-500: 0 16px 48px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.06);
  --shadow-sell: 0 4px 12px rgba(226, 119, 57, 0.45);
  --shadow-focus-primary: 0 0 0 3px rgba(30, 74, 64, 0.28);
  --shadow-focus-accent: 0 0 0 3px rgba(226, 119, 57, 0.28);
  --shadow-focus-error: 0 0 0 3px rgba(185, 28, 28, 0.22);
}
```

Note: DS uses `--shadow-focus-green` / `--shadow-focus-orange` but we rename to `--shadow-focus-primary` / `--shadow-focus-accent` to match our naming convention.

### Token Migration Map — Shadows

| Old Token        | New Token      | Notes                     |
| ---------------- | -------------- | ------------------------- |
| `--shadow-xs`    | `--shadow-100` | Value changes             |
| `--shadow-sm`    | `--shadow-200` | Value changes             |
| `--shadow-base`  | `--shadow-300` | Value changes             |
| `--shadow-md`    | `--shadow-400` | Value changes             |
| `--shadow-lg`    | `--shadow-400` | Was broken; remap to 400  |
| `--shadow-xl`    | `--shadow-500` | Was broken; value changes |
| `--shadow-modal` | `--shadow-500` | Removed; use 500          |

---

## 6. Motion & Animation

### 6a. New Tokens

```scss
:root {
  // Durations
  --duration-100: 100ms;
  --duration-200: 180ms;
  --duration-300: 300ms;
  --duration-400: 450ms;
  --duration-500: 600ms;

  // Easings
  --easing-out: cubic-bezier(0.16, 1, 0.3, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --easing-linear: linear;

  // Composite aliases (kept for convenience)
  --transition-basic: all var(--duration-200) var(--easing-out);
  --transition-smooth: all var(--duration-300) var(--easing-out);
  --transition-bounce: all var(--duration-400) var(--easing-spring);
  --transition-color:
    color var(--duration-200) var(--easing-out),
    background-color var(--duration-200) var(--easing-out),
    border-color var(--duration-200) var(--easing-out);
}
```

### Token Migration Map — Motion

| Old Token             | New Token             | Notes                   |
| --------------------- | --------------------- | ----------------------- |
| `--transition-basic`  | `--transition-basic`  | Rebuilt from new tokens |
| `--transition-smooth` | `--transition-smooth` | Rebuilt from new tokens |
| `--transition-bounce` | `--transition-bounce` | Rebuilt from new tokens |
| `--transition-color`  | `--transition-color`  | Rebuilt from new tokens |

---

## 7. Z-Index

```scss
:root {
  --z-100: 0;
  --z-200: 10;
  --z-300: 20;
  --z-400: 100;
  --z-500: 150;
  --z-600: 300;
  --z-700: 400;
  --z-800: 410;
  --z-900: 500;
  --z-1000: 510;
  --z-1100: 600;
  --z-1200: 700;
}
```

Numeric scale only. No semantic aliases.

---

## 8. Breakpoints

```scss
$breakpoints: (
  xs: 320px,
  sm: 375px,
  // Changed from 480px
  md: 768px,
  lg: 1024px,
  xl: 1280px, // Changed from 1200px
);
```

---

## 9. Heights

```scss
:root {
  --height-nav-top: 56px;
  --height-nav-bottom: 60px;
  --height-filter-strip: 40px;
  --height-btn-lg: 52px;
  --height-btn-md: 44px;
  --height-btn-sm: 36px;
  --height-btn-xs: 28px;
  --height-input: 48px;
  --height-input-sm: 40px;
  --height-purchase-bar: 80px;
  --min-touch-target: 44px;
}
```

---

## File Change List

| File                                      | Action                                                 |
| ----------------------------------------- | ------------------------------------------------------ |
| `src/styles/variables/colors.scss`        | **Rewrite** — Replace all tokens with new palettes     |
| `src/styles/variables/typography.scss`    | **Rewrite** — Replace modular scale with fixed sizes   |
| `src/styles/variables/spacing.scss`       | **Rewrite** — Rename all tokens                        |
| `src/styles/variables/radius.scss`        | **Rewrite** — Rename all tokens                        |
| `src/styles/variables/shadows.scss`       | **Rewrite** — Replace all values (fixes bug)           |
| `src/styles/variables/animations.scss`    | **Rewrite** — Add duration/easing + rebuild composites |
| `src/styles/mixins/breakpoints.scss`      | **Update** — Add xs, change sm to 375px, xl to 1280px  |
| (new) `src/styles/variables/z-index.scss` | **Create** — Z-index scale                             |
| (new) `src/styles/variables/heights.scss` | **Create** — Component height tokens                   |
| `src/styles/globals.scss`                 | **Update** — Import new variable files                 |
| `src/app/layout.tsx` (or font config)     | **Update** — Swap Inter for DM Sans + DM Serif Display |
| **All `*.module.scss` files**             | **Update** — Replace old token names with new names    |
| **All component files using old tokens**  | **Update** — Find & replace per migration maps         |

---

## Risks & Rollback

1. **Breakpoint `sm` change** (480px → 375px) — existing `@include breakpoint(sm)` rules will activate on smaller screens. Visually review all responsive layouts.
2. **Semantic color value shifts** — success/error/warning are significantly darker. Verify contrast ratios meet WCAG AA on all backgrounds.
3. **Font swap** — DM Sans metrics differ from Inter. Check for layout shifts, truncation, and overflow.
4. **Typography architecture** — modular scale removal means no automatic responsive sizing below 1200. Verify headings at mobile widths.

**Rollback:** All changes are in `src/styles/variables/` + `src/styles/mixins/`. Git revert the commit to restore previous tokens. Component SCSS changes would also need reverting.
