---
name: daily-summary
description: Generate a team-friendly daily summary of shipped work — PRs merged, tickets completed, features delivered, bugs fixed
user-invocable: true
---

# Daily Summary

Generate a team-friendly summary of everything shipped today. This is for sharing with the product team and associate engineers — keep it non-technical and outcome-focused.

## Input

No arguments needed. Always uses today's date in **America/Denver (Mountain Time)**. Determine today's date by running:

```bash
TZ=America/Denver date +%Y-%m-%d
```

Use this date for all queries below.

**Timezone conversion:** The MT calendar day spans from `{date}T06:00:00Z` to `{next_date}T06:00:00Z` in UTC. GitHub's `--search` date filters and `mergedAt`/`createdAt` timestamps are in UTC. Always convert UTC timestamps to MT before deciding if they fall on the report date. For example, a PR merged at `2026-03-25T03:00:00Z` is actually `2026-03-24T21:00:00 MT` — it belongs in the March 24 report.

## Data Collection

Run these commands in parallel to gather the day's work:

### 1. Merged PRs

Query both the MT date and the next UTC date to capture evening MT merges:

```bash
gh pr list --repo Nessi-Fishing-Supply/Nessi-Web-App --state merged --search "merged:>={date}" --json number,title,labels,mergedAt,body --limit 50
```

Then filter the results: only include PRs whose `mergedAt` falls within `{date}T06:00:00Z` to `{next_date}T06:00:00Z` (the MT calendar day in UTC).

If no results (date filtering can be flaky), fall back to:
```bash
gh pr list --repo Nessi-Fishing-Supply/Nessi-Web-App --state merged --limit 30 --json number,title,labels,mergedAt,body
```
Then filter by the MT-adjusted UTC window.

### 2. Nessi Kanban Board (GitHub Project #2) — Source of Truth

```bash
gh project item-list 2 --owner Nessi-Fishing-Supply --format json --limit 200
```

This single query serves both the "Completed Today" and "Tickets Created Today" sections — no need to call it twice. From the results:
- **Completed:** Filter for items in the **Done** column. Cross-reference with merged PRs to avoid duplicates.
- **Created:** Filter for items whose creation date matches `{date}` (any column).

### 3. Conductor Depot — Recently Completed Tracks

Check `.conductor/depot/` for tracks with `completedAt` matching today's date:

```bash
find .conductor/depot -name state.json -exec grep -l "{date}" {} \;
```

For each matching track, read `state.json` for issue number and title, and `plan.md` for a brief scope summary.

### 4. Tickets Created Today

**Timezone handling is critical.** GitHub's `created:` search filter uses UTC dates, but the report uses Mountain Time (UTC-6). A ticket created at 9 PM MT on March 24 has a UTC timestamp of March 25. You must query BOTH UTC dates that overlap with the MT calendar day.

Calculate the two UTC dates that cover the MT day:

```bash
# MT day runs from {date}T06:00:00Z to {next_date}T06:00:00Z
# So query both {date} and {next_date} in UTC, then filter by MT
MT_DATE=$(TZ=America/Denver date +%Y-%m-%d)
NEXT_DATE=$(TZ=America/Denver date -v+1d +%Y-%m-%d)  # macOS; use date -d "+1 day" on Linux
```

Run TWO queries to cover the full MT day, and include `--state all` to catch issues that were created and closed the same day:

```bash
gh issue list --repo Nessi-Fishing-Supply/Nessi-Web-App --state all --search "created:${MT_DATE}" --json number,title,labels,createdAt --limit 100
gh issue list --repo Nessi-Fishing-Supply/Nessi-Web-App --state all --search "created:${NEXT_DATE}" --json number,title,labels,createdAt --limit 100
```

Then filter the combined results to only include issues whose `createdAt` falls within the MT day window (`{date}T06:00:00Z` to `{next_date}T06:00:00Z`). **Exclude tickets that were both created and completed the same day** — those are already captured in the shipped features/bug fixes sections. The "Tickets Created" section should only show new work that's queued up for the future.

### 5. Recent Commits on Main (supplementary)

```bash
git log main --since="{date}T00:00:00" --until="{date}T23:59:59" --oneline --no-merges
```

Use this to catch any direct commits that weren't part of a PR.

## Summary Generation

### Categorize by Type

Read PR labels and issue labels to categorize:

| Category | Labels | Emoji |
|----------|--------|-------|
| Features | `feature`, `enhancement` | :sparkles: |
| Bug Fixes | `bug`, `fix` | :bug: |
| Infrastructure | `chore`, `refactor`, `ci`, `conductor` | :wrench: |
| Documentation | `docs`, `documentation` | :memo: |

If a PR has no labels, infer from the title prefix (`feat:` = feature, `fix:` = bug, `chore:` = infrastructure, `docs:` = documentation).

### Write the Summary

Output format:

```
# Daily Summary — {date}

## Stats
- **{total} items shipped** ({features} features, {bugs} bug fixes, {infra} infrastructure, {docs} docs)
- **{pr_count} PRs merged**
- **{tickets_created} tickets created**

---

## Features

### {Feature Title} (#{issue})
- {1-2 bullet points explaining what users/sellers/shops can now do}
- {Focus on the outcome, not the implementation}

### {Feature Title} (#{issue})
- {bullet points}

---

## Bug Fixes
- **#{issue}** — {one-line description of what was broken and what's fixed}
- **#{issue}** — {one-line description}

## Infrastructure
- **#{issue}** — {one-line description}
- {These are brief — the team doesn't need details on refactors}

## Documentation
- **#{issue}** — {one-line description}

---

## Tickets Created
- **#{issue}** — {title} [{label}]
- **#{issue}** — {title} [{label}]
```

### Writing Guidelines

- **Features get the spotlight.** 1-2 bullet points each, written from the user's perspective. "Shop owners can now invite members with specific roles (owner, manager, contributor)" — not "Added shop_roles table with FK migration."
- **Bug fixes are one-liners.** "Fixed cart not updating badge count after removing items" — not "Resolved race condition in useCartBadgeCount hook."
- **Infrastructure is brief.** "Moved conductor pipeline for better autonomous execution" — not implementation details.
- **Tickets Created lists what's in the pipeline.** Show each ticket with its label so the team can see what's queued up. **Exclude tickets that were created and completed the same day** — those are already covered in the shipped sections above. This section is only for new work that's still pending.
- **Skip internal-only changes** that have zero user impact (CI tweaks, linter config, test-only changes) unless they're significant.
- **Use plain language.** No code references, file paths, or technical jargon. Your audience is product managers and associate engineers.
- **Group related PRs.** If 3 PRs all contributed to one feature (e.g., cart: DB migration, API routes, UI), collapse them into one feature entry with the parent issue number.

### Edge Cases

- If nothing was shipped today: "No items shipped today. The team was focused on {in-progress work from the kanban board}."
- If only infrastructure/docs: Lead with that, skip the Features section.
- If a PR doesn't have an associated issue: Use the PR title and number instead.

## Output

Display the summary directly in the conversation. Then ask:

```
Want me to copy this to clipboard, save to docs/daily-summaries/{date}.md, or post somewhere?
```

## Rules

- This is a **read-only** skill — do not modify any files, PRs, or issues
- Always use Mountain Time (America/Denver) for "today" — run `TZ=America/Denver date +%Y-%m-%d`
- If a PR body contains "Closes #N", use that issue for context
- Deduplicate: if a PR and a conductor track reference the same issue, count it once
