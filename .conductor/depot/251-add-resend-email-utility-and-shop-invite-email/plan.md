# Implementation Plan: #251 — Add Resend email utility and shop invite email template

## Overview

2 phases, 4 total tasks
Estimated scope: small

## Phase 1: Install Resend and configure environment

**Goal:** Add the `resend` package dependency and document the required environment variables so the foundation is in place for the utility module.
**Verify:** `pnpm build`

### Task 1.1: Install the resend package

Run `pnpm add resend` to add the Resend SDK as a production dependency.
**Files:** `package.json`, `pnpm-lock.yaml`
**AC:** `resend` appears in `dependencies` in `package.json`; `pnpm install` resolves without errors.

### Task 1.2: Document RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local.example

Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` entries to `.env.local.example` under a new `# Email (Resend)` section. Neither variable should be prefixed with `NEXT_PUBLIC_`. Follow the existing format of placeholder values used by the Supabase and App sections.
**Files:** `.env.local.example`
**AC:** `.env.local.example` contains `RESEND_API_KEY="re_..."` and `RESEND_FROM_EMAIL="Nessi <noreply@yourdomain.com>"` entries, both without `NEXT_PUBLIC_` prefix, under a clearly labeled section.

## Phase 2: Create Resend utility and invite email template

**Goal:** Implement the `src/libs/resend.ts` module exporting a singleton Resend client and the `sendInviteEmail` function with a branded inline-CSS HTML email template.
**Verify:** `pnpm typecheck && pnpm lint && pnpm build`

### Task 2.1: Create src/libs/resend.ts with singleton client and sendInviteEmail function

Create `src/libs/resend.ts` following the patterns in `src/libs/supabase/server.ts` (module-level singleton, server-only usage). The file should:

1. Import `Resend` from `resend` and instantiate it once at module scope using `process.env.RESEND_API_KEY`.
2. Export an async `sendInviteEmail` function that accepts `{ to: string; shopName: string; inviterName: string; roleName: string; token: string }`.
3. The function calls `resend.emails.send()` with:
   - `from`: `process.env.RESEND_FROM_EMAIL`
   - `to`: the recipient address
   - `subject`: `You've been invited to join {shopName} on Nessi`
   - `html`: an inline-CSS HTML template string (see Task 2.2)
4. The accept link URL is constructed as `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`.
5. Return `{ data, error }` directly from the Resend API call so the caller handles errors.
6. Add a `'use server'` or `import 'server-only'` guard — since `server-only` is not currently in the project dependencies, use a runtime check or rely on the fact that non-NEXT_PUBLIC env vars are only available server-side. The simplest approach: just ensure the module is never imported from client components (no `'use client'` directive, uses `process.env.RESEND_API_KEY` which is undefined on client).

**Files:** `src/libs/resend.ts`
**AC:** The file exports `sendInviteEmail` with the specified parameter signature; TypeScript compiles without errors; the Resend client is instantiated once at module scope; the function returns `{ data, error }`.
**Expert Domains:** nextjs

### Task 2.2: Implement the branded invite email HTML template

Within `src/libs/resend.ts`, the HTML template passed to `resend.emails.send()` should be a template literal string with inline CSS styling. The email body must include:

1. A header area with "Nessi" branding (simple text logo, no image dependency).
2. A greeting line: "Hi there,".
3. Body text: "{inviterName} has invited you to join **{shopName}** as a **{roleName}** on Nessi."
4. A prominent "Accept Invitation" CTA button linking to `{NEXT_PUBLIC_APP_URL}/invite/{token}`, styled with inline CSS (background color, padding, border-radius, white text).
5. A fallback plain-text link below the button for email clients that don't render HTML buttons.
6. A footer with "If you didn't expect this invitation, you can safely ignore this email."

All styles must be inline CSS (no `<style>` block, no external stylesheet) for maximum email client compatibility. Use a simple, clean layout with a max-width container centered on the page.

**Files:** `src/libs/resend.ts` (the template is part of the `sendInviteEmail` function, not a separate file)
**AC:** The HTML template includes shop name, inviter name, role name, and accept link; the accept link is constructed from `NEXT_PUBLIC_APP_URL`; the template uses only inline CSS with no external dependencies.
**Expert Domains:** nextjs
