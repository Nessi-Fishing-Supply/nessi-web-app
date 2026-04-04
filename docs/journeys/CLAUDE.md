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

Use `"goTo": "END"` only for truly invisible internal short-circuits. For decision branches with user-visible outcomes, point to a terminal step node that describes what the user sees. Reference other journey files in `notes` for cross-journey links (e.g., "See cart.json for full flow").

## Structural Quality Rules

These rules ensure journeys are interactive and useful in nessi-docs tracer mode.

### No Dead-End Decisions

Every `"goTo": "END"` on a decision branch that represents a user-visible outcome must instead point to a terminal step node. The step describes what the user actually sees: a toast, error message, empty state, disabled button, redirect, etc.

**Bad:** `{ "label": "At cap", "goTo": "END" }` — tracer path just stops, no feedback
**Good:** `{ "label": "At cap", "goTo": "cap-reached" }` → step with tooltip describing the UI

### No Disconnected Flows

Journeys with 3+ flows must have a **hub flow** connecting them via a decision branch. Without a hub, disconnected flows render as separate columns on the canvas with no edges — tracer mode can't navigate between them.

Hub flow pattern: a single entry step ("Open {Page}") followed by a "What action?" branch pointing to each flow's first step.

Exception: 2-flow journeys where the flows are genuinely independent (e.g., a main flow + background side-effects).

### Consolidate, Don't Split

Don't create separate journey files for guest vs authenticated versions of the same feature — use an "Authenticated?" decision fork. Don't split lifecycle phases (invite/accept/work/leave) across files — use a lifecycle hub.

**When to keep separate:** Different domains, different core personas (buyer vs seller), or files exceeding ~30 flows.

### Factual Accuracy Over Completeness

Never add `"status": "built"` steps for behavior that doesn't exist in code. If there's a gap, add `"status": "planned"` with `"notes"`, or leave the gap. Nessi-docs is designed to surface missing coverage.

## Schema

All journey files must validate against `schema.json` in this directory. The schema defines:

- Required fields: `slug`, `title`, `persona`, `description`, `flows`
- Valid personas: `guest`, `auth`, `onboarding`, `buyer`, `seller`, `shop-owner`, `shop-member`, `account`, `context`
- Valid layers: `client`, `server`, `database`, `background`, `email`, `external`
- Valid statuses: `planned`, `built`, `tested`

## File Naming

Files use `{feature}.json` naming when the journey covers both guest and authenticated paths (e.g., `cart.json`, `recently-viewed.json`, `browse-and-search.json`). Persona-specific journeys use `{persona}-{feature}.json` (e.g., `seller-listings.json`). Lifecycle journeys use `{domain}-{scope}.json` (e.g., `shop-members.json`). Cross-cutting concerns use their domain directly (e.g., `context-switching.json`, `onboarding.json`).

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

### Journey Domain Assignment

Each journey file has a `domain` field that maps it to a feature domain in nessi-docs. Valid domains: `auth`, `shopping`, `messaging`, `cart`, `account`, `shops`, `listings`, `identity`. When creating a new journey, assign the domain based on the journey's **primary feature** — the feature the journey is fundamentally _about_, not every feature it touches. Cross-domain touchpoints are handled by the cross-link system in nessi-docs, not by domain assignment.

If a journey primarily covers a feature that doesn't have its own domain yet, assign it to the parent domain and flag the feature for domain evaluation (see root CLAUDE.md "Feature Domain Classification").

### File ↔ Code Mapping

| Changed code path                                                 | Affected journey files                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/app/api/auth/` or `src/features/auth/`                       | `signup.json`, `login.json`, `password-reset.json`, `email-change.json`, `logout.json`                           |
| `src/app/api/listings/` or `src/features/listings/`               | `seller-listings.json`, `browse-and-search.json`                                                                 |
| `src/app/api/cart/` or `src/features/cart/`                       | `cart.json`                                                                                                      |
| `src/app/api/shops/` or `src/features/shops/`                     | `shop-create.json`, `shop-settings.json`, `shop-members.json`, `shop-ownership-transfer.json`, `shop-roles.json` |
| `src/features/context/`                                           | `context-switching.json`                                                                                         |
| `src/features/members/`                                           | `account-settings.json`, `onboarding.json`                                                                       |
| `src/app/api/recently-viewed/` or `src/features/recently-viewed/` | `recently-viewed.json`                                                                                           |
| `src/app/api/addresses/` or `src/features/addresses/`             | `buyer-addresses.json`                                                                                           |
| `src/app/api/flags/` or `src/features/flags/`                     | `browse-and-search.json`                                                                                         |
| `src/app/api/messaging/` or `src/features/messaging/`             | `buyer-seller-messaging.json`                                                                                    |
| `src/app/api/offers/` or `src/features/messaging/`                | `buyer-seller-messaging.json` (offer flows)                                                                      |
| `src/proxy.ts`                                                    | `route-protection.json`                                                                                          |
| `src/features/email/`                                             | Any journey with `"layer": "email"` steps                                                                        |
