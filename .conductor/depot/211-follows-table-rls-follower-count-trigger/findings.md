# Review Findings — #211

## Preflight: 6/6 passed

- TypeScript: pass
- ESLint: pass (2 pre-existing warnings in scripts/)
- Stylelint: pass
- Prettier: pass
- Tests: pass (538 tests)
- Build: pass

## Code Review Findings

### [W] Fixed: follower_count can go negative under concurrent deletes

- **File:** `supabase/migrations/20260326200000_create_follows.sql`
- **Issue:** Trigger decremented unconditionally without floor clamp
- **Fix:** Applied `GREATEST(follower_count - 1, 0)` to both decrement paths
- **Status:** Resolved — migration file and live DB updated

### [I] UNIQUE index makes explicit follower_id index partially redundant

- **File:** `supabase/migrations/20260326200000_create_follows.sql`
- **Issue:** Composite UNIQUE already indexes follower_id as leading column
- **Fix:** No action — matches plan spec, harmless at this scale

### [I] Polymorphic target_id has no referential integrity enforcement

- **File:** `supabase/migrations/20260326200000_create_follows.sql`
- **Issue:** Intentional design — same as flags pattern
- **Fix:** Added validation responsibility note to follows CLAUDE.md

### [I] CLAUDE.md validation guidance

- **File:** `src/features/follows/CLAUDE.md`
- **Issue:** Missing note about app-layer validation for target_id
- **Fix:** Added guidance matching flags CLAUDE.md pattern
