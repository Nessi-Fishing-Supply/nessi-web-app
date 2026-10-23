# Implementation Plan: #306 — Messaging — Text safety filter utility

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Core safety filter utility

**Goal:** Create the safety filter module with all detection logic, regex patterns, blocklist, and the main `filterMessageContent` function.
**Verify:** `pnpm build && pnpm typecheck`

### Task 1.1: Create safety filter types and constants

Define the `FilterAction` and `FilterResult` types, the explicit language blocklist, nudge message constants, and all compiled regex patterns at module scope. These are the building blocks the main function depends on.
**Files:** `src/features/messaging/utils/safety-filter.ts`
**AC:** File exports `FilterAction`, `FilterResult`, `EXPLICIT_BLOCKLIST`, `NUDGE_OFF_PLATFORM`, `NUDGE_NEGOTIATION`, and all regex pattern constants. `pnpm typecheck` passes.

### Task 1.2: Implement filterMessageContent function

Implement the main `filterMessageContent` function in the same file, following the specified processing order: explicit language check (block), PII detection (redact with `[removed]`), off-platform dealing detection (nudge), price negotiation detection (nudge), and pass-through. Use the regex patterns and blocklist from Task 1.1. All regexes must be compiled at module level, not inside the function. The function must be pure with zero side effects.
**Files:** `src/features/messaging/utils/safety-filter.ts`
**AC:** `filterMessageContent("my number is 555-123-4567")` returns `action: 'redact'` with phone replaced by `[removed]`. `filterMessageContent("hey, is this rod still available?")` returns `action: 'pass'`. Explicit language returns `action: 'block'` with `filteredContent: null`. Off-platform phrases return `action: 'nudge_off_platform'`. Negotiation phrases return `action: 'nudge_negotiation'`. `pnpm build` passes.

## Phase 2: Unit tests

**Goal:** Add comprehensive unit tests covering all filter categories, edge cases, and the acceptance criteria from the ticket.
**Verify:** `pnpm test:run && pnpm lint`

### Task 2.1: Create unit tests for safety filter

Write Vitest tests in the project's established pattern (describe/it/expect, no default exports). Cover each PII type individually (phone, email, street address, credit card, SSN), explicit language blocking, off-platform nudge patterns, negotiation nudge patterns, clean message pass-through, multiple PII instances in one message (all replaced not just first), case insensitivity across all categories, and that blocked messages return `filteredContent: null`. Each acceptance criterion from the ticket should map to at least one test case.
**Files:** `src/features/messaging/utils/__tests__/safety-filter.test.ts`
**AC:** All tests pass with `pnpm test:run`. Test file has at minimum 15 test cases covering: each PII type redacted, explicit language blocked, off-platform nudge, negotiation nudge, clean pass-through, multiple PII replacement, case insensitivity, and blocked message null content.

### Task 2.2: Verify all quality gates pass

Run the full quality gate suite to confirm no regressions: build, lint, typecheck, format check, and tests.
**Files:** none (verification only)
**AC:** `pnpm build && pnpm lint && pnpm typecheck && pnpm format:check && pnpm test:run` all pass with zero errors.
