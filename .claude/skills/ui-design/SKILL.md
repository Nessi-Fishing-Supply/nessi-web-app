---
name: ui-design
description: Design new components, audit existing ones, or build pages/components from Stitch screen references — tokens, mobile-first, accessibility, pattern consistency
user-invocable: true
argument-hint: "[component spec, file path to audit, or stitch:{screen name}]"
---

# UI Design

Design new Nessi components, audit existing ones against the design system, or build pages and components from Stitch mobile screen references.

## Input

Argument: `{{ argument }}`

## Process

### Step 1: Detect Mode

Parse the argument to determine the mode. Check in this order:

- **Stitch Build mode** — argument starts with `stitch:` or `stitch ` (e.g., `stitch:list`, `stitch: Shop Page - Elias Thorne`, `stitch:21fac35915534733926ba635b74f40e8`)
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

### Step 2C: Stitch Build Mode

Build a page or component from a Stitch screen reference, using Nessi's existing design system.

#### Step 2C.1: Connect to Stitch

Determine what the user wants from the argument after the `stitch:` prefix:

- **`stitch:list` or just `stitch:`** — Browse mode. Call `mcp__stitch__list_projects` to get all projects, then `mcp__stitch__list_screens` for the relevant project. Present a numbered list of screen names with labels and dimensions for the user to pick from.
- **`stitch:{screen name}`** — Search mode. Call `mcp__stitch__list_projects` → `mcp__stitch__list_screens` and find the screen whose `label` or `title` matches the argument (case-insensitive, partial match OK).
- **`stitch:{screenId}`** — Direct mode. If the argument looks like a hex ID, use it directly.

If no match is found, show available screens and ask the user to pick.

Also call `mcp__stitch__get_project` with the project ID to retrieve the project's design theme and design system documentation (`designMd`). This gives the agent context about the Stitch design intent.

#### Step 2C.2: Scope the Build

Ask 2 focused questions:

1. **Target type** — Is this a full page route (`src/app/(frontend)/...`) or a standalone component (`src/components/` or `src/features/{domain}/components/`)?
   - For pages: ask the route path (e.g., `/shop/[slug]`, `/listing/[id]`)
   - For components: ask shared vs feature-scoped, and which domain if feature-scoped
2. **Data source** — Does this need real data (Supabase query via existing service function) or static/mock for now?

If the argument or conversation context already answers these, skip them.

#### Step 2C.3: Pull Screen Data

Call `mcp__stitch__get_screen` with the project ID and screen ID to get:
- Screen HTML/CSS code (download URL)
- Screenshot (download URL)
- Dimensions (width x height)
- Title/label

Present the screenshot URL and screen title to the user: "Building from: **{screen title}** ({width}x{height}) — correct?"

Wait for confirmation before proceeding.

#### Step 2C.4: Launch Agent

Dispatch the **ui-designer** agent with:
- Mode: `stitch-build`
- Screen HTML/CSS data (fetched from the download URL)
- Screen screenshot URL
- Project design theme and `designMd` content
- Target type (page or component)
- Placement path (route or component directory)
- Data source decision (real data or static/mock)

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

**Stitch Build mode:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UI Designer — Stitch Build Complete
   Screen: {screen title}
   Target: {page route or component path}
   Files: {list of created/modified files}
   Token gaps: {count, or "none"}
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

**After stitch build:**
```
Next steps:
  → /write-tests "{path}" — Generate tests for the new page/component
  → /ui-test — Verify rendering in the browser at mobile + desktop
  → /a11y-audit — Run full accessibility audit
  → /ui-design "audit: {path}" — Audit against design system compliance
```
