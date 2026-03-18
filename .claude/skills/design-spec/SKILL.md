---
name: design-spec
description: Research C2C marketplace patterns and generate a design specification for a feature — replaces the need for design comps
user-invocable: true
arguments:
  - name: feature
    description: "Feature or flow to design (e.g., 'search and filters', 'seller profile page', 'checkout flow')"
    required: true
---

# Design Spec Generator

You generate design specifications for Nessi features by researching successful C2C marketplaces. This skill replaces the need for Figma comps by producing detailed, research-backed design specs that the Conductor can execute.

## Input

Feature to design: `{{ feature }}`

## Process

### Step 1: Scope the Feature

Parse the feature description. If it's broad (e.g., "messaging"), break it into sub-features and ask the user which to focus on:

```
🎨 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Design Spec — {feature}
   Scoping...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask 2-3 focused questions:
- What's the primary user goal for this feature?
- Any specific competitor implementations you like?
- Any constraints (e.g., "must work with existing product card component")?

### Step 2: Research

Launch the **ux-researcher** agent with:
- The feature description and any user clarifications
- Instruction to study 3-5 competitor platforms
- The current codebase context (existing components, styles, patterns)

Also scan the codebase to understand:
- Existing components that can be reused (`src/components/`)
- Current SCSS variables and design tokens (`src/styles/variables/`)
- Related features already built (`src/features/`)
- Database schema relevant to this feature (`src/types/database.ts`)

### Step 3: Generate Design Spec

Take the research brief and codebase context, then produce a full design spec:

```
# Design Spec: {Feature Name}

## Overview
{What this feature does and why users need it}

## User Stories
- As a buyer, I want to {action} so that {benefit}
- As a seller, I want to {action} so that {benefit}

## Research Basis
{Summary of competitor research — which platforms were studied, key takeaways}

## Information Architecture
{Page/screen structure, navigation, content hierarchy}

## Component Breakdown
{Each component with purpose, content, states, responsive behavior}

## Interaction Flows
{Step-by-step user journeys with decision points}

## Data Requirements
{What data is needed — existing tables, new tables, API changes}

## Technical Notes
{Implementation guidance: which existing patterns to follow, state management approach, etc.}

## Acceptance Criteria
{Testable conditions for each user story}
```

### Step 4: Save and Offer Next Steps

Save the design spec to `docs/design-specs/{kebab-feature-name}.md`.

Display summary:

```
🎨 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Design Spec — {feature}
   Complete: {component_count} components, {story_count} user stories
   Saved: docs/design-specs/{filename}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
  1. /ticket-gen "{feature} — see docs/design-specs/{filename}.md"
     → Generate conductor-ready tickets from this spec
  2. Edit the spec manually if you want to adjust anything
  3. /design-spec "{another feature}" for the next feature
```

## Rules

- Always ground designs in competitor research, never in abstract principles
- The spec must be detailed enough for ticket-gen to produce bounded tickets
- Reference existing Nessi components and patterns by name
- Include mobile considerations for every component
- Include empty states, loading states, and error states
- Include accessibility notes (not as an afterthought — inline with each component)
- Never produce wireframes or visual mockups — produce structured specifications
- The spec is a living document — it can be updated as implementation reveals new needs
