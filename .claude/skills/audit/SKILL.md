---
name: audit
description: Quick combined quality + marketplace audit — runs preflight checks and marketplace UX review in one command
user_invokable: true
---

# Quick Audit

Runs both the preflight quality gate and the marketplace UX audit in a single command.

## Process

1. Run `/preflight all` and capture results
2. Run `/marketplace-audit all` and capture results
3. Combine into a single dashboard:

```
📊 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Nessi Audit Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Code Quality:        {score}/6 checks passing
   Marketplace UX:      {score}/100

   Action Items:        {count} ({critical} critical)

   Details: see above reports
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
