---
name: write-tests
description: Generate Vitest tests for components, hooks, and services following Nessi's testing patterns
user-invocable: true
argument-hint: "[file or feature to test]"
metadata:
  filePattern:
    - "*.test.ts"
    - "*.test.tsx"
    - vitest.config.*
  bashPattern:
    - pnpm test
---

# Write Tests

Generate Vitest tests for Nessi features. Launches the **test-author** agent to write tests following established patterns.

## Input

Target: `{{ args }}`

## Process

### Step 1: Identify Target

Parse the input to determine what to test:
- If a file path: test that specific file
- If a feature name: test all files in `src/features/{feature}/`
- If "all": scan for untested files and prioritize

### Step 2: Launch Test Author

Launch the **test-author** agent with:
- The target file(s) to test
- Existing test patterns in the codebase
- The testing stack (Vitest, Testing Library, jsdom)

### Step 3: Report

```
🧪 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Write Tests — {target}
   Tests written: {count}
   Tests passing: {pass}/{total}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rules

- Test files go adjacent to source: `component.tsx` → `component.test.tsx`
- Use `screen` queries, prefer `getByRole` over `getByTestId`
- Use `userEvent` over `fireEvent`
- Mock at boundaries (Supabase client, fetch)
- Run `pnpm test:run` after writing to verify
