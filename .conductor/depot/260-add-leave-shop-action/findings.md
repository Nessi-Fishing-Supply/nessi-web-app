# Review Findings: #260

## Summary

0 Blocking, 3 Warning (2 fixed), 3 Info

## Findings

### [W] Modal heading — FIXED

Changed "Leave this shop?" to "Leave shop?" to match plan spec.

### [W] Bullet list voice mismatch — FIXED

Rewrote bullets to use imperative fragments matching the transfer modal pattern.

### [W] `closeModal` callable during pending state

The Modal's `onClose` is not guarded during mutation. Pre-existing pattern (transfer modal has same issue). Deferred to a future cross-modal fix.

### [I] Task 2.2 (SCSS) correctly skipped

Button component styling is sufficient, no positional adjustments needed.

### [I] Additional query invalidation is beneficial

Handler invalidates `['shops', 'member', userId]` and `['shops']` beyond what the hook provides, ensuring shop lists update immediately after leave.

### [I] `getMemberDisplayName` edge case

If user has no first/last name, phrase becomes "I Unknown Member want to leave...". Edge case shared with transfer modal. Onboarding prevents this state.
