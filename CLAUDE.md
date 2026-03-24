# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nessi is a C2C (consumer-to-consumer) e-commerce marketplace for buying and selling fishing gear — built with Next.js 16 (App Router), Supabase (Auth, PostgreSQL, Storage), and deployed on Vercel.

## Commands

- **Dev server:** `pnpm dev`
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Lint styles:** `pnpm lint:styles`
- **Type check:** `pnpm typecheck`
- **Format:** `pnpm format` (write) / `pnpm format:check` (verify)
- **Test:** `pnpm test` (watch) / `pnpm test:run` (CI)
- **DB generate types:** `pnpm db:types`

Package manager is **pnpm** (v10.13.1). Do not use npm or yarn.

## Architecture

### Routing

Next.js App Router with a `(frontend)` route group for all UI pages. No Pages Router usage. Route protection handled by `proxy.ts` — unauthenticated users are redirected from `/dashboard/*` to `/`.

### Authentication

- **Cookie-based sessions** via `@supabase/ssr` — no localStorage
- **proxy.ts** refreshes Supabase sessions on every request and guards `/dashboard/*` routes
- **Server-side:** API routes use server client from `src/libs/supabase/server.ts` (user JWT from cookies)
- **Client-side:** Components use browser client from `src/libs/supabase/client.ts`
- **Admin operations:** Registration uses admin client from `src/libs/supabase/admin.ts` (bypasses RLS)
- `src/features/auth/context.tsx` provides `useAuth()` hook wrapping Supabase session state

### Database

- Supabase PostgreSQL accessed via `@supabase/supabase-js` + `@supabase/ssr`
- Three client utilities in `src/libs/supabase/`: browser (`client.ts`), server (`server.ts`), admin (`admin.ts`)
- Row Level Security (RLS) policies enforce access control at the database level
- Types generated from Supabase schema via `pnpm db:types` into `src/types/database.ts`

### File Storage

Two Supabase Storage buckets (both public):

| Bucket           | Path Pattern                        | API Route                                | Purpose                                |
| ---------------- | ----------------------------------- | ---------------------------------------- | -------------------------------------- |
| `listing-images` | `listings/{listing_id}/{uuid}.webp` | `src/app/api/listings/upload/route.ts`   | Listing photos (max 1200x1200 WebP)    |
| `profile-assets` | `members/{user_id}/avatar.webp`     | `src/app/api/members/avatar/route.ts`    | Member avatar (200x200 WebP via Sharp) |
| `profile-assets` | `shops/{shop_id}/avatar.webp`       | `src/app/api/shops/avatar/route.ts`      | Shop avatar (200x200 WebP via Sharp)   |
| `profile-assets` | `shops/{shop_id}/hero-banner.webp`  | `src/app/api/shops/hero-banner/route.ts` | Shop hero banner (max 1200x400 WebP)   |

RLS policies enforce per-user access. Member assets use user JWT (RLS checks `members/{uid}/*`). Shop assets use admin client in API routes (ownership verified in handler). 5MB limit, JPEG/PNG/WebP/GIF only.

### Image Handling Standards

All images in Nessi follow a strict pipeline: **validate → optimize → store as WebP → render with `next/image`**.

**Upload (API routes):**

- Validate MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`)
- Enforce 5MB file size limit
- Resize via `sharp` with `fit: 'inside'` + `withoutEnlargement: true` (preserves aspect ratio, never upscales)
- Convert to WebP at 80-85% quality before storing to Supabase Storage
- Store with `contentType: 'image/webp'`

**Rendering (components):**

- **Always use `next/image`** — never raw `<img>` tags for user-uploaded or remote images
- **Always provide `sizes`** — tells the browser which srcset variant to download. Examples:
  - Product cards: `sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 300px"`
  - Listing detail: `sizes="(max-width: 480px) 100vw, (max-width: 768px) 80vw, 600px"`
  - Fixed-size avatars: `sizes="120px"` or use `width`/`height` props
- **Use `fill` layout** when the image should fill its container (carousel slides, avatar circles). Parent must have `position: relative`.
- **Use `width`/`height`** for fixed-size inline images (navbar avatar at 32x32)
- **Add `priority`** on the first above-the-fold image (LCP candidate) — e.g., `priority={index === 0}`
- **Always provide `alt` text** — descriptive for content images, empty `alt=""` for decorative
- **`object-fit: cover`** via `style={{ objectFit: 'cover' }}` when using `fill`, or via CSS Modules

