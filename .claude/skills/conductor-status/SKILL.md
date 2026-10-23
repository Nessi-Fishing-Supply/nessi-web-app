---
name: conductor-status
description: Read-only status dashboard showing current conductor progress, health checks, and next action
user-invocable: true
---

# Conductor Status

Display a read-only status dashboard for the current conductor track.

## Execution

1. Read `.conductor/active.json` to find the active track
   - If no active track: display "No active conductor track." and exit
2. Read `state.json` from the active track directory
3. Read `plan.md` if it exists (for phase/task names)

## Display Format

```
🚂 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Conductor — #{issue}
   {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Status:    {status}
   Branch:    {branch}
   Phase:     {current}/{total} — {phase_title}
   Task:      {current_task_id} — {current_task_title}
   Progress:  {progress_bar} {percent}%

   Health:
     Build:   {build_status}
     Lint:    {lint_status}
     Tests:   {test_status}

   Tasks:     {completed_count} done, {remaining_count} remaining
   Started:   {started_timestamp}
   Activity:  {last_activity_timestamp}

   Next:      {next_action_description}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Progress Bar

Calculate from completed tasks / total tasks. Use block characters, 20 chars wide:
```
█ (U+2588) for filled
░ (U+2591) for empty
```

### Next Action

Based on current status:
- `planning` → "Generating implementation plan..."
- `implementing` → "Executing task {id}: {title}"
- `reviewing` → "Running quality checks..."
- `needs_fixes` → "Resolving {count} findings..."
- `fixing` → "Applying fixes..."
- `complete` → "Ready for PR creation"
- `pr_open` → "PR created — track archived"
- `blocked` → "Blocked — awaiting human intervention. See issue comments."

### Health Status Symbols

- `pass` → ✅
- `fail` → ❌
- `unknown` → ⏳

## This skill is read-only. Do NOT modify any state files.
