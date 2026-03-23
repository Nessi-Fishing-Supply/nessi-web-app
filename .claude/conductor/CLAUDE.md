# Conductor — Architecture & Reference

## 1. What It Is

The Conductor is a **stateful, file-based workflow engine** that orchestrates the software development lifecycle: from a GitHub issue through planning, implementation, review, fixing, and PR creation. It runs inside Claude Code and delegates work to specialized AI sub-agents.

It is **task-agnostic** — the same engine handles frontend components, API routes, database schema changes, test authoring, or any other work described in a ticket. It picks up context from the GitHub issue and invokes whatever Claude skills and tools are needed to complete the task.

---

## 2. State Machine

The core of the conductor is a finite state machine persisted as JSON on disk. Every skill reads state fresh on every invocation — there's no in-memory state.

### States & Transitions

```
planning ──→ implementing ←──────────────┐
                  │                       │
                  ↓                       │
              reviewing                   │
                  │                       │
            ┌─────┴─────┐                │
            ↓           ↓                │
        complete    needs_fixes          │
            │           │                │
            ↓           ↓                │
         pr_open     fixing ─────────────┘
        (terminal)

(any state) ──→ blocked (human intervention needed)
```

| Status | Description | Valid Next States |
|--------|-------------|-------------------|
| `planning` | Reading ticket, scanning codebase, generating phased plan | `implementing` |
| `implementing` | Tasks being executed by task-executor agent | `reviewing` |
| `reviewing` | Quality checks running (build, lint, preflight) | `complete`, `needs_fixes` |
| `needs_fixes` | Review findings need resolution | `fixing` |
| `fixing` | Findings being resolved by task-executor | `reviewing` |
| `complete` | Review passed, ready for PR | `pr_open` |
| `pr_open` | PR created, track moved to depot | **Terminal** |
| `blocked` | Escalated to human — ticket moved to Blocked column with comment | **Requires human to unblock** |

### No Approval Gates

Unlike traditional workflow engines, the conductor runs autonomously. Tickets are expected to arrive fully detailed (via the ticket-generation skill). The conductor plans and executes without pausing for human approval. If it gets stuck, it moves the ticket to **Blocked** on the kanban board and leaves a comment describing the issue.

---

## 3. State Persistence (File System)

All runtime state lives in `.claude/conductor/` (git-ignored). Skill and agent definitions live in their standard locations (`.claude/skills/`, `.claude/agents/`).

### Directory Layout

```
.claude/conductor/
├── active.json                          # Points to current track
├── tracks/                              # Active work
│   └── 42-add-order-history/
│       ├── state.json                   # Machine state
│       ├── plan.md                      # Phased implementation plan
│       ├── findings.md                  # Review findings
│       ├── review-log.md               # Append-only review/fix history
│       └── learnings.md                # Knowledge captured during execution
└── depot/                               # Completed work (post-PR)
    └── 42-add-order-history/
        └── (same files + completedAt/pruneAfter in state.json)
```

### `active.json`

```json
{
  "active": "tracks/42-add-order-history",
  "lastAccessed": "2026-03-18T10:00:00Z"
}
```

### `state.json`

```json
{
  "version": "1.0.0",
  "issue": 42,
  "title": "Add order history page",
  "branch": "feat/42/add-order-history",
  "status": "implementing",
  "phase": {
    "current": 2,
    "total": 3,
    "tasks": {
      "completed": ["1.1", "1.2", "1.3", "2.1"],
      "current": "2.2",
      "remaining": ["2.3", "3.1", "3.2"]
    }
  },
  "health": {
    "build": "pass",
    "lint": "unknown",
    "tests": "unknown"
  },
  "failureCount": {
    "currentTask": 0
  },
  "timestamps": {
    "started": "2026-03-18T09:00:00Z",
    "lastActivity": "2026-03-18T10:30:00Z"
  }
}
```

### Track Naming

Tracks are named `{issue_number}-{kebab-title}`, derived from the GitHub issue number and title.

### Depot Lifecycle

