# Review Findings — #205

## Preflight Results

- TypeScript: PASS
- ESLint: PASS (7 pre-existing warnings, 0 in new files)
- Stylelint: PASS
- Prettier: PASS (fixed CLAUDE.md formatting)
- Tests: PASS (490/490)
- Build: TypeScript compilation PASS (static generation fails due to pre-existing missing Supabase env vars)

## Code Review Findings

### [B] CLAUDE.md documents a diverged architecture

The generated CLAUDE.md describes a substantially different design than what was built:

- Wrong utility filename (`recently-viewed-storage.ts` vs `recently-viewed.ts`)
- Wrong type shape (5-field vs 2-field RecentlyViewedItem)
- Non-existent hook returns (`remove`, `isViewed`)
- Non-existent utility functions (`removeRecentlyViewed`, `isRecentlyViewed`)
- Non-existent `RecentlyViewedStore` type
- Documents `components/recently-viewed-shelf/` which is out of scope for this ticket
  **File:** `src/features/recently-viewed/CLAUDE.md`

### [W] writeStorage is not internally SSR-guarded

`writeStorage` directly accesses `localStorage` and `window` without its own guard. Safe today because callers guard, but a footgun for future contributors adding functions.
**File:** `src/features/recently-viewed/utils/recently-viewed.ts`

### [W] Hook test missing viewedAt assertion on re-view

The deduplication hook test verifies position but not that `viewedAt` is updated on re-view. The utility test covers this, but the hook should verify it at the hook API level.
**File:** `src/features/recently-viewed/hooks/__tests__/use-recently-viewed.test.ts`

### [I] useCallback on stable module references is no-ops

`add` and `clear` in the hook wrap already-stable function references — consistent with guest-cart pattern but strictly unnecessary.
**File:** `src/features/recently-viewed/hooks/use-recently-viewed.ts`
