# Review Findings — #212

## Preflight: 6/6 passed

- TypeScript: pass
- ESLint: pass (2 pre-existing warnings in scripts/)
- Stylelint: pass
- Prettier: pass
- Tests: pass (538 tests)
- Build: pass

## Code Review Findings

### [W] Fixed: Cache rollback ordering in useFollowToggle

- **File:** `src/features/follows/hooks/use-follow-toggle.ts`
- **Issue:** 409/404 check happened after rollback, causing brief visual flicker
- **Fix:** Moved 409/404 early return before rollback logic
- **Status:** Resolved

### [I] Member name construction does not handle null first_name/last_name

- **File:** `src/features/follows/services/follow-server.ts`
- **Issue:** Template literal may produce "null Smith" if columns nullable
- **Fix:** No action — members table requires first_name/last_name in onboarding

### [I] getFollowerCountServer creates Supabase client despite public endpoint

- **File:** `src/features/follows/services/follow-server.ts`, `src/app/api/follows/count/route.ts`
- **Issue:** Works correctly since route handler has request context
- **Fix:** No action needed

### [I] unfollowTarget uses string interpolation for query params

- **File:** `src/features/follows/services/follow.ts`
- **Issue:** Could use URLSearchParams for safety
- **Fix:** No action — type constraints make injection impossible
