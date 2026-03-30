# Review Findings — #302

## Preflight Results

- TypeScript: PASS (1.5s)
- ESLint: PASS (9.1s) — 0 errors, 2 pre-existing warnings
- Stylelint: PASS (1.5s)
- Prettier: PASS after fix (plan.md needed formatting)
- Tests: PASS (5.6s) — 538 tests, 60 suites
- Build: PASS (12.3s) — 54 static pages

## Code Review Findings

### [W] W1: Missing INSERT policy on message_threads

Thread creation is handled via server service (admin client), not directly through RLS INSERT policies — this is by design per the issue spec: "Thread and participant INSERT is handled via server service (admin or server client), not directly through RLS INSERT policies on message_threads or message_thread_participants."

**Action:** Add a comment in the migration documenting this design decision.

### [W] W2: Missing INSERT policy on message_thread_participants

Same as W1 — by design per issue spec.

**Action:** Add a comment in the migration documenting this design decision.

### [W] W3: Bare auth.uid() instead of (SELECT auth.uid()) in RLS policies

The dominant project convention uses `(SELECT auth.uid())` for performance (evaluated once as InitPlan instead of per-row). The messaging tables will grow large.

**Action:** Fix — wrap all `auth.uid()` calls in `(SELECT auth.uid())`.

### [W] W4: Missing UPDATE/DELETE policies on message_threads

Acceptable for foundation migration. Thread status changes will come in the API routes ticket.

**Action:** No action needed now — future ticket scope.

### [W] W5: No DELETE policy on messages

Acceptable for foundation migration. Message editing/deletion will come in a future ticket.

**Action:** No action needed now — future ticket scope.

### [I] I1: update_thread_last_message does not handle NULL content

System messages may have NULL content, causing blank previews.

**Action:** No action — acceptable for foundation. The API layer can handle preview text for non-text message types.

### [I] I2: increment_unread_count theoretical overflow — purely informational, no action.

### [I] I3: Extra types in database.ts diff — expected from full regeneration, no action.