When a PR is created (`status = "pr_open"`):
1. `completedAt` and `pruneAfter` (now + 60 days) are added to state.json
2. Track directory is moved from `tracks/` to `depot/`
3. `active.json` is cleared
4. Cleanup command prunes expired depot entries

---

## 4. Execution Flow

### Entry Point

```
/conductor start #42
```

### Full Autonomous Flow

```
1. Fetch GitHub issue #42 via `gh issue view 42 --json title,body,labels,comments,assignees`
2. Move ticket to "In Progress" on kanban board via `gh project item-edit`
3. Create feature branch: feat/{issue}/{kebab-title}
4. STATUS → planning
   - Scan codebase for relevant patterns and files
   - Generate phased implementation plan → plan.md
5. STATUS → implementing
   - For each phase:
     - For each task in phase:
       - Launch task-executor agent
       - On success: update state, advance
       - On failure: retry logic (see §7)
     - At phase boundary:
       - Run phase verification (pnpm build)
       - Commit phase: "{type}({scope}): #{issue} {phase description}"
       - Knowledge capture (optional, appended to learnings.md)
6. STATUS → reviewing
   - Run /preflight (when available) or pnpm build + pnpm lint
   - Categorize findings → findings.md
   - Append to review-log.md
   - Clean? → STATUS → complete
   - Issues? → STATUS → needs_fixes
7. If needs_fixes:
   - STATUS → fixing
   - Create fix tasks from findings
   - Execute fixes via task-executor
   - STATUS → reviewing (loop back to step 6)
8. STATUS → complete
   - Generate PR title and description from plan + changes
   - Create PR via gh CLI
   - Move ticket to "Ready for Review" on kanban board via `gh project item-edit`
9. STATUS → pr_open
   - Move track to depot/
   - Clear active.json
```

---

## 5. Skills (Orchestration Commands)

Skills live in `.claude/skills/` as Markdown files. The conductor's core skills:

| Skill | What It Does |
|-------|--------------|
| `conductor-start` | Main entry. Fetches ticket, plans, executes full flow |
| `conductor-status` | Read-only status dashboard — progress, health, next action |
| `conductor-resume` | Resume an interrupted track from last known state |
| `conductor-cleanup` | Prune expired depot entries |

### Future Skills (referenced but not yet built)

| Skill | What It Does |
|-------|--------------|
| `ticket-gen` | Breaks down a feature into detailed GitHub issues |
| `preflight` | Comprehensive quality gate (lint, docs, tests, etc.) |
| `debug` | Verbose investigation protocol for stuck tasks |

---

## 6. Agents

Each agent is an autonomous AI subprocess with its own system prompt, tool access, and max turns.

| Agent | Model | Tools | Max Turns | Purpose |
|-------|-------|-------|-----------|---------|
| **plan-architect** | Opus | Read, Grep, Glob, Bash | 20 | Reads ticket + codebase, generates phased implementation plan. 2-5 phases, 3-7 tasks each. Each task has ID, title, description, files, acceptance criteria. |
| **task-executor** | Sonnet | Read, Write, Edit, Bash, Grep, Glob | 40 | Implements ONE task. Orient → Plan → Implement → Verify (`pnpm build`) → Report. Follows existing codebase patterns. Reports failure after 2 attempts. |
| **phase-verifier** | Sonnet | Bash, Read | 10 | Runs verification commands at phase boundaries. Reports pass/fail. Does NOT fix issues. |
| **review-orchestrator** | Sonnet | Bash, Read, Grep, Glob | 30 | Runs build, lint, and available quality checks. Categorizes findings as [B] Blocking, [W] Warning, [I] Info. |
| **superpowers:code-reviewer** | (built-in) | All tools | — | Reviews implementation against plan, coding standards, and acceptance criteria. Launched during review phase. |
| **finding-resolver** | Sonnet | Read, Write, Edit, Grep | 15 | Takes findings.md, creates atomic fix tasks. Blocking → auto-fixed. Warnings → auto-fixed. |
| **debug-investigator** | Opus | Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch | 50 | 7-step protocol: Reproduce → Isolate → Research → Inspect → Hypothesize → Fix → Verify. Used on 3rd retry before escalation to blocked. |
| **pr-creator** | Sonnet | Bash, Read, Grep, Glob | 20 | Git operations: stage, commit, push, `gh pr create`. Moves ticket on kanban via `gh project item-edit`. Never modifies source code. |

