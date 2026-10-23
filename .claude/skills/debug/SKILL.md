---
name: debug
description: Deep investigation protocol for stuck problems — reproduces, isolates, researches, and fixes bugs systematically
user-invocable: true
argument-hint: "[problem description]"
---

# Debug

Launch a deep investigation for a stuck problem. Uses the **debug-investigator** agent's 7-step protocol: Reproduce → Isolate → Research → Inspect → Hypothesize → Fix → Verify.

## Input

Problem: `{{ args }}`

## Process

### Step 1: Gather Context

Before launching the investigator, gather:
- What's the expected behavior?
- What's the actual behavior?
- What has already been tried?
- Any error messages or stack traces?

If the description is vague, ask 1-2 clarifying questions.

### Step 2: Launch Debug Investigator

Launch the **debug-investigator** agent with:
- The problem description and any clarifications
- Relevant file paths if known
- Error output if available

The agent follows a 7-step protocol:
1. **Reproduce** — Confirm the bug exists
2. **Isolate** — Narrow down the source
3. **Research** — Check docs, similar issues
4. **Inspect** — Read the relevant code
5. **Hypothesize** — Form a theory
6. **Fix** — Implement the fix
7. **Verify** — Confirm the fix works

### Step 3: Report

```
🔧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Debug — {problem summary}
   Status: {fixed|needs-help|blocked}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Root cause: {explanation}
Fix: {what was changed}
Files: {paths}
```

## Rules

- Always reproduce before fixing — don't guess
- Collect evidence (console, network, DOM) before diagnosing
- If the fix requires architectural changes, report and ask — don't restructure unilaterally
- If stuck after investigation, report findings and escalate
