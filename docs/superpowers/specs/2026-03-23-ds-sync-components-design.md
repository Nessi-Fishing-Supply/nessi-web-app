# Design Spec: ds-sync-components Skill & Agent

**Date:** 2026-03-23
**Status:** Draft
**Scope:** New skill + agent for extracting atomic design components from an HTML design system and scaffolding them into the codebase

---

## Problem

The existing `ds-sync` skill handles design tokens (colors, typography, spacing, etc.) but ignores the ~50 components defined in the HTML design system across the atomic design hierarchy: atoms, molecules, organisms, feedback patterns, and domain-specific components. These components need to be extracted, analyzed, and scaffolded into the codebase as real React + SCSS files.

## Decisions

| Decision               | Choice                                                                                                                                | Rationale                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Approach               | Separate agent + skill (not extending ds-sync)                                                                                        | Clean separation of concerns, no turn-limit risk, each agent stays focused |
| Input                  | URL only (Playwright)                                                                                                                 | Consistent with ds-sync, no file-parsing code path                         |
| Placement              | Rules-based auto-sort, interview only for ambiguous                                                                                   | Faster, less interview fatigue                                             |
| Scaffold fidelity      | Visual-faithful (real tokens, variants, states)                                                                                       | Leverages the full design spec, not just structure                         |
| Data wiring            | Live data where data layer exists, typed props where it doesn't                                                                       | Avoids scaffolding data layers for features that don't have DB tables yet  |
| Barrel files           | No per-component index.ts. Only append to existing category-level barrels (currently only `src/components/controls/index.ts` has one) | Matches existing codebase pattern                                          |
| Conditional classnames | Template literal string concatenation (e.g., `` `${styles.base} ${active ? styles.active : ''}` ``)                                   | Matches existing codebase pattern — no `clsx` dependency                   |
| Stitch                 | Remove entirely                                                                                                                       | No longer in use                                                           |

## Placement Rules

The agent auto-sorts components using these rules. Only components that don't match any rule are flagged during the interview.

| Design System Category                                                                                                                                           | Target Location                           | Rule                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Atoms: Buttons, Pills, Forms, Dividers, Tooltips                                                                                                                 | `src/components/controls/`                | Generic UI primitives — no domain knowledge |
| Atoms: Date & Time, Location Chip                                                                                                                                | `src/components/indicators/`              | Display-only data presentation              |
| Molecules: Avatars, Tabs, Pagination, Quantity Stepper, Search Input                                                                                             | `src/components/controls/`                | Reusable across features                    |
| Molecules: Rating Display, Inline Banner, Settings Row, Notification Row                                                                                         | `src/components/indicators/`              | Status/info display                         |
| Molecules: Page Header, Stepper & Progress                                                                                                                       | `src/components/layout/`                  | Structural/layout                           |
| Molecules: Product Cards, Seller Card, Photo Upload, Shipping Rate Card, Category Tile, Watchlist Toggle                                                         | `src/features/listings/components/`       | Listing domain                              |
| Molecules: Messaging                                                                                                                                             | `src/features/messaging/components/`      | Messaging domain                            |
| Molecules: Filter Panel                                                                                                                                          | `src/features/search/components/`         | Search domain                               |
| Molecules: Order Timeline                                                                                                                                        | `src/features/orders/components/`         | Orders domain                               |
| Trust & Identity: all (Fishing Identity Tag, Verification Badge, Trust Stat Row, Offer UI)                                                                       | `src/features/members/components/`        | Member/trust domain                         |
| Dashboard: all (KPI Stat Tile, Listing Performance Row, Quick Action Card, Sparkline, Shop Upgrade Prompt)                                                       | `src/features/dashboard/components/`      | Dashboard domain                            |
| Unique/Editorial: all (Shop Highlight, Maker Story Block, Featured Listing Card, Species Browse Row, Social Proof Strip, Price Drop Alert, Recently Sold Ticker) | `src/features/editorial/components/`      | Editorial/discovery domain                  |
| Organisms: Modals, Overlays                                                                                                                                      | `src/components/layout/`                  | Global structural                           |
| Feedback: Loading States, Empty States, Error States, Toasts                                                                                                     | `src/components/indicators/`              | Global feedback                             |
| Navigation: Navigation System                                                                                                                                    | `src/components/navigation/`              | Global nav                                  |
| Patterns: Voice & Tone                                                                                                                                           | `docs/design/{version}/voice-and-tone.md` | Documentation only, not a component         |

**Ambiguity threshold:** If a component doesn't match any rule (e.g., a new category appears in a future design system update), it gets flagged during the interview.

## New Skill: ds-sync-components

**Location:** `.claude/skills/ds-sync-components/SKILL.md`

