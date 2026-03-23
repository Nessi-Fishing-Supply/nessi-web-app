---
name: ui-design
description: Design new components or audit existing ones — tokens, mobile-first, accessibility, pattern consistency
user-invocable: true
argument-hint: "[component spec or file path to audit]"
---

# UI Design

Design new Nessi components or audit existing ones against the design system.

## Input

Argument: `{{ argument }}`

## Process

### Step 1: Detect Mode

Parse the argument to determine the mode. Check in this order:

- **Audit mode** — argument looks like a file path (contains `/`, `.tsx`, `.scss`, or `.module`) or is prefixed with `audit:`
- **Design mode** — argument is a component description or is prefixed with `design:`
- If ambiguous, ask the user which mode they intend

### Step 2A: Design Mode

Ask 2-3 scoping questions before launching the agent:

1. **Placement** — Should this be a shared component (`src/components/`) or feature-scoped (`src/features/{domain}/components/`)? If it's clearly domain-specific, suggest feature-scoped.
2. **Responsive needs** — Any specific breakpoint behavior? (e.g., "stack vertically on mobile, side-by-side on tablet+")
3. **Interactive states** — Which states matter? (hover, active, disabled, loading, error, empty)

If the argument already answers these questions, skip them.

Then launch the **ui-designer** agent with:
- Component name and description
- Placement decision
- Responsive requirements
- Interactive states
- Mode: `design`

### Step 2B: Audit Mode

Resolve the file path. If a component name was given instead of a path, search for it.

Ask one question:
- **Fix mode** — Should I fix issues directly, or report only? (default: report)

Then launch the **ui-designer** agent with:
- File path(s) to audit (TSX + SCSS)
- Fix mode (report or fix)
- Mode: `audit`

### Step 3: Display Results

Show the agent's output with the branded banner:

**Design mode:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UI Designer — Design Complete
   Component: {name}
   Files: {list}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Audit mode:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UI Designer — Audit Report
   Component: {name}
   Score: {score}/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Offer Next Steps

**After design:**
```
Next steps:
  → /write-tests "{component path}" — Generate tests for the new component
  → /ui-test — Verify it renders correctly in the browser
  → /a11y-audit — Run full accessibility audit
```

**After audit:**
```
Next steps:
  → /ticket-gen "design system fixes — {component}" — Create tickets for findings
  → /ui-design "audit: {another component}" — Audit another component
```
