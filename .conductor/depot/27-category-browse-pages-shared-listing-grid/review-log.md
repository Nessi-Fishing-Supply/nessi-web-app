# Review Log — #27

## Review Cycle 1 — 2026-03-23

### Preflight

- TypeScript: pass
- ESLint: pass (0 errors)
- Stylelint: pass
- Prettier: fixed 3 files (category-browse.tsx, navbar/index.tsx, listings/CLAUDE.md)
- Tests: 194 passed
- Build: pass

### Code Review

- 1 Blocking (B1: InfiniteScroll display:contents breaks loading skeleton layout)
- 4 Warnings (W1: inline styles, W3/W4: hardcoded px, W5: hardcoded font-size)
- 1 Info (I2: Suspense boundary suggestion)

### Decision: needs_fixes

## Fix Cycle 1 — 2026-03-23

### Fixes Applied

- B1: Removed `display: contents`, wrapped loading skeleton in `<ListingGrid>` inside InfiniteScroll
- W1: Created `not-found.module.scss`, moved inline styles to CSS Modules
- W3: Added comment linking skeleton image height to listing-card carousel
- W4: Replaced hardcoded `16px`/`12px` with `var(--font-size-base)`/`var(--font-size-xs)`
- W5: Replaced hardcoded `14px` with `var(--font-size-sm)` in navbar categoryLink
- I2: Added `<Suspense>` boundary around `<CategoryBrowse>` in page.tsx

### Verification

- Build: pass
- Stylelint: pass
- Prettier: pass