**Invocation:** `/ds-sync-components "{url}"`

### Process

1. **Detect version** — Scan `docs/design/` for existing `v*` directories. Reuse the highest existing version (components are part of the same design system version as tokens — they write to a `components/` subdirectory within the version folder, so there are no file collisions with token extraction output). If no version exists, create `v1`. Note: if ds-sync is run again later and bumps to `v2`, component extraction should be re-run against `v2` as well.

2. **Launch agent** — Dispatch the ds-sync-components agent with `url` and `version`.

3. **Present extraction summary** — Show the user:
   - Component count per atomic level
   - Auto-sorted placement table
   - Which components have existing data layers vs. typed-props-only
   - Any ambiguous placements flagged for review

4. **Interview — batched by atomic level:**
   - **Placement review** — Show auto-sorted table, ask about any moves
   - **Atoms** — Batch: variants, states, naming
   - **Molecules** — Batch: grouped by global vs. feature-scoped
   - **Trust & Identity** — Batch
   - **Dashboard** — Batch
   - **Unique/Editorial** — Batch
   - **Organisms** — Batch
   - **Feedback** — Batch
   - **Data wiring review** — Show live-wired vs. typed-props-only, ask if any need data layer scaffolding now

   Each batch is one message with one question. User can approve the whole batch or flag specific components.

5. **Write component spec** — Save to `docs/design/{version}/components/spec.md` with final naming, placement, and scaffold instructions.

6. **Generate scaffolds** — Create component directories in target locations.

7. **Update dependents** — Append to category-level barrel files where they exist (currently only `src/components/controls/index.ts`). Update feature CLAUDE.md files. Do NOT add scaffolded components to the showcase page yet — they should be added as they are finalized, not at scaffold time.

8. **Transition** — Invoke the `writing-plans` skill (from superpowers) to create a phased implementation plan for finalizing the scaffolded components.

### Key Rules

- One question per message during interview
- Batch components by atomic level, not one-by-one
- User naming preferences override design system naming
- Only ask about ambiguous placements — auto-sort handles the rest
- All extraction docs go in `docs/design/{version}/components/`
- Generated files go in their target codebase locations

## New Agent: ds-sync-components

**Location:** `.claude/agents/ds-sync-components/AGENT.md`

**Configuration:**

- Model: opus
- Tools: Read, Write, Edit, Bash, Grep, Glob + Playwright (`mcp__plugin_playwright_playwright__*`)
- Max turns: 100 (extraction + codebase analysis + scaffold generation for ~50 components requires significant turn budget)

### Inputs

- `url` — The design system URL to navigate
- `version` — Version string (e.g., `v1`)

### Phase 1: Extract Components from URL

1. Navigate to URL via Playwright
2. Click through each sidebar section beyond Foundation (Navigation, Atoms, Molecules, Trust & Identity, Dashboard, Unique/Editorial, Organisms, Feedback, Patterns)
3. For each component section, snapshot the DOM and extract:
   - **HTML structure** — anatomy, what elements compose the component
   - **Variants** — e.g., button: primary, secondary, ghost, destructive
   - **States** — default, hover, active, disabled, loading, error
   - **Token usage** — which CSS custom properties are referenced
   - **Responsive behavior** — breakpoint-specific styling
   - **Accessibility** — ARIA attributes, keyboard patterns, a11y notes
4. Take screenshots of each component section, save to `docs/design/{version}/components/screenshots/`

### Phase 2: Derive Props & Types

For each component, derive a TypeScript props interface from the extraction:

- Variant unions from visual variants
- State booleans (isDisabled, isLoading, etc.)
- Content slots (children, title, description, image, etc.)
- Event handlers implied by interactivity (onClick, onToggle, etc.)
- className pass-through for composition

### Phase 3: Read Codebase & Map Data

1. Read `src/types/database.ts` for schema types
2. Read existing service files in `src/features/*/services/`
3. Read existing hook files in `src/features/*/hooks/`
4. For each component, determine:
   - Does this component already exist in the codebase? If yes: skip scaffold generation but still include in extraction docs. Mark as "existing" in the placement report so the user sees it during the interview.
   - Does a data layer exist for its domain? (mark for live wiring)
   - What imports would be needed?

### Phase 4: Apply Placement Rules

Sort each component to its target location using the placement rules table. Flag any that don't match a rule.

### Phase 5: Write Extraction Documents

