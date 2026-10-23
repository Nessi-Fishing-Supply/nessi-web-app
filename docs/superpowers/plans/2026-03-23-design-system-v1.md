# Design System v1 Token Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all SCSS design tokens from the legacy naming/values to the v1 design system spec (semantic names + numeric scales), swap Inter for DM Sans + DM Serif Display, and update all ~90 component stylesheets.

**Architecture:** Phase 1 rewrites the 8 variable files + breakpoints mixin + font config. Phase 2 does a bulk find-replace across all component SCSS files using the migration maps from `docs/design/v1/spec.md`. Phase 3 verifies the build, visual output, and lint.

**Tech Stack:** SCSS (CSS custom properties on `:root`), Next.js `next/font/google`, pnpm

**Spec:** `docs/design/v1/spec.md`

---

## File Structure

### Files to Rewrite (variable foundations)

- `src/styles/variables/colors.scss` — All color tokens
- `src/styles/variables/typography.scss` — Font families, sizes, weights, line-heights, letter-spacing
- `src/styles/variables/spacing.scss` — Spacing scale
- `src/styles/variables/radius.scss` — Border radius scale
- `src/styles/variables/shadows.scss` — Shadow scale + focus rings
- `src/styles/variables/animations.scss` — Duration/easing tokens + composite aliases + keyframes

### Files to Create

- `src/styles/variables/z-index.scss` — Z-index scale
- `src/styles/variables/heights.scss` — Component height tokens

### Files to Update

- `src/styles/mixins/breakpoints.scss` — Add xs, change sm/xl values
- `src/styles/globals.scss` — Import new variable files
- `src/app/(frontend)/layout.tsx` — Swap Inter for DM Sans + DM Serif Display

### Files to Bulk-Migrate (~90 SCSS modules)

- Every `*.module.scss` file that references old token names

---

## Phase 1: Foundation Token Files

### Task 1: Rewrite `colors.scss`

**Files:**

- Rewrite: `src/styles/variables/colors.scss`

- [ ] **Step 1: Replace the entire file contents**

```scss
////////////////////
/// Colors — Design System v1
////////////////////
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

  // White
  --color-white: #ffffff;

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

  // Surfaces
  --surface-page: var(--color-surface-300);
  --surface-raised: var(--color-surface-200);
  --surface-overlay: var(--color-surface-100);
  --surface-sunken: var(--color-surface-400);
  --surface-nav: var(--color-primary-500);
}
```

- [ ] **Step 2: Verify file saved correctly**

Run: `head -5 src/styles/variables/colors.scss`
Expected: Shows the new header comment and `:root {`

- [ ] **Step 3: Commit**

```bash
git add src/styles/variables/colors.scss
git commit -m "refactor(tokens): rewrite colors.scss to v1 design system"
```

---

### Task 2: Rewrite `typography.scss`

**Files:**

- Rewrite: `src/styles/variables/typography.scss`

- [ ] **Step 1: Replace the entire file contents**

```scss
@use '@/styles/mixins/breakpoints' as *;

////////////////////
/// Typography — Design System v1
////////////////////
:root {
  // Font families
  --font-family-sans: 'DM Sans', system-ui, sans-serif;
  --font-family-serif: 'DM Serif Display', Georgia, serif;

  // Font sizes (fixed scale)
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
  --font-size-1200: 24px;
  --font-size-1300: 28px;
  --font-size-1400: 32px;
  --font-size-1500: 40px;

  // Font weights
  --font-weight-300: 300;
  --font-weight-400: 400;
  --font-weight-500: 500;
  --font-weight-600: 600;
  --font-weight-700: 700;

  // Line heights
  --line-height-100: 1.2;
  --line-height-200: 1.3;
  --line-height-300: 1.45;
  --line-height-400: 1.6;
  --line-height-500: 1.8;

  // Letter spacing
  --letter-spacing-100: -0.02em;
  --letter-spacing-200: 0em;
  --letter-spacing-300: 0.04em;
  --letter-spacing-400: 0.06em;
  --letter-spacing-500: 0.08em;
}

// Responsive overrides for heading sizes (1200+)
@include breakpoint(md) {
  :root {
    --font-size-1200: 28px;
    --font-size-1300: 32px;
    --font-size-1400: 40px;
    --font-size-1500: 48px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/typography.scss
git commit -m "refactor(tokens): rewrite typography.scss to v1 design system"
```