**Why this matters:** Nessi is an image-heavy marketplace. `next/image` auto-serves WebP/AVIF at the right resolution per device via Vercel's Image Optimization API. Raw `<img>` bypasses all of this — every user downloads the full original regardless of screen size.

**Config:** `next.config.mjs` has `remotePatterns` for `*.supabase.co` — all Supabase Storage URLs are optimized automatically by Vercel.

### Account Deletion & Cascade Cleanup

Account deletion is gated and handled at the application layer before the auth user is removed:

```
DELETE /api/auth/delete-account
  → Shop ownership check (409 if member owns active shops — must transfer or delete shops first)
  → Storage cleanup:
    → Deletes member avatar from `profile-assets` bucket (`members/{userId}/avatar.webp`)
    → Deletes listing photos from `listing-images` bucket
    → Deletes shop avatars and hero banners from `profile-assets` bucket (`shops/{shopId}/*`)
    → Deletes shop listing photos from `listing-images` bucket
  → Slug cleanup: deletes member's slug from `slugs` table
  → auth.admin.deleteUser()
    → members row CASCADE (FK: members_id_fkey ON DELETE CASCADE)
      → BEFORE DELETE trigger: handle_member_deletion()
        → Releases member slug and owned shop slugs from `slugs` table
        (Storage cleanup is handled in the API layer above, not in the DB trigger)
      → Member row removed
```

**When adding new user-owned resources** (listings, orders, messages, reviews, etc.):

1. Add a FK to `members.id` (or `auth.users.id`) with `ON DELETE CASCADE`
2. If the resource has storage objects, add cleanup logic to `DELETE /api/auth/delete-account` (application layer). The `handle_member_deletion()` trigger only handles slug release — storage cleanup must be done in API routes because Supabase DB triggers cannot call the Storage API.
3. If the resource is a blocking dependency for account deletion (like shop ownership), add an ownership gate in `DELETE /api/auth/delete-account` that returns 409 until the dependency is resolved
4. If the resource has cross-references (e.g., buyer ↔ seller on an order), decide whether to cascade or soft-delete — document the decision in the feature's CLAUDE.md
5. Test the full deletion chain before shipping

### Key Directories

- `src/features/auth/` — Auth domain: services, types, validations, context, form components (see its CLAUDE.md)
- `src/features/members/` — Members domain: profile data, onboarding wizard, account settings, avatar upload (see its CLAUDE.md)
- `src/features/listings/` — Listings domain: types, services, hooks, components for the full listing lifecycle — create wizard, edit wizard, photo management, status actions (see its CLAUDE.md)
- `src/features/shops/` — Shops domain: types, services, hooks for shop management (see its CLAUDE.md)
- `src/features/context/` — Context switching: Zustand store for member/shop identity switching (see its CLAUDE.md)
- `src/features/shared/` — Shared hooks (use-form, use-form-state) and types (FormState)
- `src/app/api/` — API routes (auth, listings, upload)
- `src/app/(frontend)/` — UI pages (App Router with route group)
- `src/components/` — Shared React components: controls, layout, navigation, indicators
- `src/types/` — Generated/infra types (database.ts)
- `src/libs/` — Infrastructure: Supabase clients (`supabase/`), query client (`query-client.ts`), providers (`providers.tsx`), Zustand utilities (`create-selectors.ts`)
- `src/styles/` — SCSS with variables, mixins, and utilities
- `src/assets/` — Brand assets only (logos). UI icons use `react-icons`.

### Feature Organization

Domain-specific code lives in `src/features/{domain}/` with its own services, types, validations, hooks, and components. Each feature has a `CLAUDE.md` for AI-assisted context. Shared UI primitives remain in `src/components/`, shared hooks and types in `src/features/shared/`.

When adding a new feature domain:

1. Create `src/features/{domain}/` with relevant subdirectories
2. Add a `CLAUDE.md` documenting the feature's architecture and patterns
3. Place Tanstack Query hooks in `features/{domain}/hooks/`
4. Place Zustand stores in `features/{domain}/stores/` (when needed)
5. Keep API routes in `src/app/api/{domain}/` (Next.js requirement)

### State Management

- **Server state (data fetching):** Tanstack Query (`@tanstack/react-query`). All data fetching should use `useQuery`/`useMutation` hooks, not `useEffect` + `useState`. Query hooks live in `features/{domain}/hooks/`. The `QueryClientProvider` is configured in `src/libs/providers.tsx` with 60s default `staleTime`.
- **Client state (UI/app state):** Zustand for cross-component client state (cart, filters, multi-step flows). Stores live in `features/{domain}/stores/`. Use the `createSelectors` utility from `src/libs/create-selectors.ts` for auto-generated typed selectors (`useStore.use.propertyName()`).
- **Auth state:** Supabase `onAuthStateChange` via `AuthProvider` in `src/features/auth/context.tsx`. Access with `useAuth()`.

### Icons & Brand Assets

- **UI icons:** Use `react-icons` — it's tree-shakeable and already used throughout the codebase. Import from icon sets like `react-icons/hi` (Heroicons) or `react-icons/fa` (Font Awesome). Do not add custom SVGs for standard UI icons.
- **Brand assets:** `src/assets/logos/` — Nessi logos and brand marks only. These are imported as React components via `@svgr/webpack` (e.g., `import LogoFull from '@/assets/logos/logo_full.svg'`).
- **Static files:** `public/` — for files served at a URL (favicons, robots.txt, OG images). Not for icons or logos used in components.

### Styling

SCSS with CSS Modules for component-scoped styles. Global variables in `src/styles/variables/`, responsive breakpoints in `src/styles/mixins/breakpoints.scss`. CSS Modules use flat class names (not BEM) since module scoping makes BEM redundant.

**Mobile-first is mandatory.** Nessi is a consumer marketplace — the majority of users browse, buy, and list gear on their phones. All styles must be written for the smallest screen first, then progressively enhanced with `@include breakpoint()` for larger viewports. Never write `max-width` media queries or desktop-first styles that get overridden downward. See `src/styles/CLAUDE.md` for the full mobile-first guide.

### SEO

- Root metadata with title template (`%s | Nessi`) in `src/app/(frontend)/metadata.ts`
- Product detail pages use `generateMetadata()` for dynamic titles, descriptions, and OG images
- Next.js image optimization enabled with Supabase Storage remote patterns

### Error Handling

- `error.tsx` boundaries at root and dashboard levels for graceful error recovery
- `not-found.tsx` for 404 pages
- `loading.tsx` for navigation transition states
- API routes use try/catch with structured error responses

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Environment Variables

Required in `.env.local` (see `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`.

## Observability

- **Vercel Analytics** (`@vercel/analytics`) — page views, visitors, referrers. Auto-enabled on Vercel.
- **Vercel Speed Insights** (`@vercel/speed-insights`) — real user Core Web Vitals. Auto-enabled on Vercel.
- Both are included in the root layout and require no configuration.

## Naming Conventions

All file and folder names use **kebab-case**, enforced by `eslint-plugin-check-file`:

- **TypeScript files:** `use-form-state.ts`, `product-card.tsx` (not `useFormState.ts` or `ProductCard.tsx`)
- **SCSS modules:** `button.module.scss`, `product-card.module.scss` (not `Button.module.scss`)
- **Folders:** `forgot-password-form/`, `product-card/` (not `forgotPasswordForm/`)
- **Exceptions:** Next.js dynamic routes `[id]` and route groups `(frontend)` are excluded from enforcement
- **Exports:** React components use PascalCase (`export default function LoginForm`), hooks use camelCase with `use` prefix (`export function useAllProducts`)

## Code Quality

- **ESLint** — `next/core-web-vitals` + `next/typescript` + `eslint-config-prettier` + `eslint-plugin-check-file`. `@typescript-eslint/no-explicit-any` is disabled.
- **Prettier** — Single quotes, trailing commas, 100 char width. Config in `.prettierrc`.
- **Stylelint** — `stylelint-config-standard-scss`. Config in `.stylelintrc.json`.
- **Vitest** — Unit tests with `@testing-library/react` and jsdom. Config in `vitest.config.mts`.
- **TypeScript** — `strict: true`. Run `pnpm typecheck` for standalone type checking.
- **CI** — GitHub Actions runs lint, lint:styles, typecheck, format:check, test:run, and build on every PR and push to main.

## Accessibility (WCAG 2.1 AA)

Accessibility is a requirement, not a nice-to-have. Run `/a11y-audit` before committing UI features.

- **All form inputs** must have: `aria-required` on required fields, `aria-describedby` linking to error messages, `aria-invalid` on error state, correct `autocomplete` attribute
- **All buttons** must have: `aria-busy` when in loading state, `aria-label` when icon-only
- **All modals** must have: `aria-labelledby` or `aria-label`, focus trap (Tab cycles within modal), focus restoration on close
- **All notifications** must have: `role="status"` or `role="alert"` with `aria-live`, decorative icons use `aria-hidden="true"`
- **All interactive elements** must have: visible focus indicator (`:focus-visible`), minimum 44x44px tap target on mobile
- **Screen reader text** — use the `.sr-only` global class for visually hidden but accessible text

## AI Development Fleet

Nessi uses a fleet of Claude Code skills and agents for autonomous feature development. Skills live in `.claude/skills/`, agents in `.claude/agents/`. The Conductor pipeline (`.claude/conductor/CLAUDE.md`) orchestrates ticket-to-PR automation.

### Key Workflows

- **`/feature-pipeline "{feature}"`** — End-to-end: competitor research → design spec → tickets → conductor
- **`/design-spec "{feature}"`** — Research C2C marketplace patterns, generate a design specification (replaces Figma comps)
- **`/ticket-gen "{feature}"`** — Break a feature into conductor-ready GitHub issues
- **`/conductor start #N`** — Autonomous ticket → PR pipeline

### Quality Gates

- **`/preflight`** — Build, lint, typecheck, format, tests, UI verification, accessibility (WCAG 2.1 AA)
- **`/audit`** — Combined code quality + marketplace UX + accessibility dashboard
- **`/marketplace-audit`** — C2C UX audit against competitor best practices
- **`/a11y-audit`** — WCAG 2.1 AA accessibility audit with Playwright browser testing
- **`/ui-test`** — Playwright smoke tests (page renders, console errors, interactions)

### Development Tools

- **`/feature-scaffold "{domain}"`** — Create `src/features/{domain}/` with CLAUDE.md, types, services, hooks
- **`/db-migrate "{change}"`** — Generate Supabase SQL migrations with RLS policies
- **`/write-tests "{file}"`** — Generate Vitest tests following project patterns
- **`/debug "{problem}"`** — 7-step investigation protocol (reproduce → isolate → fix → verify)
- **`/ui-design "{spec or path}"`** — Design new components, audit existing ones, or build from a spec
  - Design mode: `/ui-design "hero banner with image overlay"` — creates new component from description
  - Audit mode: `/ui-design "audit: src/features/shops/components/"` — audits existing components
- **`/ds-sync "{url}"`** — Sync a design system URL into the codebase: extracts tokens via Playwright, diffs against current SCSS foundation, interviews about naming/migration, writes implementation spec
- **`/ds-sync-components "{url}"`** — Extract atomic design components from a design system URL and scaffold React + SCSS files with smart placement

### Tech Expert Skills (auto-trigger on file edits)

- **`/ask-supabase`** — Auth, RLS, schema, Storage (triggers on `src/libs/supabase/*`, `database.ts`)
- **`/ask-nextjs`** — App Router, rendering, proxy.ts (triggers on `src/app/**`, `next.config.*`)
- **`/ask-vercel`** — Deployment, env vars, functions (triggers on `vercel.json`)
- **`/ask-scss`** — Styling, responsive, tokens (triggers on `*.module.scss`, `src/styles/**`)
- **`/ask-state`** — Tanstack Query + Zustand (triggers on `*/hooks/*`, `*/stores/*`)

### Agents (16 total — invoked by skills, not directly)

| Layer     | Agents                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Conductor | plan-architect, task-executor, phase-verifier, review-orchestrator, finding-resolver, debug-investigator, pr-creator, ticket-generator |
| Design    | ux-researcher, marketplace-audit, ui-designer, ds-sync, ds-sync-components                                                             |
| Testing   | test-author, ui-tester, a11y-auditor                                                                                                   |
| Debugging | browser-debug                                                                                                                          |

### Skill Authoring Notes

When creating new skills for this project:

- Use `user-invocable: true` (hyphenated, not underscored)
- Use `argument-hint: "quoted string"` (not `arguments:` YAML blocks)
- Use `metadata.filePattern` for dynamic triggers
- MCP namespace: `mcp__plugin_context7_context7__*` (fully qualified, not short-form)

## Launch Checklist

Pre-production items are tracked in `docs/launch-checklist.md`. Add items there whenever something is "good enough for now, fix before launch."