| Output                                             | Purpose                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `docs/design/{version}/components/extraction.md`   | Full extraction — anatomy, variants, states, tokens, a11y per component, grouped by atomic level |
| `docs/design/{version}/components/placement.md`    | Placement decisions — component, target location, rule applied, any ambiguity flags              |
| `docs/design/{version}/components/data-mapping.md` | Which components get live data wiring vs. typed props, with specific imports noted               |
| `docs/design/{version}/components/screenshots/`    | Screenshots of each section                                                                      |
| `docs/design/{version}/components/metadata.json`   | Component counts, categories, existing-vs-new breakdown (schema below)                           |

**metadata.json schema:**

```json
{
  "url": "https://...",
  "version": "v1",
  "timestamp": "2026-03-23T18:00:00Z",
  "tokenVersion": "v1",
  "componentCount": 50,
  "categories": {
    "atoms": 7,
    "molecules": 20,
    "organisms": 2,
    "navigation": 1,
    "trustIdentity": 4,
    "dashboard": 5,
    "editorial": 7,
    "feedback": 4
  },
  "existing": ["button", "pill", "toast"],
  "new": ["product-card", "seller-card", "..."],
  "liveDataWired": ["product-card", "seller-card"],
  "typedPropsOnly": ["kpi-stat-tile", "order-timeline", "..."]
}
```

### Phase 6: Generate Scaffolds

For each approved component, generate:

**`index.tsx`:**

- TypeScript props interface derived from extraction
- Functional component with variant/state handling
- Token-based className logic using template literal concatenation (matching existing codebase pattern, no `clsx`)
- `next/image` for image slots (with `sizes`, `alt`, `fill` per project standards)
- Live data imports where hook/service exists, typed props where it doesn't
- Accessibility attributes (aria-\*, role, keyboard handlers)
- Mobile-first structure

**`component-name.module.scss`:**

- Imports from `src/styles/variables/` (token files)
- Responsive mixins via `@include breakpoint()` — mobile-first
- Flat class names (no BEM, CSS Modules handle scoping)
- Variant classes matching design system visual spec
- State styles (hover, active, disabled, focus-visible)

### Phase 7: Update Dependents

- Append exports to category-level barrel files where they exist (currently only `src/components/controls/index.ts`)
- Do NOT add scaffolded components to the showcase page — add them as they are finalized
- Update feature `CLAUDE.md` files to reference new components
- Create feature directories for new domains (e.g., `src/features/messaging/`, `src/features/dashboard/`) with a minimal `CLAUDE.md` containing: domain name, purpose, component list, and a note that the feature is scaffolded but not yet implemented
- Update root `CLAUDE.md` Key Directories section and Agents table to include the new agent/skill

### Phase Boundaries & Partial Completion

Each phase produces durable output. If the agent runs out of turns or fails mid-run:

| Completed through | State                                        | Recovery                                                    |
| ----------------- | -------------------------------------------- | ----------------------------------------------------------- |
| Phase 5           | Extraction docs exist, no scaffolds          | Re-run agent with `--scaffold-only` flag, skip extraction   |
| Phase 6 (partial) | Some components scaffolded, others not       | Agent checks which directories already exist and skips them |
| Phase 7           | Scaffolds exist but barrels/docs not updated | Manual fixup or re-run Phase 7 only                         |

The extraction documents serve as the checkpoint — they contain everything needed to generate scaffolds without re-navigating the URL.

## Stitch Removal

Remove all Stitch references from the codebase:

| File                                  | Change                                                                                                                                                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.mcp.json`                           | Remove the `stitch` server entry entirely. If no other servers remain, delete the file or leave `{ "mcpServers": {} }`                                                                                                                                                                |
| `CLAUDE.md`                           | Remove: MCP Servers table + `stitch` row, Shell Environment `STITCH_API_KEY` section, `/ui-design "stitch:..."` examples from AI Development Fleet, Stitch reference in `/ds-sync` description                                                                                        |
| `README.md`                           | Remove any Stitch references                                                                                                                                                                                                                                                          |
| `.claude/skills/ui-design/SKILL.md`   | Remove Stitch Build mode, Stitch Browse mode, `stitch:` argument handling, all Stitch-related steps. Update description to remove "Stitch screen references"                                                                                                                          |
| `.claude/agents/ui-designer/AGENT.md` | Remove `mcp__stitch__*` from allowedTools, remove all Stitch-related instructions                                                                                                                                                                                                     |
| `.claude/skills/ds-sync/SKILL.md`     | Update directory structure docs — remove "Scraped Stitch design system reference" comment on line 39. The `component-showcase-reference.html` file remains (it's the design system HTML, not a Stitch artifact) but its description should say "Design system reference HTML" instead |

## What This Does NOT Include

- Test files — use `/write-tests` after scaffolding
- API routes or database migrations — built when features are developed
- Data layer scaffolding for features without DB tables — deferred by design
- Changes to ds-sync itself — it continues handling tokens only
