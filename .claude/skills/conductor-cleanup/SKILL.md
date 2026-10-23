---
name: conductor-cleanup
description: Prune expired depot entries past their retention period
user-invocable: true
---

# Conductor Cleanup

Prune expired entries from the conductor depot.

## Execution

1. Read all `state.json` files in `.conductor/depot/*/`
2. For each entry, check if `pruneAfter` timestamp has passed (compared to current date)
3. Delete directories where `pruneAfter` < now
4. Display results:

```
🚂 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Conductor — Cleanup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Scanned:  {total} depot entries
   Pruned:   {pruned_count} expired entries
   Retained: {retained_count} entries (within 60-day window)
```

If no depot entries exist: display "Depot is empty. Nothing to clean up."

## Retention Policy

- Default retention: 60 days from `completedAt`
- `pruneAfter` is set when a track moves to depot
- Only `depot/` entries are eligible for pruning — never touch `tracks/`
