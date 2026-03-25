# Implementation Plan: #153 — Social sharing on listings — Web Share API + copy link

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Create ShareButton component

**Goal:** Build the self-contained ShareButton component with Web Share API feature detection, clipboard fallback, toast integration, and accessible SCSS styling.
**Verify:** `pnpm build`

### Task 1.1: Create ShareButton component with Web Share API and clipboard fallback

Create a client component at `src/features/listings/components/share-button/` that accepts `listingId` and `listingTitle` props. On click, detect `navigator.share` support — if available, call `navigator.share({ title, url })` wrapped in try/catch (silently catch `AbortError` when the user dismisses the share sheet, re-throw other errors). If `navigator.share` is not available, copy the URL (`window.location.origin + '/listing/' + listingId`) to the clipboard via `navigator.clipboard.writeText()` and show a "Link copied!" success toast using `useToast` from `@/components/indicators/toast/context`. Render as a `<button>` element with `HiOutlineShare` icon from `react-icons/hi`, `aria-label="Share this listing"`, and `type="button"`. Follow the existing pattern in listing-detail where icon buttons use native `<button>` elements (like the report link), not the shared Button component.
**Files:** `src/features/listings/components/share-button/index.tsx`
**AC:** Component renders an icon-only button; calls `navigator.share` when available; copies URL and shows toast when not available; catches `AbortError` silently; has `aria-label="Share this listing"`.
**Expert Domains:** nextjs

### Task 1.2: Create ShareButton SCSS module with 44x44px tap target and focus styles

Create the SCSS module for the share button. Style it as an icon-only button: transparent background, no border, `color: var(--color-neutral-500)`, darkens to `var(--color-neutral-700)` on hover. Minimum 44x44px tap target (use `min-width` and `min-height`). Add `:focus-visible` outline matching the project pattern (`outline: 2px solid var(--color-primary-500); outline-offset: 2px`) — same as the `.reportLink` style in `listing-detail.module.scss`. Use `margin-left: auto` so the button pushes to the right side of the conditionRow flex container. Set icon font-size to `var(--font-size-900)` for comfortable tap target. Use `display: inline-flex; align-items: center; justify-content: center; cursor: pointer`.
**Files:** `src/features/listings/components/share-button/share-button.module.scss`
**AC:** Button has min 44x44px dimensions; neutral-500 color with neutral-700 hover; focus-visible outline with primary-500; margin-left auto for right-alignment in flex row; all values use CSS custom property tokens (no hardcoded hex/px).
**Expert Domains:** scss

## Phase 2: Integrate into listing detail and create wizard

**Goal:** Place the ShareButton in the listing detail page conditionRow and add a sharing subtitle to the post-publish success toast in the create wizard.
**Verify:** `pnpm build`

### Task 2.1: Add ShareButton to listing detail page conditionRow

Import `ShareButton` into `src/app/(frontend)/listing/[id]/listing-detail.tsx` and place it inside the existing `.conditionRow` div, after the `ConditionBadge` and optional quantity badge. Pass `listingId={listing.id}` and `listingTitle={listing.title}`. The `margin-left: auto` on the share button CSS will push it to the far right of the flex row. No changes needed to `listing-detail.module.scss` since conditionRow is already `display: flex; align-items: center` and the share button handles its own positioning.
**Files:** `src/app/(frontend)/listing/[id]/listing-detail.tsx`
**AC:** ShareButton renders in the conditionRow on every listing detail page (logged in, logged out, own listing, other listing, sold listing); positioned to the right of condition badge and quantity badge; does not break existing conditionRow layout.
**Expert Domains:** nextjs

### Task 2.2: Add sharing subtitle to post-publish success toast

In the create wizard's `handlePublish` function, add `subtitle: 'Share it with friends to get more views!'` to the existing `showToast` call on successful publish (line 317-321). The toast context already supports an optional `subtitle` field in `ToastData`. No other changes needed.
**Files:** `src/features/listings/components/create-wizard/index.tsx`
**AC:** After successfully publishing a listing, the success toast displays the subtitle "Share it with friends to get more views!" below the description; existing toast message and description remain unchanged.
**Expert Domains:** nextjs
