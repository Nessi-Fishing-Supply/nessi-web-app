# Review Findings: #164 — Duplicate listing as draft

## Preflight: All 6 checks passed

## Code Review: Approved — no blocking or warning findings

### [I] Redundant ownership check in API route
The query already filters by `.eq('seller_id', user.id)`, so the subsequent `if (source.seller_id !== user.id)` check is dead code. Harmless defense-in-depth.

### [I] Cross-context duplication behavior
Duplicated drafts use the current context (member/shop), not the source listing's context. This is intentional and documented.

### [I] Toast message format
Toast split into `message` + `description` (better than plan's single string — matches existing patterns).

### [I] Wizard publish flow does not use draftId
The create wizard's `handlePublish` always calls `createListing()` instead of `updateListing(draftId)`. Fields not in the Zustand store (brand, model, quantity, etc.) are preserved on the draft row but lost when a brand-new listing is created on publish. This is a pre-existing limitation, not introduced by this PR.
