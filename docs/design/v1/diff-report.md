# Design System Diff Report — v1

**Generated:** 2026-03-23
**Design System:** https://0m34aamgen-7200.hosted.obvious.ai/design-system.html (v2.0)
**Codebase:** `src/styles/variables/` + `src/styles/mixins/breakpoints.scss`

This is the first sync (v1). No previous version exists for cross-version comparison.

---

## Executive Summary

The design system represents a **complete overhaul** of the token architecture. The naming convention shifts from semantic names (`--color-primary`, `--space-sm`) to a numeric scale system (`--color-green-500`, `--spacing-200`). The color palette expands from 3 brand + grayscale to 5 palettes (green, orange, maroon, sand, neutral) each with 9 shades. Typography shifts from a modular scale (Inter) to fixed pixel sizes (DM Sans + DM Serif Display). Nearly every token changes.

**Impact:** 238 tokens in the design system vs ~59 tokens in the current codebase.

---

## 1. Colors

### 1a. New Tokens (not in codebase)

**60 new color tokens.** The design system introduces 5 full palettes with 9 shades each (45 tokens), plus neutral palette (9), info semantics (4), and surface/alias tokens.

| Token                             | Value                    | Category                                       |
| --------------------------------- | ------------------------ | ---------------------------------------------- |
| `--color-green-100`               | `#D6E9E4`                | Green palette                                  |
| `--color-green-200`               | `#9ECABB`                | Green palette                                  |
| `--color-green-300`               | `#6BAD99`                | Green palette                                  |
| `--color-green-400`               | `#3D8C75`                | Green palette                                  |
| `--color-green-500`               | `#1E4A40`                | Green palette (= current `--color-primary`)    |
| `--color-green-600`               | `#163831`                | Green palette                                  |
| `--color-green-700`               | `#0E2822`                | Green palette                                  |
| `--color-green-800`               | `#081812`                | Green palette                                  |
| `--color-green-900`               | `#030C09`                | Green palette                                  |
| `--color-orange-100`              | `#FBE9D9`                | Orange palette                                 |
| `--color-orange-200`              | `#F5C8A0`                | Orange palette                                 |
| `--color-orange-300`              | `#EEA86B`                | Orange palette                                 |
| `--color-orange-400`              | `#E89048`                | Orange palette                                 |
| `--color-orange-500`              | `#E27739`                | Orange palette (= current `--color-secondary`) |
| `--color-orange-600`              | `#CC6830`                | Orange palette                                 |
| `--color-orange-700`              | `#B55A28`                | Orange palette                                 |
| `--color-orange-800`              | `#8A4018`                | Orange palette                                 |
| `--color-orange-900`              | `#5C2A0C`                | Orange palette                                 |
| `--color-maroon-100`              | `#F5D0D0`                | Maroon palette                                 |
| `--color-maroon-200`              | `#E8A0A0`                | Maroon palette                                 |
| `--color-maroon-300`              | `#D47070`                | Maroon palette                                 |
| `--color-maroon-400`              | `#B84040`                | Maroon palette                                 |
| `--color-maroon-500`              | `#681A19`                | Maroon palette (= current `--color-tertiary`)  |
| `--color-maroon-600`              | `#551414`                | Maroon palette                                 |
| `--color-maroon-700`              | `#410F0F`                | Maroon palette                                 |
| `--color-maroon-800`              | `#2A0909`                | Maroon palette                                 |
| `--color-maroon-900`              | `#150404`                | Maroon palette                                 |
| `--color-sand-100`                | `#FAF7F2`                | Sand palette                                   |
| `--color-sand-200`                | `#F5EDDF`                | Sand palette                                   |
| `--color-sand-300`                | `#EDE0CB`                | Sand palette (= current `--color-off-white`)   |
| `--color-sand-400`                | `#E3D1B4`                | Sand palette                                   |
| `--color-sand-500`                | `#D9CCBA`                | Sand palette                                   |
| `--color-sand-600`                | `#C4B49E`                | Sand palette                                   |
| `--color-sand-700`                | `#A89278`                | Sand palette                                   |
| `--color-sand-800`                | `#7A6E62`                | Sand palette                                   |
| `--color-sand-900`                | `#4A3F35`                | Sand palette                                   |
| `--color-neutral-100`             | `#F8F8F7`                | Neutral palette                                |
| `--color-neutral-200`             | `#EFEFED`                | Neutral palette                                |
| `--color-neutral-300`             | `#E0DFDC`                | Neutral palette                                |
| `--color-neutral-400`             | `#C8C6C1`                | Neutral palette                                |
| `--color-neutral-500`             | `#A09D97`                | Neutral palette                                |
| `--color-neutral-600`             | `#78756F`                | Neutral palette                                |
| `--color-neutral-700`             | `#524F4A`                | Neutral palette                                |
| `--color-neutral-800`             | `#2E2C28`                | Neutral palette                                |
| `--color-neutral-900`             | `#1C1C1C`                | Neutral palette                                |
| `--color-info-100`                | `#D6E9E4`                | Info semantic                                  |
| `--color-info-200`                | `#9ECABB`                | Info semantic                                  |
| `--color-info-500`                | `#1E4A40`                | Info semantic                                  |
| `--color-info-700`                | `#0E2822`                | Info semantic                                  |
| `--color-warning-100`             | `#FEF3DC`                | Warning (new shade)                            |
| `--color-warning-200`             | `#F5D08A`                | Warning (new shade)                            |
| `--color-warning-700`             | `#7A4706`                | Warning (new shade)                            |
| `--surface-page`                  | `var(--color-sand-300)`  | Surface token                                  |
| `--surface-raised`                | `var(--color-sand-200)`  | Surface token                                  |
| `--surface-overlay`               | `var(--color-sand-100)`  | Surface token                                  |
| `--surface-sunken`                | `var(--color-sand-400)`  | Surface token                                  |
| `--surface-nav`                   | `var(--color-green-500)` | Surface token                                  |
| `--surface-nav-pill`              | `rgba(237,224,203,0.82)` | Surface token                                  |
| Plus ~40 `--c-*` semantic aliases | (see extraction)         | Alias layer                                    |

