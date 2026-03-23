---
name: preflight
description: Comprehensive quality gate — runs build, lint, typecheck, format, tests, and produces a structured pass/fail report
user-invocable: true
argument-hint: "[scope: lint, build, tests, or all]"
---

# Preflight Check

You are the preflight quality gate for Nessi. You run all quality checks and produce a structured report. The Conductor uses this as its review step.

## Input

Scope: `{{ scope }}` (defaults to "all")

## Checks

Run each check and capture exit code + output:

### 1. TypeScript Type Check
```bash
pnpm typecheck
```

### 2. ESLint
```bash
pnpm lint
```

### 3. Stylelint
```bash
pnpm lint:styles
```

### 4. Prettier Format Check
```bash
pnpm format:check
```

### 5. Vitest Tests
```bash
pnpm test:run
```

### 6. Next.js Build
```bash
pnpm build
```

### 7. UI Tests (optional, requires dev server)
If the dev server is running on localhost:3000 or can be started:
- Launch **ui-tester** agent for smoke testing
- Report page render status and console errors
- This check is optional — preflight still passes without it, but reports "skipped"

### 8. Accessibility (optional, requires dev server)
If the dev server is running on localhost:3000 or can be started:
- Launch **a11y-auditor** agent for WCAG 2.1 AA compliance check
- Report critical and serious findings
- This check is optional — preflight still passes without it, but reports "skipped"
- Critical a11y findings (keyboard traps, missing form labels) are [B] Blocking

### 9. Code Review (optional, requires plan or recent changes)
If there is a conductor plan (`plan.md` in the active track) or recent git changes on the current branch:
- Launch **superpowers:code-reviewer** agent to review implementation against:
  - The original plan (if available from conductor track)
  - Project coding standards (from CLAUDE.md)
  - Codebase patterns and conventions
- The agent reviews changed files and flags deviations from the plan or standards
- This check is optional — preflight still passes without it, but reports "skipped"
- Findings are categorized as:
  - [B] Blocking — implementation contradicts plan requirements or violates coding standards
  - [W] Warning — minor deviations, missed edge cases, code quality concerns
  - [I] Info — suggestions, alternative approaches

## Output

Display results as a structured report:

```
✈️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Preflight Check
   {pass_count}/{total_count} passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ TypeScript     {pass|fail}  {duration}
  ✅ ESLint         {pass|fail}  {duration}
  ✅ Stylelint      {pass|fail}  {duration}
  ✅ Prettier       {pass|fail}  {duration}
  ✅ Tests          {pass|fail}  {duration}  {test_count} tests
  ✅ Build          {pass|fail}  {duration}
  ✅ UI Tests       {pass|fail|skipped}  {duration}  {page_count} pages
  ✅ Accessibility  {pass|fail|skipped}  {duration}  {finding_count} findings
  ✅ Code Review   {pass|fail|skipped}  {duration}  {finding_count} findings

{if any failed:}
━━━━ Failures ━━━━

### {Check Name} — FAILED
{error output, trimmed to relevant lines}
{suggested fix if obvious}
```

## Integration with Conductor

When called by the review-orchestrator agent, return findings in the standard format:

```
## Preflight Findings

### [B] {Blocking finding title}
- **Check:** {which check failed}
- **Error:** {error message}
- **File:** {file path if applicable}
- **Fix:** {suggested fix}

### [W] {Warning finding title}
...

### [I] {Info finding}
...
```

## Rules

- Run checks in parallel where possible (typecheck and lint can run concurrently)
- Capture timing for each check
- Truncate verbose output but preserve the actionable error messages
- If build fails, don't skip reporting other check results
- Always report total pass/fail count
- For the Conductor: categorize as [B] Blocking, [W] Warning, [I] Info
