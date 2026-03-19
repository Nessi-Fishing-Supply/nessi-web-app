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

Image uploads use Supabase Storage (`product-images` bucket) via `src/app/api/products/upload/route.ts`. Images are stored under `{user_id}/{timestamp}.{ext}` paths with RLS policies enforcing per-user access. 5MB limit, JPEG/PNG/WebP/GIF only.

### Key Directories

- `src/features/auth/` — Auth domain: services, types, validations, context, form components (see its CLAUDE.md)
- `src/features/products/` — Products domain: services, types, hooks, components (see its CLAUDE.md)
- `src/features/shared/` — Shared hooks (use-form, use-form-state) and types (FormState)
- `src/app/api/` — API routes (auth, products, upload)
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

## Future Considerations

These items are not yet implemented but should be addressed before or during launch:

- **Email transactional layer** — Resend + React Email for order confirmations, shipping notifications, seller alerts. Supabase handles auth emails for now.
- **Rate limiting** — Application-level rate limiting on API routes (product creation, image uploads). Vercel WAF handles DDoS.
- **Error monitoring** — Sentry (free tier: 5K errors/month) for error aggregation, deduplication, alerting. Install with `npx @sentry/wizard@latest -i nextjs`. Purely additive, no architectural impact.
