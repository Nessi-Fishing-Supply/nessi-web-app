# ds-sync-components Skill & Agent + Stitch Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new ds-sync-components skill and agent that extracts atomic design components from an HTML design system URL and scaffolds them as React + SCSS files, plus remove all Stitch references from the codebase.

**Architecture:** Separate skill (`.claude/skills/ds-sync-components/SKILL.md`) orchestrates a new agent (`.claude/agents/ds-sync-components/AGENT.md`) that uses Playwright to extract component specs from a design system URL, then generates scaffolded React + SCSS files placed according to documented rules. The skill handles the user interview and approval flow.

**Tech Stack:** Claude Code skills/agents (Markdown), Playwright (browser automation), React + TypeScript + SCSS Modules (generated scaffolds)

**Spec:** `docs/superpowers/specs/2026-03-23-ds-sync-components-design.md`

---

## File Structure

### New Files

| File                                         | Responsibility                                               |
| -------------------------------------------- | ------------------------------------------------------------ |
| `.claude/agents/ds-sync-components/AGENT.md` | Agent definition — extraction, analysis, scaffold generation |
| `.claude/skills/ds-sync-components/SKILL.md` | Skill definition — orchestration, interview, approval flow   |

### Modified Files

| File                                  | Change                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `.mcp.json`                           | Remove `stitch` server entry                                                            |
| `CLAUDE.md`                           | Remove Stitch references, add ds-sync-components to agent/skill tables                  |
| `README.md`                           | Remove Stitch references (MCP table, shell env, setup instructions)                     |
| `.claude/skills/ui-design/SKILL.md`   | Remove Stitch Build mode entirely, update description                                   |
| `.claude/agents/ui-designer/AGENT.md` | Remove `mcp__stitch__*` from allowedTools, remove Stitch Build mode, update description |
| `.claude/skills/ds-sync/SKILL.md`     | Update "Scraped Stitch design system reference" to "Design system reference HTML"       |

---

## Task 1: Remove Stitch from `.mcp.json`

**Files:**

- Modify: `.mcp.json`

- [ ] **Step 1: Remove the stitch server entry**

The entire file is currently just the stitch server. Replace with an empty mcpServers object:

```json
{
  "mcpServers": {}
}
```

- [ ] **Step 2: Commit**

```bash
git add .mcp.json
git commit -m "chore: remove Stitch MCP server — no longer in use"
```

---

## Task 2: Remove Stitch from `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Read the current file**

Read `CLAUDE.md` fully to locate all Stitch references.

- [ ] **Step 2: Remove Shell Environment section**

Remove the `### Shell Environment (\`.zshrc\`)`section that exports`STITCH_API_KEY`. This includes the heading, the description paragraph, the code block, and the "These are referenced via..." note.

- [ ] **Step 3: Remove MCP Servers section**

Remove the entire `## MCP Servers` section — the heading, the description paragraph, and the table with the `stitch` entry. Since Stitch was the only MCP server, the whole section goes.

- [ ] **Step 4: Clean up ui-design references**

In the AI Development Fleet section, find the `/ui-design` entry. Remove the Stitch Build and Stitch Browse bullet points:

- `- Stitch Build: /ui-design "stitch: Shop Page - Elias Thorne" — builds page/component from Stitch screen reference`
- `- Stitch Browse: /ui-design "stitch:list" — browse all Stitch screens to pick from`

- [ ] **Step 5: Verify ds-sync references**

Verify the `/ds-sync` entry in CLAUDE.md does not contain Stitch references. (Current content has none — no change needed. If any are found, remove them.)

- [ ] **Step 6: Add ds-sync-components to the fleet**

In the AI Development Fleet > Development Tools section, add:

```
- **`/ds-sync-components "{url}"`** — Extract atomic design components from a design system URL and scaffold React + SCSS files with smart placement
```

In the Agents table, update the Design layer to include `ds-sync-components`:

```
| Design    | ux-researcher, marketplace-audit, ui-designer, ds-sync, ds-sync-components |
```

- [ ] **Step 6b: Note about Key Directories updates**

