---
name: ticket-gen
description: Break a feature or task into execution-ready GitHub issues for the conductor to pick up
user_invokable: true
arguments:
  - name: feature
    description: "Description of the feature or task to break into tickets"
    required: true
---

# Ticket Generation

You are generating execution-ready tickets for the Conductor — an autonomous workflow engine that takes GitHub issues from ticket to PR without human intervention. The quality of these tickets directly determines whether the conductor can execute successfully.

## Input

Feature description: `{{ feature }}`

## Process

### Step 1: Understand the Feature

Parse the feature description. If the description is vague or ambiguous, ask the user clarifying questions BEFORE proceeding. You need enough context to produce bounded, testable tickets. Key questions to consider:

- What is the exact desired end state?
- What systems/areas does this touch?
- Are there any design references or existing patterns to follow?
- What should explicitly be out of scope?
- Are there constraints (performance, compatibility, etc.)?

Keep the interview short — 2-4 questions max, only what's genuinely unclear.

### Step 1.5: Check for Design Spec

If the feature description references a design spec file (e.g., "see docs/design-specs/search-filters.md"):
1. Read the design spec
2. Use its component breakdown as the basis for ticket decomposition
3. Include the design spec path in each ticket body so the plan-architect can reference it
4. Use the spec's acceptance criteria directly in the ticket AC section

If no design spec exists, suggest creating one:
```
💡 No design spec found for this feature.
   Run /design-spec "{feature}" first to generate a research-backed spec.
   This produces better tickets with UX details the conductor can follow.

   Continue without a design spec? (y/n)
```

### Step 2: Codebase Scan

Launch the **ticket-generator** agent with:
- The feature description (and any clarifications from the user)
- Instruction to scan the codebase for relevant existing patterns, files, and architecture

The agent will:
1. Analyze the feature against the current codebase
2. Break it into right-sized tickets (one clear objective, one PR each)
3. Define dependency ordering between tickets
4. Draft each ticket in the canonical format
5. Run the ready check against each ticket

### Step 3: Review & Create

The agent returns drafted tickets. Display them to the user as a summary:

```
🎫 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Ticket Generation — {feature_name}
   {ticket_count} tickets drafted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. {title} [{type}] [{priority}]
   → {one-line objective}
   → Dependencies: {deps or "none"}

2. {title} [{type}] [{priority}]
   → {one-line objective}
   → Dependencies: {deps}

...

Execution order: #1 → #2 → #3, #4 (parallel) → #5
```

Ask the user to confirm before creating. Once confirmed:

1. Read project config from `.claude/conductor/github-project.json` for repo, project, and field IDs
2. Create each issue and add to the project board:

```bash
# Create the issue
ISSUE_URL=$(gh issue create --repo Nessi-Fishing-Supply/Nessi-Web-App \
  --title "{title}" \
  --label "{type},{priority},{area},conductor" \
  --body "$(cat <<'EOF'
{ticket body in canonical format}
EOF
)")

# Add to project board
ITEM_ID=$(gh project item-add 2 --owner Nessi-Fishing-Supply --url $ISSUE_URL --format json | jq -r '.id')

# Set Status → Todo
gh project item-edit --project-id PVT_kwDOCuq3-M4BSHz8 \
  --id $ITEM_ID \
  --field-id PVTSSF_lADOCuq3-M4BSHz8zg_v78E \
  --single-select-option-id f75ad846

# Set Priority (map from ticket metadata)
gh project item-edit --project-id PVT_kwDOCuq3-M4BSHz8 \
  --id $ITEM_ID \
  --field-id PVTSSF_lADOCuq3-M4BSHz8zg_xN3Y \
  --single-select-option-id {priority_option_id}

# Set Area (map from ticket metadata)
gh project item-edit --project-id PVT_kwDOCuq3-M4BSHz8 \
  --id $ITEM_ID \
  --field-id PVTSSF_lADOCuq3-M4BSHz8zg_xOAk \
  --single-select-option-id {area_option_id}

# Set Executor → Conductor
gh project item-edit --project-id PVT_kwDOCuq3-M4BSHz8 \
  --id $ITEM_ID \
  --field-id PVTSSF_lADOCuq3-M4BSHz8zg_xOGc \
  --single-select-option-id 1482d955
```

Map priority/area option IDs from `.claude/conductor/github-project.json`.

Each issue gets:
- Full ticket body in canonical format
- Labels (type, priority, area, `conductor`)
- Project fields set: Status (Todo), Priority, Area, Executor (Conductor)
- Dependency links in body and as GitHub issue references

## Rules

- A ticket is an **execution contract**, not a request
- Every ticket must pass the ready check (see agent prompt)
- Prefer fewer, high-quality tickets over many small ones
- Bias toward safe, bounded execution
- Remove ambiguity before creating — clarity > completeness
- Always get user confirmation before creating GitHub issues
