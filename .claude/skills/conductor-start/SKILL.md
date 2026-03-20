---
name: conductor-start
description: Main conductor entry point — fetches a GitHub issue, plans implementation, and executes the full autonomous workflow through to PR creation
user-invocable: true
argument-hint: "[issue number, e.g. #42]"
---

# Conductor Start

You are the Conductor — an autonomous workflow engine that takes a GitHub issue from ticket to PR.

The full architecture reference is auto-loaded from `.claude/conductor/CLAUDE.md`. Every state transition MUST be persisted to disk immediately.

## Input

Parse the issue number from the argument: `{{ issue }}`

## Execution Flow

### Step 1: Initialize Track

1. Read project config from `.claude/conductor/github-project.json`
2. Fetch the GitHub issue via `gh issue view {issue} --repo Nessi-Fishing-Supply/Nessi-Web-App --json title,body,labels,comments,assignees`
3. Generate a track name: `{issue_number}-{kebab-title}` (max 50 chars for the kebab portion)
4. Create directory: `.claude/conductor/tracks/{track_name}/`
5. Write initial `state.json`:
   ```json
   {
     "version": "1.0.0",
     "issue": <number>,
     "title": "<title>",
     "branch": "<type>/<issue>/<kebab-title>",
     "status": "planning",
     "phase": { "current": 0, "total": 0, "tasks": { "completed": [], "current": null, "remaining": [] } },
     "health": { "build": "unknown", "lint": "unknown", "tests": "unknown" },
     "failureCount": { "currentTask": 0 },
     "timestamps": { "started": "<now>", "lastActivity": "<now>" }
   }
   ```
6. Write `active.json` pointing to this track
7. Move the GitHub issue to **In Progress** on the kanban board:
   ```bash
   # Find the project item ID for this issue
   ITEM_ID=$(gh project item-list 2 --owner Nessi-Fishing-Supply --format json | jq -r '.items[] | select(.content.number == {issue}) | .id')
   # If not on board yet, add it first
   # ITEM_ID=$(gh project item-add 2 --owner Nessi-Fishing-Supply --url {ISSUE_URL} --format json | jq -r '.id')
   # Move to In Progress
   gh project item-edit --project-id PVT_kwDOCuq3-M4BSHz8 --id $ITEM_ID --field-id PVTSSF_lADOCuq3-M4BSHz8zg_v78E --single-select-option-id 47fc9ee4
   ```
8. Create and checkout the feature branch

Display a boarding banner:
```
🎫 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Conductor — #{issue}
   Boarding: {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Planning

1. Update `state.json` → `status: "planning"`, persist to disk
2. Launch the **plan-architect** agent with:
   - Full issue content (title, description, acceptance criteria, comments)
   - Instruction to scan the codebase for relevant patterns, existing files, and conventions
   - The project's tech stack context (Next.js 16 App Router, React 19, Supabase Auth + PostgreSQL + Storage, Tanstack Query, Zustand, SCSS with CSS Modules)
3. Write the agent's output to `plan.md` in the track directory
4. Parse the plan to populate `state.json` phase/task structure
5. Persist `state.json` to disk

Display the plan summary:
```
🚂 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Conductor — #{issue}
   Plan: {phase_count} phases, {task_count} tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Implementation

1. Update `state.json` → `status: "implementing"`, persist to disk
2. For each phase:
   a. Display phase banner:
      ```
      🚃 Phase {n}/{total}: {phase_title}
      ```
   b. For each task in the phase:
      - Update `state.json` with current task, persist to disk

      #### Expert Context Pre-Loading (within implementation loop)

      If the current task has `Expert Domains` specified in the plan:
      1. For each expert domain, invoke the corresponding expert skill
      2. The skill provides guidance (recommended patterns, gotchas, code examples)
      3. Include the skill's guidance in the task-executor's prompt as "Expert Context"
      4. This happens BEFORE task-executor starts, not reactively during execution

      Expert skill mapping:
      | Domain | Skill |
      |--------|-------|
      | supabase | /ask-supabase |
      | nextjs | /ask-nextjs |
      | vercel | /ask-vercel |
      | scss | /ask-scss |
      | state-management | /ask-state |

      Multiple expert skills can be invoked in parallel for a single task.

      - Launch **task-executor** agent with task details + relevant spec context from plan.md + any expert context collected above
      - **On success**: Mark task complete in state, reset `failureCount.currentTask`, persist
      - **On failure**: Apply failure escalation (see below)
   c. At phase boundary:
      - Launch **phase-verifier** agent to run `pnpm build`
      - If verification fails: attempt fix, re-verify once, escalate to blocked if still failing
      - If passes: update health in `state.json`, persist
      - Stage conductor state alongside source changes: `git add .claude/conductor/` (tracks state, plan, learnings)
      - Commit phase: `{type}({scope}): #{issue} {phase description}` with task summaries in body
      - Append any learnings to `learnings.md`
      - Display checkpoint:
        ```
        🚉 Phase {n}/{total} complete ██████████░░░░░░░░░░ {percent}%
        ```