The Key Directories section in CLAUDE.md will be updated as part of Task 7 (agent Phase 7) when the agent creates new feature directories (e.g., `src/features/messaging/`, `src/features/dashboard/`, `src/features/editorial/`). Those directories don't exist yet — they'll be created when the agent runs for the first time. No Key Directories update is needed now.

- [ ] **Step 7: Verify and commit**

Grep for any remaining "stitch" or "STITCH" references in CLAUDE.md. Fix any found.

```bash
git add CLAUDE.md
git commit -m "docs: remove Stitch references, add ds-sync-components to CLAUDE.md"
```

---

## Task 3: Remove Stitch from `README.md`

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Read the current file**

Read `README.md` to locate all Stitch references.

- [ ] **Step 2: Remove Stitch from Shell Environment**

Remove the `export STITCH_API_KEY="your-stitch-api-key"` line from the shell environment code block.

- [ ] **Step 3: Remove Stitch from MCP Servers table**

Remove the `stitch` row from the MCP Servers table. If it's the only row, remove the entire MCP Servers section (heading, description, table, setup note).

- [ ] **Step 4: Verify and commit**

Grep for any remaining Stitch references. Fix any found.

```bash
git add README.md
git commit -m "docs: remove Stitch references from README"
```

---

## Task 4: Remove Stitch from ui-design skill

**Files:**

- Modify: `.claude/skills/ui-design/SKILL.md`

- [ ] **Step 1: Read the current file**

Read `.claude/skills/ui-design/SKILL.md` fully.

- [ ] **Step 2: Update frontmatter**

Change the `description` to remove "Stitch screen references":

```yaml
description: Design new components or audit existing ones — tokens, mobile-first, accessibility, pattern consistency
```

Change the `argument-hint` to remove stitch option:

```yaml
argument-hint: '[component spec or file path to audit]'
```

- [ ] **Step 3: Update intro paragraph**

Change the opening line to:

```
Design new Nessi components or audit existing ones against the design system.
```

- [ ] **Step 4: Remove Stitch Build mode from Step 1 (Detect Mode)**

Remove the Stitch Build mode bullet from the mode detection list:

```
- **Stitch Build mode** — argument starts with `stitch:` or `stitch ` (e.g., ...)
```

- [ ] **Step 5: Remove Step 2C entirely**

Delete the entire "### Step 2C: Stitch Build Mode" section and all its sub-steps (2C.1 through 2C.4).

- [ ] **Step 6: Remove Stitch Build from Step 3 (Display Results)**

Remove the "After stitch build:" output banner section.

- [ ] **Step 7: Remove Stitch Build from Step 4 (Offer Next Steps)**

Remove the "After stitch build:" next steps section.

- [ ] **Step 8: Verify and commit**

Grep the file for any remaining "stitch" or "Stitch" references. Fix any found.

```bash
git add .claude/skills/ui-design/SKILL.md
git commit -m "refactor: remove Stitch Build mode from ui-design skill"
```

---

## Task 5: Remove Stitch from ui-designer agent

**Files:**

- Modify: `.claude/agents/ui-designer/AGENT.md`

- [ ] **Step 1: Read the current file**

Read `.claude/agents/ui-designer/AGENT.md` fully.

- [ ] **Step 2: Update frontmatter**

Change `description` to remove "Stitch screen references":

```yaml
description: Designs new Nessi components or audits existing ones — brand tokens, mobile-first, accessibility
```

Remove `mcp__stitch__*` from `allowedTools`.

- [ ] **Step 3: Update intro paragraph**

Remove "or build pages and components from Stitch screen references" from the opening paragraph. Remove "and **Stitch Build**" from the mode list.

- [ ] **Step 4: Remove Stitch Build mode section**

Delete the entire "## Mode: Stitch Build" section and all its sub-sections (Steps 1-7, Input, Output).

- [ ] **Step 5: Verify and commit**

Grep for remaining Stitch references. Fix any found.

```bash
git add .claude/agents/ui-designer/AGENT.md
git commit -m "refactor: remove Stitch Build mode from ui-designer agent"
```

