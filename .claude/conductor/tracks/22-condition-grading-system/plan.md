# Implementation Plan: #22 — Condition grading system

## Overview
3 phases, 8 total tasks
Estimated scope: medium

**Important note on enum values:** The ticket describes enum values `new_unfished`, `excellent`, `very_good`, `good`, `fair`, `for_parts`, but the actual database enum (`listing_condition` in `src/types/database.ts`) uses: `new_with_tags`, `new_without_tags`, `like_new`, `good`, `fair`, `poor`. This plan uses the **actual database enum values**. The constants file must map these to fishing-specific display labels (e.g., `new_with_tags` -> "New with Tags", `like_new` -> "Like New", `poor` -> "Poor / For Parts").

## Phase 1: Foundation — Types and Constants
**Goal:** Define the shared listing types, condition tier constants, and category photo guidance data that all three components depend on.
**Verify:** `pnpm build`

### Task 1.1: Create listing types file with ListingCondition and ListingCategory type aliases
Extract `ListingCondition` and `ListingCategory` type aliases from the generated database types so components can import clean, short type names instead of the verbose `Database['public']['Enums']['listing_condition']` path. Follow the pattern established in `src/features/listings/types/listing-photo.ts`.
**Files:** `src/features/listings/types/listing.ts`
**AC:** `ListingCondition` resolves to the union `'new_with_tags' | 'new_without_tags' | 'like_new' | 'good' | 'fair' | 'poor'` and `ListingCategory` resolves to the full listing_category union, both derived from `Database['public']['Enums']`. File exports both types.
**Expert Domains:** supabase

### Task 1.2: Create condition constants file with tier data and category photo guidance
Create the constants file exporting `CONDITION_TIERS` (an array of objects with `value`, `label`, `shortLabel`, `description`, `color`, `textColor` for each of the 6 condition enum values) and `CATEGORY_PHOTO_GUIDANCE` (a map from category to guidance text for rods, reels, lures, flies, and a generic fallback). The `color` values must be CSS color strings that pass WCAG AA 4.5:1 contrast ratio against white text. Use fishing-specific language for descriptions (e.g., "Like New" -> "Used once or twice, no visible wear. Looks and performs like it just came out of the box."). The `CONDITION_TIERS` array must be ordered from best to worst condition.

Recommended WCAG-AA-compliant colors (all pass 4.5:1 against `#FFFFFF`):
- `new_with_tags`: forest green `#1b7340` (contrast ~5.1:1)
- `new_without_tags`: dark teal `#0e7c6b` (contrast ~4.8:1)
- `like_new`: blue-gray `#456b7a` (contrast ~5.0:1)
- `good`: dark amber `#8a6d00` (contrast ~4.6:1)
- `fair`: burnt orange `#b35900` (contrast ~4.5:1)
- `poor`: red `#c0392b` (contrast ~4.8:1)

**Files:** `src/features/listings/constants/condition.ts`
**AC:** `CONDITION_TIERS` is an array of 6 objects ordered best-to-worst. Each object has `value` (typed as `ListingCondition`), `label`, `shortLabel`, `description`, `color`, and `textColor` fields. `CATEGORY_PHOTO_GUIDANCE` maps at least `rods`, `reels`, `lures`, `flies`, and a `_default` fallback key to guidance strings. File compiles with no type errors.
**Expert Domains:** scss

### Task 1.3: Update barrel exports in listings feature index
Add the new types (`ListingCondition`, `ListingCategory`) and constants (`CONDITION_TIERS`, `CATEGORY_PHOTO_GUIDANCE`) to the listings barrel export at `src/features/listings/index.ts`.
**Files:** `src/features/listings/index.ts`
**AC:** Both types and both constants are re-exported from the barrel file. Existing exports are preserved.

## Phase 2: Core Components — Condition Badge and Condition Selector
**Goal:** Build the two primary components: the color-coded condition badge (for display contexts) and the vertical radio selector (for the listing creation wizard).
**Verify:** `pnpm build`

