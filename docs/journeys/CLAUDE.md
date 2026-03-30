# Journey Files — Source of Truth

This directory contains structured JSON journey files that document every user-facing flow in the Nessi application. These are the **single source of truth** for flow visualization, coverage tracking, test planning, and debugging.

## Purpose

Journey files power the **nessi-docs** app where they're extracted, parsed, and rendered for:

- **Flow visualization** — interactive diagrams of every user path
- **Coverage tracking** — which steps are built, planned, or tested
- **Test planning** — each step maps to verifiable behavior
- **Debugging** — trace issues through client → server → database layers
- **API documentation** — routes, error cases, and HTTP status codes inline with flows

## What Makes a Good Journey File

### Code-Accurate Steps

Every flow must reflect what the code actually does. Steps should map to real functions, routes, components, and database operations:

- **`codeRef`** — point to the primary source file (`src/features/auth/services/auth.ts`)
- **`route`** — include the HTTP method + path (`POST /api/auth/register`)
- **`errorCases`** — document every handled error with condition, result, and httpStatus
- **`notes`** — capture implementation details not obvious from the label

### Multi-Layer Coverage

Each step declares its execution layer. A complete flow should trace the full stack:

| Layer        | What it covers                                         | Examples                               |
| ------------ | ------------------------------------------------------ | -------------------------------------- |
| `client`     | Visible browser UI — renders, interactions, navigation | Form submit, modal open, toast         |
| `server`     | API routes, server actions, auth checks                | POST /api/cart, verifyOtp()            |
| `database`   | Triggers, RLS policies, cascades, direct DB ops        | CASCADE delete, BEFORE DELETE trigger  |
| `background` | Silent client-side work — no visible UI change         | Cart merge, context sync, localStorage |
| `email`      | Transactional email via Resend                         | Invite email, OTP code, welcome email  |
| `external`   | Third-party service calls                              | Stripe Connect, shipping API           |

### Touchpoints

Flows should capture every user-facing touchpoint — moments where the system communicates back to the user:

- **Toast notifications** — success, error, info toasts
- **Email** — transactional emails (invite, OTP, confirmation, transfer)
- **Inline errors** — form validation, API error messages
- **Redirects** — where the user lands after an action
- **State changes** — badge updates, button state changes, loading states
- **Future: SMS, push notifications, notification center alerts**

### Architectural Context (Status Field)

Journey step nodes use `"status"` to indicate whether a code path exists in production:

- `"built"` (default) — this step exists in production code
- `"planned"` — this step does not exist yet but represents where it would fit architecturally
- `"tested"` — this step exists and has test coverage

This is **not progress tracking** — it's architectural context. A `"planned"` node on a canvas shows "this code path doesn't exist yet, here's where it would go." Use `"notes"` to explain the purpose of planned nodes:

- Missing error handling (what happens if X fails silently?)
- Missing user feedback (should there be a toast here?)
- Missing touchpoints (should the seller get an email when their item sells?)
- Missing edge cases (what if the user has no payment method?)

### Branches & Connections

- **`branches`** — decision points that split the flow (auth check, validation result, role check)
- **`connections`** — explicit non-sequential links between steps (loops, cross-flow references)

Use `"goTo": "END"` for terminal paths. Reference other journey files in `notes` for cross-journey links (e.g., "See guest-cart.json for full flow").

## Schema

All journey files must validate against `schema.json` in this directory. The schema defines:

- Required fields: `slug`, `title`, `persona`, `description`, `flows`
- Valid personas: `guest`, `auth`, `onboarding`, `buyer`, `seller`, `shop-owner`, `shop-member`, `account`, `context`
- Valid layers: `client`, `server`, `database`, `background`, `email`, `external`
- Valid statuses: `planned`, `built`, `tested`

## File Naming

Files use `{persona}-{feature}.json` naming (e.g., `buyer-cart.json`, `seller-listings.json`). Cross-cutting concerns use their persona directly (e.g., `context-switching.json`, `onboarding.json`).

## Extraction & Integration

This directory is an **extraction location** for the nessi-docs pipeline. Files are:

1. Read by the docs data extraction pipeline (`scripts/extract-docs-data.mjs`)
2. Validated against `schema.json`
3. Transformed into visualizations, coverage reports, and test matrices
4. Served via the nessi-docs app for the team

**Do not add non-JSON files** to this directory other than this CLAUDE.md and schema.json.

## Maintenance

Journey files are maintained by:

- **`/journey` skill** — audit, enhance, or generate journey files
- **Conductor pipeline** — automatically syncs journeys before PR creation when user-facing flows change
- **Manual updates** — when making changes outside the conductor

### When to Update

Update journey files when code changes:

- Add, remove, or modify an API route
- Change auth, onboarding, or account flows
- Modify listing states/transitions
- Affect cart, search, or recently viewed behavior
- Change shop roles, membership, or context switching
- Introduce a new user persona or flow branch
- Add new touchpoints (toasts, emails, notifications)

### File ↔ Code Mapping

| Changed code path                                                 | Affected journey files                                                                                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/auth/` or `src/features/auth/`                       | `signup.json`, `login.json`, `password-reset.json`, `email-change.json`, `logout.json`                                     |
| `src/app/api/listings/` or `src/features/listings/`               | `seller-listings.json`, `buyer-search.json`                                                                                |
| `src/app/api/cart/` or `src/features/cart/`                       | `buyer-cart.json`, `guest-cart.json`                                                                                       |
| `src/app/api/shops/` or `src/features/shops/`                     | `shop-create.json`, `shop-settings.json`, `shop-member-management.json`, `shop-ownership-transfer.json`, `shop-roles.json` |
| `src/features/context/`                                           | `context-switching.json`                                                                                                   |
| `src/features/members/`                                           | `account-settings.json`, `onboarding.json`                                                                                 |
| `src/app/api/recently-viewed/` or `src/features/recently-viewed/` | `buyer-recently-viewed.json`, `guest-recently-viewed.json`                                                                 |
| `src/app/api/addresses/` or `src/features/addresses/`             | `buyer-addresses.json`                                                                                                     |
| `src/app/api/flags/` or `src/features/flags/`                     | `guest-browse.json` (trigger hidden), future auth'd browse/profile journeys (trigger visible as inline step)               |
| `src/proxy.ts`                                                    | `route-protection.json`                                                                                                    |
| `src/features/email/`                                             | Any journey with `"layer": "email"` steps                                                                                  |