### 1b. Changed Values

| Codebase Token        | Codebase Value | Design System Equivalent | Design System Value | Notes                          |
| --------------------- | -------------- | ------------------------ | ------------------- | ------------------------------ |
| `--color-success-500` | `#22c55e`      | `--color-success-500`    | `#1A6B43`           | **Significantly darker green** |
| `--color-success-200` | `#bbf7d0`      | `--color-success-200`    | `#A8D9BC`           | Warmer, less saturated         |
| `--color-success-50`  | `#f0fdf4`      | `--color-success-100`    | `#D4EDDA`           | Renamed 50->100, darker        |
| `--color-success-700` | `#15803d`      | `--color-success-700`    | `#0F4028`           | Darker                         |
| `--color-success-900` | `#166534`      | —                        | —                   | Removed (no 900 in DS)         |
| `--color-success-400` | `#6b9e7a`      | —                        | —                   | Removed (no 400 in DS)         |
| `--color-success`     | `#007e33`      | `--color-success-500`    | `#1A6B43`           | Different value                |
| `--color-error-500`   | `#ef4444`      | `--color-error-500`      | `#B91C1C`           | **Significantly darker red**   |
| `--color-error-200`   | `#fecaca`      | `--color-error-200`      | `#F5B5B5`           | Different shade                |
| `--color-error-50`    | `#fef2f2`      | `--color-error-100`      | `#FDE8E8`           | Renamed 50->100, different     |
| `--color-error-700`   | `#b91c1c`      | `--color-error-700`      | `#7A1010`           | **Darker**                     |
| `--color-error-900`   | `#991b1b`      | —                        | —                   | Removed (no 900 in DS)         |
| `--color-error`       | `#c00`         | `--color-error-500`      | `#B91C1C`           | Different value                |
| `--color-warning`     | `#f80`         | `--color-warning-500`    | `#B86E0A`           | **Darker, more subdued**       |
| `--color-white`       | `#fff`         | `--color-white`          | `#FFFFFF`           | Same (formatting only)         |

