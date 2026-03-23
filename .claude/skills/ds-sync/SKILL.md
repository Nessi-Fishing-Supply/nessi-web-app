---
name: ds-sync
description: Use when syncing a design system URL into the codebase — extracts tokens, diffs against current SCSS, interviews about changes, and builds an implementation spec
user-invocable: true
argument-hint: "{design-system-url}"
---

# Design System Sync

Sync an external design system into the codebase. Extracts every token from a URL, diffs against current SCSS foundation, walks through changes with the user, and produces an implementation spec.

All output is versioned under `docs/design/` — extraction, diff, spec, plan, and screenshots live together per version, similar to how conductor tracks work.

## Component Showcase

A live component showcase page exists at `/dev/components` (dev-only, hidden in production). This page renders **every working Nessi component** on a single page — foundation tokens, controls, indicators, layout, and feature components.

**When to use it:**
- After applying design token changes, visit `/dev/components` to visually verify every component still looks correct
- During the ds-sync interview, reference the showcase to see how token changes affect real components
- The ds-sync agent automatically screenshots this page before and after token changes for visual diff

**When adding new components:** Update `src/app/(frontend)/dev/components/page.tsx` to include the new component with representative props and states.

## Directory Structure

```
docs/design/
├── v1/
│   ├── extraction.md        # Full token extraction from URL
│   ├── diff-report.md       # Diff against codebase (+ previous version if exists)
│   ├── spec.md              # Approved implementation spec
│   ├── plan.md              # Phased implementation plan
│   ├── screenshots/         # Section screenshots from the design system
│   └── metadata.json        # URL, timestamp, token counts
├── v2/
│   └── ...                  # Next sync
├── latest -> v2/            # Symlink to most recent
└── component-showcase-reference.html  # Scraped Stitch design system reference
```

## Process

```dot
digraph ds_sync {
  "Receive URL" [shape=box];
  "Detect version" [shape=box];
  "Launch ds-sync agent" [shape=box];
  "Agent extracts + diffs" [shape=box];
  "Present diff report" [shape=box];
  "Interview: section by section" [shape=box];
  "User approves?" [shape=diamond];
  "Write spec to version dir" [shape=box];
  "Invoke writing-plans" [shape=doublecircle];

  "Receive URL" -> "Detect version";
  "Detect version" -> "Launch ds-sync agent";
  "Launch ds-sync agent" -> "Agent extracts + diffs";
  "Agent extracts + diffs" -> "Present diff report";
  "Present diff report" -> "Interview: section by section";
  "Interview: section by section" -> "User approves?";
  "User approves?" -> "Interview: section by section" [label="revisions"];
  "User approves?" -> "Write spec to version dir" [label="yes"];
  "Write spec to version dir" -> "Invoke writing-plans";
}
```

## Steps

### 1. Detect Version

Scan `docs/design/` for existing `v*` directories. Next version = highest + 1. First sync = `v1`.

### 2. Launch Extraction Agent

Dispatch the **ds-sync** agent with:
- `url`: The design system URL from the user's argument
- `version`: Detected version (e.g., `v2`)
- `baseDir`: `docs/design/`

Wait for the agent to complete. It produces:
- `docs/design/{version}/extraction.md` — full token extraction
- `docs/design/{version}/diff-report.md` — diff against codebase (and previous version)
- `docs/design/{version}/screenshots/` — section screenshots
- `docs/design/{version}/metadata.json` — sync metadata

### 3. Present the Diff Report

Summarize the diff report for the user:
- Category summary table (new/changed/removed per category)
- Highlight breaking changes (renamed tokens, removed tokens, value shifts)
- Call out tokens with no equivalent in the design system
- If v2+, highlight what changed since last sync

### 4. Interview — Section by Section

Walk through each token category one at a time:
1. **Colors** — palette changes, new scales, naming convention
2. **Typography** — font families, size scale, weights, line heights
3. **Spacing** — grid system, scale values
4. **Radius** — new values, naming
5. **Shadows** — new definitions, naming
6. **Motion** — durations, easings, keyframes
7. **Z-Index** — stacking order
8. **Heights** — fixed component dimensions
9. **Breakpoints** — viewport values

For each section:
- Show what's changing (old → new)
- Ask about naming preferences (numbered scales, named tokens, etc.)
- Ask about migration strategy for existing usages
- Propose a token mapping and get approval

Only ask **one question per message**. Prefer multiple choice when possible.

### 5. Write Implementation Spec

Once all sections are approved, write the spec to `docs/design/{version}/spec.md` containing:
- All approved token definitions (with exact SCSS `:root` blocks)
- Token migration map (old name → new name for every token)
- File change list (which files need updates)
- Implementation phases
- Verification steps
- Risks and rollback plan

Commit the spec.

### 6. Visual Verification via Component Showcase

After all sections are approved in the spec but **before** implementation begins:

1. Ensure the dev server is running (`pnpm dev`)
2. Navigate to `http://localhost:3000/dev/components` using Playwright
3. Take a full-page screenshot and save to `docs/design/{version}/screenshots/showcase-before.png`
4. Present the screenshot to the user: "Here's how all components currently look. After implementation, we'll screenshot again to verify nothing broke."

After implementation is complete (post-plan execution):

1. Take another full-page screenshot: `docs/design/{version}/screenshots/showcase-after.png`
2. Present both screenshots side-by-side for visual diff
3. Flag any components that look visually broken or misaligned

### 7. Transition

Invoke the **writing-plans** skill to create a phased implementation plan. Save the plan to `docs/design/{version}/plan.md`.

## Key Rules

- Never skip the interview. Every token change goes through the user.
- One question per message during the interview.
- The user's naming preferences override the design system's naming.
- If the design system has tokens not in the codebase, ask whether to add them.
- If the codebase has tokens not in the design system, ask whether to keep or remove them.
- All output goes in `docs/design/{version}/`, not scattered across the project.
- Screenshots go in `docs/design/{version}/screenshots/`, never the project root.
- Always screenshot the component showcase (`/dev/components`) before and after token implementation for visual regression verification.
- When new components are added to the codebase, update the showcase page (`src/app/(frontend)/dev/components/page.tsx`) to include them.