### Step 4: Review

1. Update `state.json` → `status: "reviewing"`, persist to disk
2. Invoke the `/preflight` skill (it runs build, lint, typecheck, format, tests)
3. Parse preflight output into findings format ([B], [W], [I])
4. Write findings to `findings.md`, append to `review-log.md`
5. If all checks pass → `status: "complete"`. If any [B] blocking findings → `status: "needs_fixes"`

### Step 5: Fix (if needed)

1. Update `state.json` → `status: "fixing"`, persist to disk
2. Launch **finding-resolver** agent to create fix tasks from findings
3. Execute each fix task via **task-executor** agent
4. Append outcomes to `review-log.md`
5. Update `state.json` → `status: "reviewing"`, loop back to Step 4
6. Maximum 2 review/fix cycles. If still failing, escalate to blocked.

### Step 6: Documentation & Diagrams

After review passes and before PR creation, update project documentation:

1. **Feature CLAUDE.md** — If a new feature domain was created (`src/features/{domain}/`), ensure its `CLAUDE.md` is accurate and complete. If the feature was modified, update the existing CLAUDE.md to reflect changes.

2. **Root CLAUDE.md** — If the changes affect architecture, add new key directories, change state management patterns, or introduce new conventions, update the relevant sections in the root `CLAUDE.md`.

3. **README.md** — If the changes add user-facing features, new scripts, or change the project structure, update the README accordingly.

4. **Diagrams** — If the changes introduce a new user journey, data flow, or significant architectural component, generate a Mermaid diagram via `/diagram` and save to `docs/diagrams/`. Update existing diagrams if the changes modify documented flows.

5. **API documentation** — If new API routes were created or modified (`src/app/api/`), ensure the route's purpose, request/response format, and auth requirements are documented in the feature's CLAUDE.md.

Rules for this step:
- Only update docs that are actually affected by the changes — don't touch unrelated docs
- Documentation updates are committed as part of the final phase, not as a separate PR
- If no documentation changes are needed (e.g., a pure bug fix with no architectural impact), skip this step and note "No doc updates needed" in the PR body
- Diagrams are optional unless the feature introduces a new user-facing flow

### Step 7: PR Creation

1. Update `state.json` → `status: "complete"`, persist to disk
2. Launch **pr-creator** agent to:
   - Push the branch
   - Create PR via `gh pr create` with title and body derived from plan + changes
   - Include a "Documentation" section in the PR body listing what was updated
   - Move GitHub issue to **Ready for Review** on kanban board
3. Display completion:
   ```
   🏁 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Conductor — #{issue}
      End of the line. PR created: {url}
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
4. Update `state.json` → `status: "pr_open"`, add `completedAt` and `pruneAfter`
5. Move track from `tracks/` to `depot/`
6. Clear `active.json`

## Failure Escalation

| Attempt | Strategy |
|---------|----------|
| 1st failure | Retry — same task, fresh context via task-executor |
| 2nd failure | Retry — include prior error context via task-executor |
| 3rd failure | Launch debug-investigator, then one more fix attempt via task-executor |
| Still failing | Escalate to blocked |

### Blocked Escalation

1. Update `state.json` → `status: "blocked"`, persist to disk
2. Move GitHub issue to **Blocked** column:
   ```bash
   gh project item-edit --project-id PVT_kwDOCuq3-M4BSHz8 --id $ITEM_ID --field-id PVTSSF_lADOCuq3-M4BSHz8zg_v78E --single-select-option-id ead5882a
   ```
3. Leave a comment on the issue with: what task failed, error details from all attempts, debug findings, suggested next steps:
   ```bash
   gh issue comment {issue} --repo Nessi-Fishing-Supply/Nessi-Web-App --body "$(cat <<'EOF'
   {detailed blocked message}
   EOF
   )"
   ```
4. Display:
   ```
   🛑 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Conductor — #{issue}
      Blocked: {reason}
      Issue commented with details. Awaiting human intervention.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

## Critical Rules

- **EVERY state transition MUST be persisted to `state.json` on disk immediately.** This is the crash recovery mechanism.
- **Append-only**: `review-log.md` is never overwritten, only appended to.
- **Agent isolation**: Only launch agents for their designated purpose. task-executor writes code. pr-creator does git operations. phase-verifier only reports.
- Always read `state.json` fresh before making decisions — never rely on in-memory state from earlier in the conversation.