### Agent Dispatch Pattern

The orchestrating skill launches agents via the Agent tool:
```
Agent({
  subagent_type: "task-executor",
  prompt: "Implement task {id}: {title}. Description: ... Files: ... AC: ..."
})
```

Agents return results to the orchestrating skill, which updates state and decides the next action.

---

## 7. Failure Escalation

Three-strike escalation with increasing investigation depth:

| Attempt | Strategy | Agent |
|---------|----------|-------|
| 1st failure | Simple retry — same task, fresh context | task-executor |
| 2nd failure | Simple retry — same task, include prior error context | task-executor |
| 3rd failure | Verbose debug investigation + one more fix attempt | debug-investigator |
| Still failing | Escalate to human — move ticket to **Blocked** | (orchestrator) |

### Blocked Escalation

When escalating to blocked:
1. Update `state.json` → `status: "blocked"`
2. Move GitHub issue to **Blocked** column via `gh project item-edit`
3. Leave a comment on the issue via `gh issue comment` with:
   - What task was being attempted
   - Error details from all 3 attempts
   - Debug investigation findings (if applicable)
   - Suggested next steps for the developer
4. Preserve all track state for resume after unblock

---

## 8. MCP Integrations

The conductor has access to MCP (Model Context Protocol) servers for direct infrastructure provisioning. **Agents must use these tools — never leave manual setup instructions.**

| MCP Server | Tool Prefix | Capabilities | Used By |
|-----------|-------------|--------------|---------|
| **Supabase** | `mcp__plugin_supabase_supabase__*` | Execute SQL, apply migrations, list tables/extensions, manage storage buckets, RLS policies, deploy edge functions | task-executor, debug-investigator, ticket-generator |
| **Vercel** | `mcp__plugin_vercel_vercel__*` | Manage deployments, environment variables, domains, project settings | task-executor |
| **Context7** | `mcp__plugin_context7_context7__*` | Query up-to-date library docs | plan-architect, task-executor, debug-investigator, ux-researcher |

### Infrastructure-as-Task Pattern

When a feature requires backend infrastructure (storage buckets, tables, columns, RLS policies), the plan-architect creates explicit tasks tagged with `**MCP:** supabase` or `**MCP:** vercel`. These tasks:
- Go in Phase 1 (foundation), before any code that depends on them
- Are executed by the task-executor using MCP tools directly
- Must be verified (e.g., `list_tables` to confirm the table exists after creation)

**Common infrastructure tasks:**
- Create a Supabase Storage bucket with RLS policies
- Add a new table with FK constraints and RLS
- Add columns to existing tables
- Add cleanup logic to `handle_profile_deletion()` for new user-owned resources
- Add environment variables via Vercel MCP

---

## 9. GitHub Integration

All GitHub interaction happens via the `gh` CLI. Ensure `gh auth status` passes before running the conductor.

### Key `gh` Commands

| Operation | Command |
|-----------|---------|
| Fetch issue | `gh issue view {number} --json title,body,labels,comments,assignees` |
| Comment on issue | `gh issue comment {number} --body "{message}"` |
| Create issue | `gh issue create --title "{title}" --label "{labels}" --body "{body}"` |
| Create PR | `gh pr create --title "{title}" --body "{body}"` |
| List project items | `gh project item-list {PROJECT_NUMBER} --owner {OWNER} --format json` |
| Move kanban column | `gh project item-edit --project-id {ID} --id {ITEM_ID} --field-id {FIELD_ID} --single-select-option-id {OPTION_ID}` |
| List project fields | `gh project field-list {PROJECT_NUMBER} --owner {OWNER} --format json` |

Use `gh project field-list` and `gh project item-list` to discover project/field/option IDs dynamically at runtime.

### Kanban Column Mapping

