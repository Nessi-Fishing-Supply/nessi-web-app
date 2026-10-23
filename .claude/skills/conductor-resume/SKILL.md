---
name: conductor-resume
description: Resume an interrupted conductor track from its last persisted state
user-invocable: true
---

# Conductor Resume

Resume an interrupted conductor track. This handles cases where Claude disconnected, the terminal closed, or the session timed out.

## Execution

1. Read `.conductor/active.json` to find the active track
   - If no active track exists, check if an issue number was provided and look for it in `tracks/`
   - If still nothing found: display "No active conductor track to resume." and exit
2. Read `state.json` from the track directory
3. Display resume banner:
   ```
   🚂 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Conductor — #{issue}
      Resuming from: {status}
      Phase {current}/{total}, Task: {current_task_id}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

## Resume Logic by Status

### `planning`
- The plan may be incomplete or missing. Re-run the planning step from conductor-start Step 2.

### `implementing`
- Read `state.json` to find the current task (`phase.tasks.current`)
- If current task is null but remaining tasks exist: pick the next remaining task
- Resume implementation from conductor-start Step 3, starting at the current task
- Do NOT re-execute completed tasks or re-commit completed phases

### `reviewing`
- Re-run the review step from conductor-start Step 4

### `needs_fixes`
- Read `findings.md` for outstanding findings
- Resume the fix flow from conductor-start Step 5

### `fixing`
- Check `review-log.md` for what's already been fixed
- Resume fixing remaining findings, then proceed to re-review

### `complete`
- Proceed directly to PR creation (conductor-start Step 6)

### `blocked`
- Display the blocked state and reason
- Ask if the issue has been resolved and whether to retry the failing task
- If retrying: reset `failureCount.currentTask` to 0, update status to `implementing`, and resume

### `pr_open`
- Track is already complete. Display the PR URL if available and suggest archival.

## Critical Rules

- Read `state.json` fresh — never assume state from context
- Every state transition MUST be persisted to disk immediately
- Do not re-execute completed tasks or re-commit completed phases
- Update `timestamps.lastActivity` on resume
