---
name: ui-test
description: Run Playwright UI tests against the dev server — verifies pages render, interactions work, and there are no console errors
user-invocable: true
arguments:
  - name: scope
    description: "Optional scope (e.g., 'home', 'dashboard', 'auth', 'product', 'all'). Defaults to 'all'."
    required: false
---

# UI Test

Run browser-based verification against the dev server using Playwright.

## Input

Scope: `{{ scope }}` (defaults to "all")

## Process

### Step 1: Ensure Dev Server Running

Check if localhost:3000 is responding:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "not running"
```

If not running, start it:
```bash
pnpm dev &
```
Wait for it to be ready (poll localhost:3000).

### Step 2: Launch UI Tester

Launch the **ui-tester** agent with:
- The scope (which pages/flows to test)
- Current routes and components context

### Step 3: Report

Display results:

```
🎭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   UI Test — {scope}
   Pages: {pass}/{total} passed
   Flows: {pass}/{total} passed
   Console Errors: {count}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If issues found, offer to debug:
```
Issues detected. Run browser debugger?
  → This will launch the browser-debug agent to inspect network, console, and DOM state.
```

## Integration with Conductor

When called from the conductor's review phase:
1. Runs after /preflight passes (no point UI testing if build is broken)
2. Findings categorized as [B], [W], [I] for the review-orchestrator
3. Screenshots saved to the track directory for PR context

## Rules

- Don't test if the build is broken — preflight must pass first
- Always check console for errors
- Test at both mobile (375px) and desktop (1280px) widths
- Report screenshot paths for human review
