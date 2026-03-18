---
name: feature-scaffold
description: Scaffold a new feature domain with directory structure, CLAUDE.md, types, services, hooks, and components following established patterns
user-invocable: true
argument-hint: "[domain-name] [description]"
---

# Feature Scaffold

You scaffold new feature domains following Nessi's established patterns. Every new domain gets the full directory structure, a CLAUDE.md, and starter files that match existing conventions.

## Input

Domain name: `{{ domain }}`
Description: `{{ description }}`

## Process

### Step 1: Validate

1. Check the domain name is kebab-case
2. Check `src/features/{{ domain }}/` doesn't already exist
3. Scan existing features (`src/features/auth/`, `src/features/products/`) to understand current patterns

### Step 2: Create Directory Structure

```
src/features/{{ domain }}/
├── CLAUDE.md              # Feature documentation for AI-assisted development
├── components/            # React components for this domain
├── hooks/                 # Tanstack Query hooks
├── services/              # API client functions
├── types/                 # TypeScript interfaces
└── validations/           # Yup form schemas (if forms are needed)
```

Only create directories that the feature will actually need. If there are no forms, skip `validations/`. If there's no API, skip `services/`. Ask the user or infer from the description.

### Step 3: Generate CLAUDE.md

Use the existing feature CLAUDE.md files as templates (read `src/features/auth/CLAUDE.md` and `src/features/products/CLAUDE.md`). Generate a CLAUDE.md that documents:
- Feature overview
- Architecture decisions
- Key files and their purposes
- Relationship to other features
- Data flow

### Step 4: Generate Type Stubs

Create `types/index.ts` with placeholder interfaces based on the domain description. Follow the pattern in `src/features/products/types/`.

### Step 5: Generate Service Stubs

If the feature needs API interaction, create `services/{domain}.ts` with stub functions following the pattern in `src/features/products/services/product.ts`.

### Step 6: Report

```
📦 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Feature Scaffold — {{ domain }}
   Created: {file_count} files in src/features/{{ domain }}/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files created:
  ✅ CLAUDE.md
  ✅ types/index.ts
  ✅ services/{domain}.ts
  ✅ hooks/ (empty, ready for Tanstack Query hooks)
  ✅ components/ (empty, ready for React components)

Next steps:
  1. Review and edit the generated CLAUDE.md
  2. Update types after database schema is defined
  3. /design-spec "{domain}" to generate UX specs for this feature
```

## Rules

- Always scan existing features first to match current patterns
- All files must be kebab-case (enforced by eslint-plugin-check-file)
- Use `@/*` path alias for all imports
- Follow the established Tanstack Query pattern for hooks
- Don't over-scaffold — only create files the feature will actually use
- The CLAUDE.md must be genuinely useful, not boilerplate
