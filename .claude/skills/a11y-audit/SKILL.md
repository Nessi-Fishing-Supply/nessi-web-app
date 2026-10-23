---
name: a11y-audit
description: Run a WCAG 2.1 AA accessibility audit — static code analysis + live browser testing with scored findings
user-invocable: true
argument-hint: "[scope: home, dashboard, forms, navigation, or all]"
---

# Accessibility Audit

Run a comprehensive WCAG 2.1 AA accessibility audit combining static code analysis with live Playwright browser testing.

## Input

Scope: `{{ scope }}` (defaults to "all")

## Process

### Step 1: Static Analysis

Scan the codebase for common accessibility issues:
- Missing `alt` attributes on images
- Form inputs without labels
- Heading hierarchy violations
- Missing landmark regions
- Icon buttons without `aria-label`

### Step 2: Live Testing

Launch the **a11y-auditor** agent with:
- The scope (which pages to test)
- Instruction to test keyboard navigation, focus management, and ARIA

### Step 3: Report

Display results:

```
♿ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Accessibility Audit — {scope}
   Score: {score}/100
   WCAG 2.1 AA: {compliant|partial|non-compliant}
   Findings: {critical} critical, {serious} serious, {minor} minor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Offer Fixes

```
Generate tickets for the critical findings?
  → /ticket-gen "accessibility fixes — {scope}"
```

## Integration with Conductor

When called from the conductor's review phase:
1. Findings categorized as [B], [W], [I] for the review-orchestrator
2. Critical a11y issues (missing form labels, keyboard traps) are [B] Blocking
3. Serious issues (contrast, missing alt text) are [W] Warning
4. Minor issues (best practices) are [I] Info

## Rules

- Every finding must cite a WCAG 2.1 criterion
- Include human impact in every finding
- Test with keyboard, not just code review
- Score reflects real accessibility, not checklist coverage