### 1c. Removed Tokens (in codebase, not in design system)

| Token                      | Value     | Notes                                                                          |
| -------------------------- | --------- | ------------------------------------------------------------------------------ |
| `--color-primary--light`   | `#2f7464` | Replaced by `--color-green-400` (#3D8C75)                                      |
| `--color-primary`          | `#1e4a40` | Replaced by `--color-green-500` (same value)                                   |
| `--color-primary--dark`    | `#122b25` | Replaced by `--color-green-700` (#0E2822)                                      |
| `--color-secondary--light` | `#ea9d71` | Replaced by `--color-orange-300` (#EEA86B)                                     |
| `--color-secondary`        | `#e27739` | Replaced by `--color-orange-500` (same value)                                  |
| `--color-secondary--dark`  | `#c35a1d` | Replaced by `--color-orange-600` (#CC6830)                                     |
| `--color-tertiary--light`  | `#942624` | Replaced by `--color-maroon-400` (#B84040)                                     |
| `--color-tertiary`         | `#681a19` | Replaced by `--color-maroon-500` (same value)                                  |
| `--color-tertiary--dark`   | `#521514` | Replaced by `--color-maroon-600` (#551414)                                     |
| `--color-off-white`        | `#ede0cb` | Replaced by `--color-sand-300` (same value)                                    |
| `--color-light`            | `#fff9f0` | No direct equivalent (closest: `--color-sand-100` #FAF7F2)                     |
| `--color-cream`            | `#fffefc` | No direct equivalent                                                           |
| `--color-dark`             | `#252422` | Replaced by `--color-neutral-800` (#2E2C28) or `--color-neutral-900` (#1C1C1C) |
| `--color-black`            | `#000`    | Removed entirely                                                               |
| `--color-gray-50`          | `#f2f2f2` | Replaced by neutral scale                                                      |
| `--color-gray-100`         | `#e6e6e6` | Replaced by neutral scale                                                      |
| `--color-gray-200`         | `#ccc`    | Replaced by neutral scale                                                      |
| `--color-gray-300`         | `#b3b3b3` | Replaced by neutral scale                                                      |
| `--color-gray-400`         | `#999`    | Replaced by neutral scale                                                      |
| `--color-gray-500`         | `#808080` | Replaced by neutral scale                                                      |
| `--color-gray-600`         | `#666`    | Replaced by neutral scale                                                      |
| `--color-gray-700`         | `#4d4d4d` | Replaced by neutral scale                                                      |
| `--color-gray-800`         | `#333`    | Replaced by neutral scale                                                      |
| `--color-gray-900`         | `#1a1a1a` | Replaced by neutral scale                                                      |
| `--color-success-900`      | `#166534` | No 900 in new system                                                           |
| `--color-success-400`      | `#6b9e7a` | No 400 in new system                                                           |
| `--color-success`          | `#007e33` | Use `--color-success-500`                                                      |
| `--color-error-900`        | `#991b1b` | No 900 in new system                                                           |
| `--color-error`            | `#c00`    | Use `--color-error-500`                                                        |
| `--color-warning`          | `#f80`    | Use `--color-warning-500`                                                      |

### 1d. Naming Mismatches

| Codebase Pattern                                                             | Design System Pattern       | Concept                                                 |
| ---------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| `--color-primary` / `--color-primary--light` / `--color-primary--dark`       | `--color-green-{100-900}`   | Brand green uses numeric scale, not semantic light/dark |
| `--color-secondary` / `--color-secondary--light` / `--color-secondary--dark` | `--color-orange-{100-900}`  | Brand orange uses numeric scale                         |
| `--color-tertiary` / `--color-tertiary--light` / `--color-tertiary--dark`    | `--color-maroon-{100-900}`  | Brand maroon uses numeric scale                         |
| `--color-gray-{50-900}`                                                      | `--color-neutral-{100-900}` | Grayscale renamed to "neutral" with warm tones          |
| `--color-off-white` / `--color-light` / `--color-cream`                      | `--color-sand-{100-300}`    | Named neutrals become "sand" palette                    |
| `--color-dark`                                                               | `--color-neutral-900`       | Named dark becomes numbered neutral                     |
| `--color-success` (shorthand)                                                | `--color-success-500`       | All semantics require explicit shade number             |

---

## 2. Typography

### 2a. New Tokens

| Token                                        | Value                                | Notes                           |
| -------------------------------------------- | ------------------------------------ | ------------------------------- |
| `--font-family-sans`                         | `"DM Sans", system-ui, sans-serif`   | **New font family** (was Inter) |
| `--font-family-serif`                        | `"DM Serif Display", Georgia, serif` | **New** -- editorial font       |
| `--font-size-100` through `--font-size-1500` | 9px - 48px (15 fixed sizes)          | Replaces modular scale          |
| `--font-weight-300`                          | 300                                  | New weight token                |
| `--font-weight-400`                          | 400                                  | New weight token                |
| `--font-weight-500`                          | 500                                  | New weight token                |
| `--font-weight-600`                          | 600                                  | New weight token                |
| `--font-weight-700`                          | 700                                  | New weight token                |
| `--line-height-100`                          | 1.2                                  | New line-height token           |
| `--line-height-200`                          | 1.3                                  | New line-height token           |
| `--line-height-300`                          | 1.45                                 | New line-height token           |
| `--line-height-400`                          | 1.6                                  | New line-height token           |
| `--line-height-500`                          | 1.8                                  | New line-height token           |
| `--letter-spacing-100`                       | -0.02em                              | New letter-spacing token        |
| `--letter-spacing-200`                       | 0em                                  | New letter-spacing token        |
| `--letter-spacing-300`                       | 0.04em                               | New letter-spacing token        |
| `--letter-spacing-400`                       | 0.06em                               | New letter-spacing token        |
| `--letter-spacing-500`                       | 0.08em                               | New letter-spacing token        |

### 2b. Changed Values

| Codebase Token                             | Codebase Value                 | Design System                                | Notes                                                                    |
| ------------------------------------------ | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| `--font-family-primary`                    | `var(--font-inter)`            | `--font-family-sans: "DM Sans"`              | **Font change: Inter -> DM Sans**                                        |
| `--font-size-base`                         | `1rem` (16px)                  | No direct equivalent                         | Removed; closest is `--font-size-400` (12px) or `--font-size-700` (15px) |
| `--font-scale-ratio`                       | 1.2 (mobile) / 1.309 (desktop) | —                                            | **Removed**: no modular scale in DS                                      |
| `--font-size-xs` through `--font-size-4xl` | calc-based modular scale       | `--font-size-100` through `--font-size-1500` | Fixed px values replace calc-based scale                                 |

### 2c. Removed Tokens

| Token                   | Value               | Notes                                     |
| ----------------------- | ------------------- | ----------------------------------------- |
| `--font-family-primary` | `var(--font-inter)` | Replaced by `--font-family-sans`          |
| `--font-size-base`      | `1rem`              | No base concept; use explicit size tokens |
| `--font-scale-ratio`    | 1.2 / 1.309         | Modular scale removed entirely            |
| `--font-size-xs`        | `calc(...)`         | Use `--font-size-100` (9px) or similar    |
| `--font-size-sm`        | `calc(...)`         | Use `--font-size-500` (13px)              |
| `--font-size-md`        | `calc(...)`         | Use `--font-size-800` (17px)              |
| `--font-size-lg`        | `calc(...)`         | Use `--font-size-900` (20px)              |
| `--font-size-xl`        | `calc(...)`         | Use `--font-size-1000` (22px)             |
| `--font-size-2xl`       | `calc(...)`         | Use `--font-size-1100` (24px)             |
| `--font-size-3xl`       | `calc(...)`         | Use `--font-size-1300` (32px)             |
| `--font-size-4xl`       | `calc(...)`         | Use `--font-size-1400` (40px)             |

### 2d. Architecture Change

The codebase uses a **modular scale** with a base size and ratio that changes at breakpoints. The design system uses **15 fixed pixel sizes** with no responsive scaling. This is a fundamental architecture change that affects every component.

---

## 3. Spacing

### 3a. New Tokens

| Token               | Value | Notes                               |
| ------------------- | ----- | ----------------------------------- |
| `--spacing-100`     | 4px   | New naming (was `--space-2xs`)      |
| `--spacing-200`     | 8px   | New naming (was `--space-xs`)       |
| `--spacing-300`     | 12px  | New naming (was `--space-sm`)       |
| `--spacing-400`     | 16px  | New naming (was `--space-base`)     |
| `--spacing-500`     | 20px  | **New value** (no 20px in codebase) |
| `--spacing-600`     | 24px  | New naming (was `--space-md`)       |
| `--spacing-700`     | 32px  | New naming (was `--space-lg`)       |
| `--spacing-800`     | 40px  | New naming (was `--space-xl`)       |
| `--spacing-900`     | 48px  | New naming (was `--space-2xl`)      |
| `--spacing-1000`    | 64px  | New naming (was `--space-3xl`)      |
| `--spacing-page-sm` | 16px  | New page margin token               |
| `--spacing-page-md` | 24px  | New page margin token               |
| `--spacing-page-lg` | 40px  | New page margin token               |

### 3b. Changed Values

All values remain the same but names change from `--space-{size}` to `--spacing-{number}`.

| Codebase Token | Value | Design System Token | Value | Delta                |
| -------------- | ----- | ------------------- | ----- | -------------------- |
| `--space-2xs`  | 4px   | `--spacing-100`     | 4px   | Same value, new name |
| `--space-xs`   | 8px   | `--spacing-200`     | 8px   | Same value, new name |
| `--space-sm`   | 12px  | `--spacing-300`     | 12px  | Same value, new name |
| `--space-base` | 16px  | `--spacing-400`     | 16px  | Same value, new name |
| `--space-md`   | 24px  | `--spacing-600`     | 24px  | Same value, new name |
| `--space-lg`   | 32px  | `--spacing-700`     | 32px  | Same value, new name |
| `--space-xl`   | 40px  | `--spacing-800`     | 40px  | Same value, new name |
| `--space-2xl`  | 48px  | `--spacing-900`     | 48px  | Same value, new name |
| `--space-3xl`  | 64px  | `--spacing-1000`    | 64px  | Same value, new name |

### 3c. Removed Tokens

| Token         | Value | Notes                                    |
| ------------- | ----- | ---------------------------------------- |
| `--space-3xs` | 2px   | No 2px in design system (minimum is 4px) |
| `--space-4xl` | 80px  | No 80px in design system                 |
| `--space-5xl` | 160px | No 160px in design system                |

### 3d. New Values Not in Codebase

| Token           | Value | Notes                                        |
| --------------- | ----- | -------------------------------------------- |
| `--spacing-500` | 20px  | **New**: no 20px spacing in current codebase |

---

## 4. Border Radius

### 4a. New Tokens

| Token             | Value | Notes                                |
| ----------------- | ----- | ------------------------------------ |
| `--radius-100`    | 4px   | Same value as current `--radius-sm`  |
| `--radius-200`    | 6px   | **New value** -- no 6px in codebase  |
| `--radius-300`    | 8px   | Same value as current `--radius-md`  |
| `--radius-400`    | 10px  | **New value** -- no 10px in codebase |
| `--radius-500`    | 12px  | **New value** -- no 12px in codebase |
| `--radius-600`    | 16px  | Same value as current `--radius-lg`  |
| `--radius-700`    | 24px  | Same value as current `--radius-xl`  |
| `--radius-800`    | 999px | **New value** -- pill radius         |
| `--radius-circle` | 50%   | **New** -- avatar/FAB                |

### 4b. Changed Values

| Codebase Token | Value | DS Token       | Value | Notes                |
| -------------- | ----- | -------------- | ----- | -------------------- |
| `--radius-sm`  | 4px   | `--radius-100` | 4px   | Same value, new name |
| `--radius-md`  | 8px   | `--radius-300` | 8px   | Same value, new name |
| `--radius-lg`  | 16px  | `--radius-600` | 16px  | Same value, new name |
| `--radius-xl`  | 24px  | `--radius-700` | 24px  | Same value, new name |

### 4c. Removed Tokens

| Token          | Value | Notes                                                       |
| -------------- | ----- | ----------------------------------------------------------- |
| `--radius-2xl` | 40px  | No 40px radius in DS (max numeric is 24px, then 999px pill) |

---

## 5. Shadows

### 5a. New Tokens

| Token                   | Value                                                       | Notes                               |
| ----------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `--shadow-100`          | `0 1px 2px rgba(0,0,0,0.06)`                                | New naming                          |
| `--shadow-200`          | `0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`    | New, different values               |
| `--shadow-300`          | `0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)`   | New, different values               |
| `--shadow-400`          | `0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)`   | New, different values               |
| `--shadow-500`          | `0 16px 48px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.06)` | New, different values               |
| `--shadow-sell`         | `0 4px 12px rgba(226,119,57,0.45)`                          | **New** -- orange glow for Sell FAB |
| `--shadow-focus-green`  | `0 0 0 3px rgba(30,74,64,0.28)`                             | **New** -- focus ring               |
| `--shadow-focus-orange` | `0 0 0 3px rgba(226,119,57,0.28)`                           | **New** -- focus ring               |
| `--shadow-focus-error`  | `0 0 0 3px rgba(185,28,28,0.22)`                            | **New** -- error focus ring         |

### 5b. Changed Values

Every shadow value is different. The design system uses simpler, warmer shadows with lower opacity.

| Codebase Token  | Codebase Value                                                         | DS Token       | DS Value                                                    |
| --------------- | ---------------------------------------------------------------------- | -------------- | ----------------------------------------------------------- |
| `--shadow-xs`   | `0px 1px 2px 0px rgb(0 0 0 / 8%)`                                      | `--shadow-100` | `0 1px 2px rgba(0,0,0,0.06)`                                |
| `--shadow-sm`   | `0px 1px 2px -1px rgb(0 0 0 / 10%), 0px 1px 3px 0px rgb(0 0 0 / 10%)`  | `--shadow-200` | `0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`    |
| `--shadow-base` | `0px 2px 4px -2px rgb(0 0 0 / 5%), 0px 4px 6px -1px rgb(0 0 0 / 10%)`  | `--shadow-300` | `0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)`   |
| `--shadow-md`   | `0px 4px 6px 0px rgb(0 0 0 / 5%), 0px 10px 15px -3px rgb(0 0 0 / 10%)` | `--shadow-400` | `0 8px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)`   |
| `--shadow-xl`   | `0px 25px 50px -12px rgb(0 0 0 / 25%)`                                 | `--shadow-500` | `0 16px 48px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.06)` |

### 5c. Removed Tokens

| Token            | Value                                     | Notes                         |
| ---------------- | ----------------------------------------- | ----------------------------- |
| `--shadow-lg`    | (broken in codebase -- missing semicolon) | Replaced by `--shadow-400`    |
| `--shadow-modal` | `0px 0px 20px 0px rgb(0 0 0 / 20%)`       | Use `--shadow-500` for modals |

### 5d. Naming Mismatches

| Codebase         | Design System  | Notes                       |
| ---------------- | -------------- | --------------------------- |
| `--shadow-xs`    | `--shadow-100` | Size names -> numeric scale |
| `--shadow-sm`    | `--shadow-200` |                             |
| `--shadow-base`  | `--shadow-300` |                             |
| `--shadow-md`    | `--shadow-400` |                             |
| `--shadow-xl`    | `--shadow-500` |                             |
| `--shadow-modal` | Removed        | Use `--shadow-500`          |

---

## 6. Motion & Animation

### 6a. New Tokens

The entire motion system is new. The codebase has 4 composite transition shorthand tokens. The design system separates duration and easing into independent tokens.

| Token             | Value                               | Notes                                   |
| ----------------- | ----------------------------------- | --------------------------------------- |
| `--duration-100`  | 100ms                               | **New**                                 |
| `--duration-200`  | 180ms                               | **New**                                 |
| `--duration-300`  | 300ms                               | **New**                                 |
| `--duration-400`  | 450ms                               | **New**                                 |
| `--duration-500`  | 600ms                               | **New**                                 |
| `--easing-out`    | `cubic-bezier(0.16, 1, 0.3, 1)`     | **New**                                 |
| `--easing-in`     | `cubic-bezier(0.4, 0, 1, 1)`        | **New** (different curve from codebase) |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Same as codebase bounce curve           |
| `--easing-linear` | `linear`                            | **New**                                 |

### 6b. Changed Values

| Codebase Token        | Codebase Value                               | Notes                                                          |
| --------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `--transition-basic`  | `all ease 0.25s`                             | No equivalent composite; use `--duration-200` + `--easing-out` |
| `--transition-smooth` | `all cubic-bezier(0.4, 0, 0.2, 1) 0.3s`      | Easing curve differs (`0.4,0,0.2,1` vs `0.16,1,0.3,1`)         |
| `--transition-bounce` | `all cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s` | Spring curve same; duration differs (400ms vs 450ms)           |
| `--transition-color`  | `color ease 0.2s, ...`                       | No direct equivalent; compose from duration + easing tokens    |

### 6c. Removed Tokens

| Token                 | Notes                            |
| --------------------- | -------------------------------- |
| `--transition-basic`  | Decompose into duration + easing |
| `--transition-smooth` | Decompose into duration + easing |
| `--transition-bounce` | Decompose into duration + easing |
| `--transition-color`  | Decompose into duration + easing |

### 6d. Architecture Change

The codebase uses **composite transition shorthands** (`all ease 0.25s`). The design system uses **separate duration and easing tokens** that are composed at the component level. This is a cleaner architecture that gives more control.

---

## 7. Z-Index (Entirely New)

The codebase has **no z-index tokens**. The design system introduces 12 z-index tokens plus 6 semantic aliases. This is entirely new.

| Token      | Value | Alias            | Usage                 |
| ---------- | ----- | ---------------- | --------------------- |
| `--z-100`  | 0     | —                | Normal flow           |
| `--z-200`  | 10    | —                | Card hover            |
| `--z-300`  | 20    | —                | —                     |
| `--z-400`  | 100   | `--z-sticky`     | Top nav, filter strip |
| `--z-500`  | 150   | `--z-filter`     | Filter strip          |
| `--z-600`  | 300   | `--z-nav-bottom` | Bottom tab bar        |
| `--z-700`  | 400   | —                | Sheet backdrop        |
| `--z-800`  | 410   | `--z-sheet`      | Bottom sheet          |
| `--z-900`  | 500   | —                | Modal backdrop        |
| `--z-1000` | 510   | `--z-modal`      | Modal panel           |
| `--z-1100` | 600   | `--z-toast`      | Toasts                |
| `--z-1200` | 700   | —                | Tooltip (topmost)     |

---

## 8. Breakpoints

### 8a. Changed Values

| Codebase | Value  | Design System | Value  | Delta                              |
| -------- | ------ | ------------- | ------ | ---------------------------------- |
| `sm`     | 480px  | `sm`          | 375px  | **-105px** (now targets iPhone 14) |
| `md`     | 768px  | `md`          | 768px  | Unchanged                          |
| `lg`     | 1024px | `lg`          | 1024px | Unchanged                          |
| `xl`     | 1200px | `xl`          | 1280px | **+80px**                          |

### 8b. New Breakpoints

| Name | Value | Notes                   |
| ---- | ----- | ----------------------- |
| `xs` | 320px | **New** -- small phones |

---

## 9. Fixed Component Heights (Entirely New)

The codebase has **no height tokens**. The design system introduces 11 height tokens.

| Token                   | Value | Alias            |
| ----------------------- | ----- | ---------------- |
| `--height-nav-top`      | 56px  | `--h-nav-top`    |
| `--height-nav-bottom`   | 60px  | `--h-nav-bottom` |
| `--height-filter-strip` | 40px  | —                |
| `--height-btn-lg`       | 52px  | `--h-btn-lg`     |
| `--height-btn-md`       | 44px  | `--h-btn-md`     |
| `--height-btn-sm`       | 36px  | `--h-btn-sm`     |
| `--height-btn-xs`       | 28px  | `--h-btn-xs`     |
| `--height-input`        | 48px  | `--h-input`      |
| `--height-input-sm`     | 40px  | `--h-input-sm`   |
| `--height-purchase-bar` | 80px  | —                |
| `--min-touch-target`    | 44px  | `--min-tap`      |

---

## Category Summary

| Category    | New      | Changed                             | Removed | Unchanged                                                    |
| ----------- | -------- | ----------------------------------- | ------- | ------------------------------------------------------------ |
| Colors      | 60+      | 14                                  | 28      | 3 (`--color-white`, green-500=primary, orange-500=secondary) |
| Typography  | 28       | 2 (font family, scale architecture) | 10      | 0                                                            |
| Spacing     | 13       | 0 (values same, names changed)      | 3       | 9 (values preserved)                                         |
| Radius      | 9        | 0 (values same, names changed)      | 1       | 4 (values preserved)                                         |
| Shadows     | 9        | 5 (all values differ)               | 2       | 0                                                            |
| Motion      | 9        | 4 (all replaced)                    | 4       | 0                                                            |
| Z-Index     | 18       | 0                                   | 0       | 0 (entirely new)                                             |
| Breakpoints | 1 (xs)   | 2 (sm, xl)                          | 0       | 2 (md, lg)                                                   |
| Heights     | 11       | 0                                   | 0       | 0 (entirely new)                                             |
| **TOTAL**   | **~148** | **~27**                             | **~48** | **~18**                                                      |

---

## Migration Notes

### Breaking Changes

1. **Font family change** (Inter -> DM Sans + DM Serif Display) -- requires Google Fonts swap and updating `next/font` config
2. **Typography architecture** -- modular scale with responsive ratio replaced by 15 fixed pixel sizes. Every font-size usage must be remapped.
3. **Color naming convention** -- `--color-primary/secondary/tertiary` -> `--color-green/orange/maroon-{scale}`. Every color reference must be updated.
4. **Grayscale replacement** -- `--color-gray-*` (pure grey) -> `--color-neutral-*` (warm tones). Different hex values throughout.
5. **Spacing naming** -- `--space-{size}` -> `--spacing-{number}`. Same values, different names.
6. **Shadow values** -- every shadow definition changes; warmer, less contrasty.
7. **Breakpoint changes** -- `sm` drops from 480px to 375px, `xl` rises from 1200px to 1280px.

### Bug Found in Codebase

The current `shadows.scss` has a syntax error on line 11: `--shadow-lg` and `--shadow-xl` are concatenated without a semicolon separator:

```scss
--shadow-lg:
  0px 10px 10px 0px rgb(0 0 0 / 4%),
  0px 20px 25px -5px rgb(0 0 0 / 10%) --shadow-xl: 0px 25px 50px -12px rgb(0 0 0 / 25%);
```

This means `--shadow-lg` is malformed and `--shadow-xl` is never defined as a separate property.