---

### Task 3: Rewrite `spacing.scss`

**Files:**

- Rewrite: `src/styles/variables/spacing.scss`

- [ ] **Step 1: Replace the entire file contents**

```scss
////////////////////
/// Spacing — Design System v1
////////////////////
:root {
  --spacing-50: 2px;
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
  --spacing-1100: 80px;
  --spacing-1200: 160px;

  // Page margins
  --spacing-page-sm: 16px;
  --spacing-page-md: 24px;
  --spacing-page-lg: 40px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/spacing.scss
git commit -m "refactor(tokens): rewrite spacing.scss to v1 design system"
```

---

### Task 4: Rewrite `radius.scss`

**Files:**

- Rewrite: `src/styles/variables/radius.scss`

- [ ] **Step 1: Replace the entire file contents**

```scss
////////////////////
/// Border Radius — Design System v1
////////////////////
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

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/radius.scss
git commit -m "refactor(tokens): rewrite radius.scss to v1 design system"
```

---

### Task 5: Rewrite `shadows.scss`

**Files:**

- Rewrite: `src/styles/variables/shadows.scss`

- [ ] **Step 1: Replace the entire file contents**

This also fixes the missing semicolon bug on the old `--shadow-lg`.

```scss
////////////////////
/// Shadows — Design System v1
////////////////////
:root {
  --shadow-100: 0 1px 2px rgb(0 0 0 / 6%);
  --shadow-200: 0 2px 8px rgb(0 0 0 / 8%), 0 1px 2px rgb(0 0 0 / 4%);
  --shadow-300: 0 4px 16px rgb(0 0 0 / 10%), 0 2px 4px rgb(0 0 0 / 6%);
  --shadow-400: 0 8px 32px rgb(0 0 0 / 12%), 0 4px 8px rgb(0 0 0 / 6%);
  --shadow-500: 0 16px 48px rgb(0 0 0 / 15%), 0 8px 16px rgb(0 0 0 / 6%);
  --shadow-sell: 0 4px 12px rgb(226 119 57 / 45%);
  --shadow-focus-primary: 0 0 0 3px rgb(30 74 64 / 28%);
  --shadow-focus-accent: 0 0 0 3px rgb(226 119 57 / 28%);
  --shadow-focus-error: 0 0 0 3px rgb(185 28 28 / 22%);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/shadows.scss
git commit -m "refactor(tokens): rewrite shadows.scss to v1 design system (fixes missing semicolon bug)"
```

---

### Task 6: Rewrite `animations.scss`

**Files:**

- Rewrite: `src/styles/variables/animations.scss`

- [ ] **Step 1: Replace the entire file contents**

```scss
////////////////////
/// Motion — Design System v1
////////////////////
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

  // Composite aliases (convenience)
  --transition-basic: all var(--duration-200) var(--easing-out);
  --transition-smooth: all var(--duration-300) var(--easing-out);
  --transition-bounce: all var(--duration-400) var(--easing-spring);
  --transition-color:
    color var(--duration-200) var(--easing-out),
    background-color var(--duration-200) var(--easing-out),
    border-color var(--duration-200) var(--easing-out);
}

////////////////////
/// Keyframe Animations
////////////////////

/* Progress bar fill — width grows from 0 */
@keyframes progress-fill {
  from {
    width: 0%;
  }
}

/* Spinner rotation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/animations.scss
git commit -m "refactor(tokens): rewrite animations.scss with duration/easing tokens"
```

---

### Task 7: Create `z-index.scss`

**Files:**

- Create: `src/styles/variables/z-index.scss`

- [ ] **Step 1: Create the file**

```scss
////////////////////
/// Z-Index — Design System v1
////////////////////
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

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/z-index.scss
git commit -m "feat(tokens): add z-index.scss with v1 design system scale"
```

---

### Task 8: Create `heights.scss`

**Files:**

- Create: `src/styles/variables/heights.scss`

- [ ] **Step 1: Create the file**