---

## Task 6: Update ds-sync skill reference

**Files:**

- Modify: `.claude/skills/ds-sync/SKILL.md`

- [ ] **Step 1: Update the Stitch reference**

On line 39, change:

```
└── component-showcase-reference.html  # Scraped Stitch design system reference
```

to:

```
└── component-showcase-reference.html  # Design system reference HTML
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/ds-sync/SKILL.md
git commit -m "docs: update ds-sync reference — remove Stitch mention"
```

---

## Task 7: Create ds-sync-components agent

**Files:**

- Create: `.claude/agents/ds-sync-components/AGENT.md`

- [ ] **Step 1: Write the agent file**

Create `.claude/agents/ds-sync-components/AGENT.md` with the full agent definition. The agent must include:

**Frontmatter:**

```yaml
---
name: ds-sync-components
description: Extracts atomic design components from a URL and scaffolds React + SCSS files with smart placement rules
model: opus
color: cyan
tools: Read, Write, Edit, Bash, Grep, Glob
allowedTools:
  - mcp__plugin_playwright_playwright__*
maxTurns: 100
---
```

**Content sections (reference the spec at `docs/superpowers/specs/2026-03-23-ds-sync-components-design.md` for full details):**

1. **Intro** — Role description. You are a component extraction and scaffolding agent.

2. **Inputs** — `url` (design system URL), `version` (e.g., `v1`)

3. **Placement Rules** — Copy the full placement rules table from the spec. This is the agent's primary reference for auto-sorting components to codebase locations. Include the ambiguity threshold note.

4. **Phase 1: Extract Components from URL** — Navigate via Playwright, click through sidebar sections (Navigation, Atoms, Molecules, Trust & Identity, Dashboard, Unique/Editorial, Organisms, Feedback, Patterns). For each section: snapshot DOM, extract HTML structure, variants, states, token usage, responsive behavior, a11y attributes. Take screenshots per section.

5. **Phase 2: Derive Props & Types** — For each component, derive TypeScript props interface: variant unions, state booleans, content slots, event handlers, className pass-through.

6. **Phase 3: Read Codebase & Map Data** — Read `src/types/database.ts`, `src/features/*/services/`, `src/features/*/hooks/`. For each component: check if it already exists (skip scaffold if yes, still document), check if data layer exists (mark for live wiring), note required imports.

7. **Phase 4: Apply Placement Rules** — Sort each component using the rules table. Flag ambiguous ones.

8. **Phase 5: Write Extraction Documents** — Write to `docs/design/{version}/components/`:
   - `extraction.md` — full per-component extraction grouped by atomic level
   - `placement.md` — placement decisions with rule applied
   - `data-mapping.md` — live-wired vs typed-props-only
   - `screenshots/` — section screenshots
   - `metadata.json` — use the full JSON schema from the spec (spec section "Phase 5: Write Extraction Documents", the `metadata.json schema` block). Must include `url`, `version`, `timestamp`, `tokenVersion`, `componentCount`, `categories` object, and arrays: `existing`, `new`, `liveDataWired`, `typedPropsOnly`

9. **Phase 6: Generate Scaffolds** — For each new component (not already existing):
   - `index.tsx` — TypeScript props interface, functional component, template literal className logic, `next/image` for images, live data imports where available, a11y attributes, mobile-first
   - `component-name.module.scss` — imports from `src/styles/variables/`, `@include breakpoint()` responsive, flat class names, variant classes, state styles

10. **Phase 7: Update Dependents** — Append to `src/components/controls/index.ts` barrel (only barrel that exists). Create new feature directories with minimal CLAUDE.md for domains that don't exist. Update root CLAUDE.md agents table. Do NOT add to showcase page.

11. **Phase Boundaries** — Document that extraction docs are the checkpoint. Copy the partial completion recovery table from the spec (spec section "Phase Boundaries & Partial Completion"). Include the `--scaffold-only` flag for re-runs that skip extraction.