| Column | Conductor Action |
|--------|-----------------|
| **Todo** | Ticket is available for pickup |
| **In Progress** | Conductor moves ticket here on start |
| **Blocked** | Conductor moves ticket here on escalation |
| **Ready for Review** | Conductor moves ticket here after PR creation |
| **Done** | (External — after PR merge) |

### Issue Data Used

When fetching a ticket, the conductor reads:
- Title and description (primary task context)
- Labels (for categorization and branch type)
- Acceptance criteria (from issue body)
- Comments (for additional context)
- Linked issues (for dependency awareness)

---

## 10. Plan Architect Detail

### Phase Design Principles

1. Early phases = foundation (types, schemas, API clients, hooks)
2. Middle phases = core implementation (components, pages, routes, logic)
3. Final phases = polish (loading states, error handling, edge cases)
4. Each phase is independently verifiable (`pnpm build` must pass)
5. Each phase produces a meaningful commit

### Task Format

- **ID**: Hierarchical (e.g., "1.1", "2.3")
- **Title**: Imperative ("Create order history API route")
- **Description**: 2-3 sentences (what, where, why)
- **Files**: Specific paths that will be created or modified
- **Acceptance Criteria**: Testable conditions

### Plan Output Format

```markdown
# Implementation Plan: #{issue} — {Title}

## Overview
{phases} phases, {tasks} total tasks
Estimated scope: {small|medium|large}

## Phase 1: {Phase Title}
**Goal:** {one sentence}
**Verify:** `{command}`

### Task 1.1: {Title}
{Description}
**Files:** {paths}
**AC:** {criteria}
```

---

## 11. Task Execution Loop

Within `conductor-start`, for each task in the current phase:

1. Update `state.json` with current task
2. Launch `task-executor` agent with task details + plan context
3. **On success**: Mark task complete in state, reset failure count, advance
4. **On failure**: Increment `failureCount.currentTask`
   - < 3 failures: retry (see §7 escalation strategy)
   - = 3 failures: launch debug-investigator, attempt one more fix
   - Still failing: escalate to blocked

At phase boundary:
1. Launch `phase-verifier` with verification command
2. If fails: attempt fix, re-verify once, then escalate to blocked if still failing
3. If passes: update health in state.json
4. Commit phase changes with descriptive message
5. Knowledge capture prompt (appended to `learnings.md` in track, never blocks)
6. Advance to next phase

---

## 12. Review/Fix Cycle

### Review

1. Update status → `reviewing`
2. Launch `review-orchestrator` (build, lint, and available quality checks)
3. Invoke `/preflight` if available (comprehensive quality gate — includes code review)
4. Launch `superpowers:code-reviewer` agent to review implementation against plan, coding standards, and acceptance criteria
5. Merge all findings (preflight + code review), write to `findings.md`
6. Append to `review-log.md` (append-only, never overwritten)
7. Clean → `complete`. Issues → `needs_fixes`.

### Fix

1. Update status → `fixing`
2. Launch `finding-resolver` to create fix tasks
3. Execute each fix task via `task-executor`
4. Append outcomes to `review-log.md`
5. Update status → `reviewing` (loop back for re-review)

### Finding Categories

- **[B] Blocking**: Must fix before PR — build failures, type errors, lint errors
- **[W] Warning**: Should fix — code quality, minor issues
- **[I] Info**: Logged for awareness only

### Review Cycle Limit

Maximum 2 review/fix cycles. If findings persist after 2 cycles, escalate to blocked.

---

## 13. Git & PR Conventions

### Branch Naming

Format: `{type}/{issue_number}/{kebab-description}`

Examples:
- `feat/42/add-order-history`
- `fix/58/cart-total-calculation`
- `chore/61/update-drizzle-schema`

Type is inferred from issue labels or content. Defaults to `feat`.

### Commit Strategy (Per-Phase)

Each completed phase produces one commit. **EVERY commit MUST include `.claude/conductor/` alongside source changes** — track state, plan, learnings, and review logs are part of the feature branch and must be pushed to GitHub. This is non-negotiable.

```bash
git add .claude/conductor/ <source files...>
```