```scss
////////////////////
/// Heights — Design System v1
////////////////////
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

- [ ] **Step 2: Commit**

```bash
git add src/styles/variables/heights.scss
git commit -m "feat(tokens): add heights.scss with v1 component height tokens"
```

---

### Task 9: Update `breakpoints.scss`

**Files:**

- Modify: `src/styles/mixins/breakpoints.scss:6-11`

- [ ] **Step 1: Replace the `$breakpoints` map**

Change:

```scss
$breakpoints: (
  sm: 480px,
  md: 768px,
  lg: 1024px,
  xl: 1200px,
) !default;
```

To:

```scss
$breakpoints: (
  xs: 320px,
  sm: 375px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
) !default;
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/mixins/breakpoints.scss
git commit -m "refactor(tokens): update breakpoints to v1 (xs:320, sm:375, xl:1280)"
```

---

### Task 10: Update `globals.scss` imports

**Files:**

- Modify: `src/styles/globals.scss:9-14`

- [ ] **Step 1: Add imports for new variable files**

After the existing variable imports, add:

```scss
@use 'variables/z-index' as *;
@use 'variables/heights' as *;
```

The full Variables block should be:

```scss
// Variables
@use 'variables/animations' as *;
@use 'variables/colors' as *;
@use 'variables/spacing' as *;
@use 'variables/typography' as *;
@use 'variables/shadows' as *;
@use 'variables/radius' as *;
@use 'variables/z-index' as *;
@use 'variables/heights' as *;
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/globals.scss
git commit -m "refactor(tokens): import z-index and heights in globals.scss"
```

---

### Task 11: Swap font config in layout.tsx

**Files:**

- Modify: `src/app/(frontend)/layout.tsx`

- [ ] **Step 1: Replace Inter import and config with DM Sans + DM Serif Display**

Change:

```tsx
import { Inter } from 'next/font/google';
```

To:

```tsx
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
```

Change the font initialization:

```tsx
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
```

To:

```tsx
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-serif',
  weight: '400',
});
```

Change the body className:

```tsx
<body className={inter.className}>
```

To:

```tsx
<body className={`${dmSans.className} ${dmSerif.variable}`}>
```

This makes DM Sans the default body font and exposes `--font-dm-serif` as a CSS variable for editorial elements.

- [ ] **Step 2: Run the dev server to verify fonts load**

Run: `pnpm dev` (if not already running)
Check: Visit http://localhost:3000 — text should render in DM Sans, not Inter.

- [ ] **Step 3: Commit**

```bash
git add src/app/(frontend)/layout.tsx
git commit -m "refactor(tokens): swap Inter for DM Sans + DM Serif Display"
```

---

## Phase 2: Bulk Token Migration

This phase does a systematic find-replace across all component SCSS files. Each sub-task handles one token category to keep diffs reviewable.

**Important:** The `src/styles/variables/` files were already rewritten in Phase 1. Phase 2 updates all _consumers_ of those tokens.

### Task 12: Migrate color tokens across all SCSS files

**Files:**

- Modify: ~82 `*.module.scss` files + `src/styles/utilities/*.scss`

- [ ] **Step 1: Run bulk replacements for color tokens**

Execute these replacements in order. Use your editor's project-wide find-replace on `*.scss` files (excluding `src/styles/variables/colors.scss` which was already rewritten).

**Brand colors (exact token replacements):**

```
--color-primary--light  →  --color-primary-400
--color-primary--dark   →  --color-primary-700
--color-primary)        →  --color-primary-500)
--color-secondary--light → --color-accent-300
--color-secondary--dark  → --color-accent-600
--color-secondary)       → --color-accent-500)
--color-tertiary--light  → --color-destructive-400
--color-tertiary--dark   → --color-destructive-600
--color-tertiary)        → --color-destructive-500)
```

**Named neutrals:**

```
--color-off-white)  →  --color-surface-300)
--color-light)      →  --color-surface-100)
--color-cream)      →  --color-surface-100)
--color-dark)       →  --color-neutral-900)
--color-black)      →  --color-neutral-900)
```

**Grayscale → Neutral (map by shade proximity):**

```
--color-gray-50)   →  --color-neutral-100)
--color-gray-100)  →  --color-neutral-200)
--color-gray-200)  →  --color-neutral-300)
--color-gray-300)  →  --color-neutral-400)
--color-gray-400)  →  --color-neutral-500)
--color-gray-500)  →  --color-neutral-500)
--color-gray-600)  →  --color-neutral-600)
--color-gray-700)  →  --color-neutral-700)
--color-gray-800)  →  --color-neutral-800)
--color-gray-900)  →  --color-neutral-900)
```

**Semantic colors:**

```
--color-success-50)   →  --color-success-100)
--color-success-400)  →  --color-success-200)
--color-success-900)  →  --color-success-700)
--color-success)      →  --color-success-500)
--color-error-50)     →  --color-error-100)
--color-error-900)    →  --color-error-700)
--color-error)        →  --color-error-500)
--color-warning)      →  --color-warning-500)
```

Note: `--color-success-500`, `--color-success-200`, `--color-success-700`, `--color-error-500`, `--color-error-200`, `--color-error-700` keep the same token names (values changed in Phase 1).

Note: The spec says to **remove** `--color-success-900`, `--color-success-400`, and `--color-error-900` (no 900/400 shades in the DS). We map them to the nearest available shade instead of leaving broken references: 900→700 (closest dark), 400→200 (closest light).

- [ ] **Step 2: Verify no old color tokens remain**

Run: `grep -r '--color-primary\b\|--color-secondary\b\|--color-tertiary\b\|--color-off-white\|--color-light)\|--color-cream\|--color-dark)\|--color-black)\|--color-gray-' --include='*.scss' src/ | grep -v 'colors.scss' | grep -v 'node_modules'`

Expected: No output (all old tokens replaced).

- [ ] **Step 3: Commit**

```bash
git add -A '*.scss'
git commit -m "refactor(tokens): migrate all color token references to v1 naming"
```

---

### Task 13: Migrate spacing tokens across all SCSS files

**Files:**

- Modify: ~60+ `*.module.scss` files

- [ ] **Step 1: Run bulk replacements for spacing tokens**

```
--space-3xs)   →  --spacing-50)
--space-2xs)   →  --spacing-100)
--space-xs)    →  --spacing-200)
--space-sm)    →  --spacing-300)
--space-base)  →  --spacing-400)
--space-md)    →  --spacing-600)
--space-lg)    →  --spacing-700)
--space-xl)    →  --spacing-800)
--space-2xl)   →  --spacing-900)
--space-3xl)   →  --spacing-1000)
--space-4xl)   →  --spacing-1100)
--space-5xl)   →  --spacing-1200)
```

- [ ] **Step 2: Verify no old spacing tokens remain**

Run: `grep -r '--space-' --include='*.scss' src/ | grep -v 'spacing.scss' | grep -v 'node_modules' | grep -v 'letter-spacing'`

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add -A '*.scss'
git commit -m "refactor(tokens): migrate all spacing token references to v1 naming"
```

---

### Task 14: Migrate radius tokens across all SCSS files

**Files:**

- Modify: ~30+ `*.module.scss` files

- [ ] **Step 1: Run bulk replacements for radius tokens**

```
--radius-sm)   →  --radius-100)
--radius-md)   →  --radius-300)
--radius-lg)   →  --radius-600)
--radius-xl)   →  --radius-700)
--radius-2xl)  →  --radius-800)
```

- [ ] **Step 2: Verify no old radius tokens remain**

Run: `grep -r '--radius-sm)\|--radius-md)\|--radius-lg)\|--radius-xl)\|--radius-2xl)' --include='*.scss' src/ | grep -v 'radius.scss'`

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add -A '*.scss'
git commit -m "refactor(tokens): migrate all radius token references to v1 naming"
```

---

### Task 15: Migrate shadow tokens across all SCSS files

**Files:**

- Modify: ~20+ `*.module.scss` files

- [ ] **Step 1: Run bulk replacements for shadow tokens**

```
--shadow-xs)     →  --shadow-100)
--shadow-sm)     →  --shadow-200)
--shadow-base)   →  --shadow-300)
--shadow-md)     →  --shadow-400)
--shadow-lg)     →  --shadow-400)
--shadow-xl)     →  --shadow-500)
--shadow-modal)  →  --shadow-500)
```

- [ ] **Step 2: Verify no old shadow tokens remain**

Run: `grep -r '--shadow-xs)\|--shadow-sm)\|--shadow-base)\|--shadow-md)\|--shadow-lg)\|--shadow-xl)\|--shadow-modal)' --include='*.scss' src/ | grep -v 'shadows.scss'`

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add -A '*.scss'
git commit -m "refactor(tokens): migrate all shadow token references to v1 naming"
```

---

### Task 16: Migrate typography tokens across all SCSS files

**Files:**

- Modify: ~30+ `*.module.scss` files + `src/styles/utilities/typography.scss`

- [ ] **Step 1: Run bulk replacements for font-size tokens**

```
--font-size-xs)   →  --font-size-200)
--font-size-sm)   →  --font-size-500)
--font-size-base) →  --font-size-700)
--font-size-md)   →  --font-size-800)
--font-size-lg)   →  --font-size-900)
--font-size-xl)   →  --font-size-1000)
--font-size-2xl)  →  --font-size-1100)
--font-size-3xl)  →  --font-size-1300)
--font-size-4xl)  →  --font-size-1400)
```

**Font family:**

```
--font-family-primary)  →  --font-family-sans)
```

**Remove any remaining references to:**

```
--font-size-base  (if used as a variable in calcs)
--font-scale-ratio (should not exist outside typography.scss)
```

- [ ] **Step 2: Verify no old typography tokens remain**

Run: `grep -r '--font-size-xs)\|--font-size-sm)\|--font-size-base)\|--font-size-md)\|--font-size-lg)\|--font-size-xl)\|--font-size-2xl)\|--font-size-3xl)\|--font-size-4xl)\|--font-family-primary)' --include='*.scss' src/ | grep -v 'typography.scss'`

Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add -A '*.scss'
git commit -m "refactor(tokens): migrate all typography token references to v1 naming"
```

---

### Task 17: Migrate animation tokens (if any non-composite references exist)

**Files:**

- Modify: Any `*.module.scss` files using `--transition-*` tokens

- [ ] **Step 1: Check for any direct references to old animation tokens that were removed**

The composite aliases (`--transition-basic`, `--transition-smooth`, `--transition-bounce`, `--transition-color`) are kept, so most files need no changes. Only check for direct references to removed tokens.

Run: `grep -r '--transition-basic\|--transition-smooth\|--transition-bounce\|--transition-color' --include='*.scss' src/ | grep -v 'animations.scss' | head -5`

Expected: These references are fine — the aliases still exist. No migration needed for animation tokens.

- [ ] **Step 2: Commit (if any changes were made)**

```bash
# Only if changes were made
git add -A '*.scss'
git commit -m "refactor(tokens): migrate animation token references"
```

---

### Task 18: Migrate old tokens in TSX inline styles

**Files:**

- Modify: `src/app/(frontend)/not-found.tsx`
- Modify: `src/app/(frontend)/loading.tsx`
- Modify: `src/app/(frontend)/error.tsx`
- Modify: `src/app/(frontend)/dashboard/loading.tsx`
- Modify: `src/app/(frontend)/dashboard/error.tsx`
- Modify: `src/app/(frontend)/member/[slug]/not-found.tsx`
- Modify: `src/app/(frontend)/shop/[slug]/not-found.tsx`
- Modify: Any other `*.tsx` files with old token names in inline `style={{}}` attributes

- [ ] **Step 1: Find all TSX files with old token references**

Run: `grep -r '--space-\|--font-size-xs\|--font-size-sm\|--font-size-base\|--font-size-md\|--font-size-lg\|--font-size-xl\|--font-size-2xl\|--font-size-3xl\|--font-size-4xl\|--color-gray-\|--color-primary)\|--color-secondary)\|--color-tertiary)\|--color-off-white\|--color-dark)\|--color-light)\|--radius-sm\|--radius-md\|--radius-lg\|--radius-xl\|--shadow-xs\|--shadow-sm\|--shadow-base\|--shadow-md\|--shadow-lg\|--shadow-xl\|--shadow-modal' --include='*.tsx' src/`

- [ ] **Step 2: Apply the same migration maps from Tasks 12-16 to all TSX files found**

Key replacements for known files:

```
--space-xl      →  --spacing-800
--space-3xl     →  --spacing-1000
--space-sm      →  --spacing-300
--space-md      →  --spacing-600
--font-size-2xl →  --font-size-1100
--font-size-base → --font-size-700
--color-gray-600 → --color-neutral-600
```

Apply all other migration maps from Tasks 12-16 to any additional matches.

- [ ] **Step 3: Verify no old tokens remain in TSX files**

Run: `grep -r '--space-\|--font-size-xs)\|--font-size-sm)\|--font-size-base)\|--font-size-md)\|--font-size-lg)\|--font-size-xl)\|--font-size-2xl)\|--font-size-3xl)\|--font-size-4xl)\|--color-gray-\|--color-primary)\|--color-secondary)\|--color-tertiary)\|--color-off-white\|--color-dark)\|--color-light)\|--radius-sm)\|--radius-md)\|--radius-lg)\|--radius-xl)\|--shadow-xs)\|--shadow-sm)\|--shadow-base)\|--shadow-md)\|--shadow-lg)\|--shadow-xl)\|--shadow-modal)' --include='*.tsx' src/ | grep -v node_modules`

Expected: No output.

- [ ] **Step 4: Commit**

```bash
git add -A '*.tsx'
git commit -m "refactor(tokens): migrate old token references in TSX inline styles"
```

---

## Phase 3: Verification

### Task 19: Build verification

- [ ] **Step 1: Run the build**

Run: `pnpm build`
Expected: Build succeeds with no SCSS compilation errors.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No new lint errors.

- [ ] **Step 3: Run stylelint**

Run: `pnpm lint:styles`
Expected: No new stylelint errors (pre-existing ones are acceptable).

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No new type errors from the layout.tsx font changes.

- [ ] **Step 5: Run tests**

Run: `pnpm test:run`
Expected: All tests pass.

---

### Task 20: Visual verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev` (if not already running)

- [ ] **Step 2: Navigate to the component showcase**

Visit: http://localhost:3000/dev/components

- [ ] **Step 3: Take the "after" screenshot**

Use Playwright to screenshot the full page and save to `docs/design/v1/screenshots/showcase-after.png`.

- [ ] **Step 4: Compare before/after screenshots**

Compare `docs/design/v1/screenshots/showcase-before.png` with `showcase-after.png`. Flag any components that look visually broken.

- [ ] **Step 5: Spot-check key pages**

Visit these pages and verify they render correctly:

- http://localhost:3000 (home)
- http://localhost:3000/dev/components (showcase)
- Any listing detail page (if accessible in dev)

- [ ] **Step 6: Final commit**

```bash
git add docs/design/v1/screenshots/showcase-after.png
git commit -m "docs: add post-migration component showcase screenshot"
```

---

### Task 21: Update component showcase page token names

**Files:**

- Modify: `src/app/(frontend)/dev/components/page.tsx`
- Modify: `src/app/(frontend)/dev/components/components.module.scss`

The dev showcase page hardcodes token names in its data arrays and uses `var(--c-*)` custom properties. Update:

- [ ] **Step 1: Update `COLOR_GROUPS` data to use new token names in labels**

The hex values are already correct (they match the DS). Update group names to reflect new naming:

- "Green — Brand Primary" → "Primary"
- "Orange — Brand Accent" → "Accent"
- "Sand — App Background & Surfaces" → "Surface"
- "Maroon — Reserved & Destructive" → "Destructive"
- "Neutral — Text & UI" → "Neutral"

- [ ] **Step 2: Update SCSS custom properties**

Replace all `var(--c-*)` references in `components.module.scss` with the actual new token names:

```
var(--c-bg)      →  var(--surface-page)
var(--c-fill)    →  var(--color-surface-200)
var(--c-border)  →  var(--color-surface-500)
var(--c-text)    →  var(--color-neutral-900)
var(--c-text-2)  →  var(--color-surface-800)
```

- [ ] **Step 3: Update Interactive State Mapping table to use new token names**

In the `INTERACTIVE_STATES` data array, replace:

```
--color-green-500  →  --color-primary-500
--color-green-600  →  --color-primary-600
--color-green-700  →  --color-primary-700
--color-green-100  →  --color-primary-100
--color-orange-500 →  --color-accent-500
--color-orange-600 →  --color-accent-600
--color-orange-700 →  --color-accent-700
--shadow-focus-green  →  --shadow-focus-primary
--shadow-focus-orange →  --shadow-focus-accent
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(frontend)/dev/components/page.tsx src/app/(frontend)/dev/components/components.module.scss
git commit -m "refactor(showcase): update dev component page to v1 token names"
```