12. **Scaffold Conventions** — Document:
    - File structure: `component-name/index.tsx` + `component-name/component-name.module.scss`
    - No per-component barrel files
    - Template literal concatenation for conditional classNames (no `clsx`)
    - Follow existing codebase patterns exactly (kebab-case files, PascalCase exports, `styles` import name)
    - `next/image` with `sizes` for all image slots
    - Accessibility: ARIA attributes, semantic HTML, 44px touch targets, focus-visible
    - Do NOT add scaffolded components to the showcase page — they are added when finalized

- [ ] **Step 2: Commit**

```bash
git add .claude/agents/ds-sync-components/AGENT.md
git commit -m "feat: create ds-sync-components agent for atomic design extraction and scaffolding"
```

---

## Task 8: Create ds-sync-components skill

**Files:**

- Create: `.claude/skills/ds-sync-components/SKILL.md`

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/ds-sync-components/SKILL.md` with the full skill definition. The skill must include:

**Frontmatter:**

```yaml
---
name: ds-sync-components
description: Use when syncing atomic design components from a design system URL into the codebase — extracts component specs, scaffolds React + SCSS files with smart placement
user-invocable: true
argument-hint: '{design-system-url}'
---
```

**Content sections (reference the spec for full details):**

1. **Intro** — Extract atomic design components from an external design system and scaffold them into the codebase as React + SCSS files.

2. **Placement Rules** — Copy the full placement rules table. Document that this is the auto-sort reference and only ambiguous components go to the interview.

3. **Directory Structure** — Show the `docs/design/{version}/components/` output structure.

4. **Process (8 steps):**
   - Step 1: Detect version — scan `docs/design/` for highest `v*`, reuse it (components share version with tokens, write to `components/` subdirectory)
   - Step 2: Launch agent — dispatch ds-sync-components agent with `url` and `version`, wait for completion through Phase 5
   - Step 3: Present extraction summary — component count per atomic level, auto-sorted placement table, data layer status, ambiguous flags
   - Step 4: Interview batched by atomic level — placement review, atoms, molecules, trust & identity, dashboard, unique/editorial, organisms, feedback, data wiring review. One question per message. User approves batch or flags specifics.
   - Step 5: Write component spec — `docs/design/{version}/components/spec.md` with final naming, placement, scaffold instructions
   - Step 6: Generate scaffolds — trigger agent Phase 6-7 with approved spec
   - Step 7: Update dependents — barrel files, feature CLAUDE.md, root CLAUDE.md. NOT showcase page.
   - Step 8: Transition — invoke the writing-plans skill using `Skill` tool with `skill: 'superpowers:writing-plans'`

5. **Key Rules:**
   - One question per message during interview
   - Batch by atomic level, not one-by-one
   - User naming preferences override design system
   - Only ask about ambiguous placements
   - All extraction docs in `docs/design/{version}/components/`
   - Generated files in target codebase locations
   - Do not add scaffolds to showcase page

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/ds-sync-components/SKILL.md
git commit -m "feat: create ds-sync-components skill for component sync orchestration"
```

---

## Task 9: Final verification

**Files:**

- None modified (verification only)

- [ ] **Step 1: Grep for remaining Stitch references**

```bash
grep -ri "stitch" --include="*.md" --include="*.json" --include="*.ts" --include="*.tsx" .
```

Fix any remaining references found (excluding `node_modules/`, `.next/`, `docs/design/component-showcase-reference.html`).

- [ ] **Step 2: Verify all new files exist**

```bash
ls -la .claude/agents/ds-sync-components/AGENT.md
ls -la .claude/skills/ds-sync-components/SKILL.md
```

- [ ] **Step 3: Verify .mcp.json is clean**

```bash
cat .mcp.json
```

Should show `{ "mcpServers": {} }`.

- [ ] **Step 4: Run quality checks**

```bash
pnpm format:check
pnpm lint
pnpm typecheck
```

These should pass (we only changed Markdown and JSON files, no TypeScript).

- [ ] **Step 5: Commit any final fixes**

If any fixes were needed:

```bash
git add -A
git commit -m "chore: final cleanup — verify Stitch removal and new skill/agent files"
```
