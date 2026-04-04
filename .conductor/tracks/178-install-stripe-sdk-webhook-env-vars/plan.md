# Implementation Plan: #178 — feat(stripe): install Stripe SDK and add webhook secret environment variables

## Overview

1 phase, 3 total tasks
Estimated scope: small

## Phase 1: Install Stripe SDK and configure client

**Goal:** Add the Stripe Node.js SDK, create a server-only client wrapper following the thin-wrapper pattern, document it with a CLAUDE.md, and register the new environment variables.
**Verify:** `pnpm build`

### Task 1.1: Install the Stripe npm package

Run `pnpm add stripe` to install the Stripe Node.js SDK. This is a server-only dependency (no `NEXT_PUBLIC_` prefix on its env vars), used exclusively in API routes and server-side code.
**Files:** `package.json`, `pnpm-lock.yaml`
**AC:** `stripe` appears in `dependencies` in `package.json`; `pnpm build` still passes.

### Task 1.2: Add Stripe environment variables to .env.local.example

Add a `# Stripe` section to `.env.local.example` with `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` placeholder values. Place it after the existing `# Email (Resend)` section.
**Files:** `.env.local.example`
**AC:** `.env.local.example` contains a `# Stripe` comment heading followed by `STRIPE_SECRET_KEY="sk_test_..."` and `STRIPE_WEBHOOK_SECRET="whsec_..."` placeholder lines. Existing entries are unchanged.

### Task 1.3: Create Stripe client wrapper and CLAUDE.md

Create `src/libs/stripe/client.ts` exporting a `getStripe()` function that returns a configured `Stripe` instance using `STRIPE_SECRET_KEY`. Follow the thin-wrapper pattern from `src/libs/supabase/admin.ts` — a single exported factory function, no class, no extra abstraction. Use lazy initialization for build-time safety. This file is server-only.

Create `src/libs/stripe/CLAUDE.md` documenting the module boundary (server-only), the exported function, environment variable requirements, and usage example.
**Files:** `src/libs/stripe/client.ts`, `src/libs/stripe/CLAUDE.md`
**AC:** (1) `src/libs/stripe/client.ts` exports `getStripe()` returning a `Stripe` instance initialized with `process.env.STRIPE_SECRET_KEY!`. (2) `src/libs/stripe/CLAUDE.md` exists and documents the module boundary, exported API, and env var requirements. (3) `pnpm build` passes. (4) `pnpm typecheck` passes.
