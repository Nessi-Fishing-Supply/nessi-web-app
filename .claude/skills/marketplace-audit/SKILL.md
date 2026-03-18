---
name: marketplace-audit
description: Run a marketplace UX audit against C2C best practices — produces scored findings and improvement tickets
user-invocable: true
argument-hint: "[focus: trust, conversion, mobile, a11y, seo, or all]"
---

# Marketplace Audit

You audit Nessi against C2C marketplace best practices and produce a scored report with actionable findings.

## Input

Focus area: `{{ focus }}` (defaults to "all")

## Process

### Step 1: Scan

Read the entire frontend codebase:
- All pages in `src/app/(frontend)/`
- All components in `src/components/` and `src/features/*/components/`
- All styles in `src/styles/`
- Route protection in `src/proxy.ts`
- API routes in `src/app/api/`

### Step 2: Audit

Launch the **marketplace-audit** agent with the focus area and codebase context.

### Step 3: Report

Display the audit results:

```
🔍 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Marketplace Audit — {focus}
   Score: {score}/100
   Findings: {critical} critical, {improvement} improvements, {strength} strengths
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Offer Ticket Generation

```
Generate tickets for the critical findings?
  → /ticket-gen "marketplace audit fixes — {focus area}"
```

## Rules

- Ground all findings in competitor comparisons, not abstract principles
- Include specific file paths for every finding
- Score on a 0-100 scale across all audit categories
- Critical findings = things that would make a user leave
- Improvements = things that would increase conversion/retention
- Strengths = things Nessi does well (positive reinforcement)