### Task 2.1: Create condition badge component with popover
Build a `'use client'` component that renders a color-coded pill displaying the condition tier name. The background color comes from `CONDITION_TIERS` and is applied via scoped CSS custom properties (not inline styles for the base colors -- define `--condition-badge-bg` and `--condition-badge-text` as CSS custom properties set inline, with the SCSS module referencing them). Supports `size` prop (`'sm'` | `'md'`, default `'sm'`). On hover (desktop) or tap (mobile), shows a popover with the tier description. The popover uses CSS positioning with React state -- prefer top placement, fall back to bottom if near viewport top. Popover dismisses on mouse-leave (desktop) or tap-outside (mobile). Use `react-icons/hi` for any icons if needed. All interactive elements must have `:focus-visible` styles and minimum 44x44px tap targets on mobile.
**Files:** `src/features/listings/components/condition-badge/index.tsx`, `src/features/listings/components/condition-badge/condition-badge.module.scss`
**AC:** Badge renders with correct background color for each of the 6 conditions. `sm` size uses `font-size: var(--font-size-xs)` with `padding: var(--space-2xs) var(--space-xs)`. `md` size uses `font-size: var(--font-size-sm)` with `padding: var(--space-xs) var(--space-sm)`. Popover appears on hover/tap and shows the condition description. Popover dismisses correctly. Component has `aria-describedby` linking badge to popover content. `:focus-visible` outline is visible on the badge button.
**Expert Domains:** scss, nextjs

### Task 2.2: Create condition selector component with accordion
Build a `'use client'` vertical radio list component for selecting a condition tier during listing creation. Each row shows a radio circle (left), tier name (bold), and one-sentence description (regular weight). The selected tier has a primary-color left border and light primary background. Below the tier list, an expandable accordion section titled "What does this mean for [category]?" shows category-specific photo guidance from `CATEGORY_PHOTO_GUIDANCE` (only rendered when `category` prop is provided). The accordion has a chevron icon (use `HiChevronDown` from `react-icons/hi`) that rotates 180 degrees on expand with a smooth CSS transition. Height transition for accordion content uses `max-height` or `grid-template-rows: 0fr/1fr` technique. Accepts `value`, `onChange`, and optional `category` props. Mobile-first SCSS with `@include breakpoint()`. All rows must have minimum 44x44px tap targets. Radio inputs must have proper `name` attribute, `aria-required`, and the fieldset must have a `<legend>`.
**Files:** `src/features/listings/components/condition-selector/index.tsx`, `src/features/listings/components/condition-selector/condition-selector.module.scss`
**AC:** Renders 6 condition tiers vertically with names and descriptions. Clicking a tier calls `onChange` with the `ListingCondition` value. Only one tier is visually selected at a time (radio behavior). Selected tier has primary-color left border and light background. When `category` is provided, accordion renders and toggles open/closed with chevron rotation. Accordion content shows guidance text for the given category. Without `category` prop, accordion is not rendered. Component uses a `<fieldset>` with `<legend>` for accessibility. `:focus-visible` styles are present on all interactive elements.
**Expert Domains:** scss, nextjs

### Task 2.3: Update barrel exports with badge and selector components
Add the `ConditionBadge` and `ConditionSelector` components to the listings barrel export.
**Files:** `src/features/listings/index.ts`
**AC:** Both components are exported as named exports from the barrel file. All previous exports remain intact.

## Phase 3: Condition Filter and Final Polish
**Goal:** Build the multi-select checkbox filter component and ensure all components pass linting, type checking, and build.
**Verify:** `pnpm build && pnpm lint && pnpm typecheck`

### Task 3.1: Create condition filter component with checkbox group and count badges
Build a `'use client'` vertical checkbox list component for filtering listings by condition. Each row shows a checkbox, the tier name, and an optional right-aligned count badge (rendered when `counts` prop is provided, displayed in `var(--color-gray-400)` text). Multiple checkboxes can be selected simultaneously. Toggling a checkbox calls `onChange` with the updated array of selected `ListingCondition` values. Mobile-first SCSS with `@include breakpoint()`. All checkboxes must have minimum 44x44px tap targets. Use a `<fieldset>` with `<legend>` for accessibility. `:focus-visible` styles on checkboxes.
**Files:** `src/features/listings/components/condition-filter/index.tsx`, `src/features/listings/components/condition-filter/condition-filter.module.scss`
**AC:** Renders 6 condition tiers as checkboxes. Multiple can be selected simultaneously. Toggling calls `onChange` with the correct updated array. Count badges appear next to tier names when `counts` prop is provided and are right-aligned. When `counts` is not provided, count badges are not rendered. Component uses `<fieldset>` with `<legend>`. `:focus-visible` styles are present.
**Expert Domains:** scss, nextjs

### Task 3.2: Final barrel exports and lint/type check pass
Add `ConditionFilter` to the barrel exports. Verify all three components, the types file, and the constants file pass `pnpm build`, `pnpm lint`, `pnpm lint:styles`, and `pnpm typecheck`. Fix any issues found.
**Files:** `src/features/listings/index.ts`
**AC:** `ConditionFilter` is exported from the barrel. `pnpm build` passes. `pnpm lint` passes. `pnpm lint:styles` passes. `pnpm typecheck` passes. All 3 components, the types file, and the constants file are included in the barrel exports.
**Expert Domains:** nextjs
