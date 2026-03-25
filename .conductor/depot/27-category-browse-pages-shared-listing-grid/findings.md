# Review Findings — #27

## Preflight Results

- TypeScript: pass (4.1s)
- ESLint: pass (0 errors, 4 pre-existing warnings)
- Stylelint: pass
- Prettier: fixed (3 files reformatted)
- Tests: pass (194 tests, 1.4s)
- Build: pass

## Code Review Findings

### [B] B1: InfiniteScroll `display: contents` breaks skeleton/end-message layout

- **File:** `src/features/listings/components/infinite-scroll/index.tsx` + SCSS
- **Issue:** `display: contents` on the wrapper means ListingSkeleton (during fetchNextPage) and end message render outside the CSS Grid context. They stack vertically instead of appearing in the grid layout.
- **Fix:** Wrap the loading skeleton in a `<ListingGrid>` inside InfiniteScroll, and ensure end message spans full width properly.

### [W] W1: not-found.tsx uses inline styles instead of CSS Modules

- **File:** `src/app/(frontend)/category/[slug]/not-found.tsx`
- **Fix:** Create `not-found.module.scss` and move styles there.

### [W] W3: Skeleton image placeholder uses hardcoded 224px

- **File:** `src/features/listings/components/listing-skeleton/listing-skeleton.module.scss`
- **Fix:** Add comment noting dependency on listing-card carousel height.

### [W] W4: Skeleton text lines use hardcoded 16px/12px

- **File:** `src/features/listings/components/listing-skeleton/listing-skeleton.module.scss`
- **Fix:** Replace with design tokens.

### [W] W5: Navbar category font-size uses hardcoded 14px

- **File:** `src/components/navigation/navbar/navbar.module.scss`
- **Fix:** Replace with `var(--font-size-sm)`.

### [I] I2: Consider Suspense boundary for useSearchParams

- **File:** `src/app/(frontend)/category/[slug]/page.tsx`
- **Suggestion:** Wrap `<CategoryBrowse>` in `<Suspense>` for future Next.js compatibility.