```
{type}({scope}): #{issue} {phase description}

- Task 1.1: {summary}
- Task 1.2: {summary}
- Task 1.3: {summary}

Co-Authored-By: Conductor <noreply@conductor.dev>
```

### Depot Move Commit

Before PR creation, the conductor MUST:
1. Update `state.json` → `status: "pr_open"`, add `completedAt` and `pruneAfter`
2. Move track from `tracks/` to `depot/`
3. Clear `active.json`
4. **Commit these changes** as a dedicated commit:
   ```bash
   git add .claude/conductor/
   git commit -m "chore: #{issue} finalize conductor — move track to depot"
   ```

This commit must happen BEFORE the branch is pushed. If the depot move isn't in the branch, it won't be in the PR merge and the track will be stranded in `tracks/` permanently.

### PR Creation

Title format: `{type}({scope}): #{issue} {description}`

Body includes:
1. **Summary** — what was built and why (from plan + changes)
2. **GitHub Issue** — link to ticket
3. **Changes** — phase-by-phase breakdown
4. **Testing** — what was verified
5. **Notes** — implementation decisions, trade-offs

---

## 14. Knowledge Capture

At phase boundaries, the conductor appends observations to `learnings.md` in the track directory. This captures:

- Non-obvious patterns discovered in the codebase
- Decisions made during implementation and why
- Issues encountered and how they were resolved
- Anything that would help a future task in the same area

Knowledge capture never blocks execution. It's a best-effort append that enriches the historical record in the depot.

---

## 15. UX Patterns

### Train Theming

- Branded banners with emoji + horizontal rules
- Train metaphors: boarding, rolling, checkpoint, depot, end of the line

### Emoji Map

| Emoji | Stage |
|-------|-------|
| 🚂 | Starting up / engine firing |
| 🎫 | Loading ticket / boarding |
| 🚃 | Rolling / in transit (phase start) |
| 🚉 | Checkpoint / phase complete |
| 🔍 | Review / inspection |
| 🛤️ | Switching to fix track |
| 🔧 | Debug / investigation |
| ⚠️ | Derailed / error |
| 🛑 | Blocked / escalated to human |
| 🏁 | End of the line / completion |
| ✅ | Pass |
| ❌ | Fail |
| 🔗 | PR created |

### Banner Format

```
{emoji} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Conductor — #{issue}
   {status message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Progress Bars

Block characters, 20 chars wide:
```
Full block:  █ (U+2588)
Empty block: ░ (U+2591)

   0%: ░░░░░░░░░░░░░░░░░░░░
  25%: █████░░░░░░░░░░░░░░░
  50%: ██████████░░░░░░░░░░
 100%: ████████████████████
```

### Wayfinding

Every command exit includes the next suggested action. The developer always knows: what ticket, what stage, what's next.

---

## 16. Session Resume

If Claude disconnects mid-execution, the conductor can resume:

1. `/conductor resume` reads `active.json` to find the interrupted track
2. Loads `state.json` to determine exact position (status, phase, current task)
3. Resumes from the last persisted state

This is why **every state transition is persisted to disk immediately** — it's the crash recovery mechanism.

---

## 17. Key Design Decisions

1. **File-based state, read fresh every invocation** — no in-memory session state. Enables crash recovery and cross-session resume.
2. **Append-only review log** — `review-log.md` is never overwritten, providing full audit trail.
3. **Agent isolation** — each agent has specific tool access. task-executor can write code; pr-creator cannot. phase-verifier reports but never fixes.
4. **No approval gates** — tickets arrive fully detailed. The conductor plans and executes autonomously.
5. **Blocked as escape hatch** — when stuck, escalate to human via kanban board rather than looping forever.
6. **Failure escalation** — simple retry (2x) → debug investigation (1x) → blocked. Never infinite loops.
7. **Active/depot lifecycle** — active work in `tracks/`, completed work in `depot/` with 60-day retention.
8. **Per-phase commits** — each phase is a meaningful, reviewable, and revertable unit of work.
9. **Knowledge capture never blocks** — best-effort learning capture at phase boundaries enriches the depot record.
10. **State persistence is mandatory** — every state transition hits disk immediately. This is the foundation of crash recovery.
