---
name: feature-pipeline
description: Full feature pipeline — design research, ticket generation, and autonomous execution in one command
user_invokable: true
arguments:
  - name: feature
    description: "Feature to design, ticket, and build (e.g., 'buyer-seller messaging')"
    required: true
---

# Feature Pipeline

The full autonomous pipeline: research the UX → generate design spec → create tickets → offer to start the conductor.

## Input

Feature: `{{ feature }}`

## Process

### Step 1: Design
Invoke `/design-spec "{{ feature }}"` — this launches the ux-researcher agent, studies competitor marketplaces, and produces a design specification saved to `docs/design-specs/`.

### Step 2: Tickets
After the design spec is complete, invoke `/ticket-gen "{{ feature }} — see docs/design-specs/{spec-file}.md"` — this breaks the spec into conductor-ready GitHub issues.

### Step 3: Execute (Optional)
After tickets are created, offer to start the conductor:

```
🚀 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Feature Pipeline — {{ feature }}
   Design spec: ✅ saved
   Tickets: ✅ {count} created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Start the conductor on the first ticket?
  → /conductor start #{first_ticket_number}

Or run them all sequentially?
  → I'll queue tickets #X, #Y, #Z for conductor execution in dependency order.
```

## Rules

- Each step must complete before the next begins
- The user reviews the design spec before ticket generation
- The user confirms tickets before they're created on GitHub
- Conductor execution is always opt-in, never automatic
