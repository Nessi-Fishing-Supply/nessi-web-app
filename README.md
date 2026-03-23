# Nessi Web App

A C2C e-commerce marketplace for buying and selling fishing gear — built with Next.js, Supabase, and deployed on Vercel.

![Nessi Web App Logo](/src/assets/logos/logo_full.svg)

## Overview

Nessi is a consumer-to-consumer marketplace where users can:

- Create and manage accounts with secure authentication
- Browse and search product listings
- View detailed product information with image galleries
- List products for sale with multiple images
- Manage listings in a personalized dashboard

## Tech Stack

| Category               | Technology                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| **Framework**          | [Next.js 16](https://nextjs.org/) (React 19), App Router                   |
| **Backend**            | [Supabase](https://supabase.com/) — Auth, PostgreSQL, Storage              |
| **Server State**       | [Tanstack Query](https://tanstack.com/query)                               |
| **Client State**       | [Zustand](https://zustand.docs.pmnd.rs/)                                   |
| **Styling**            | SCSS Modules, CSS custom properties                                        |
| **Forms**              | React Hook Form + Yup validation                                           |
| **Icons**              | [react-icons](https://react-icons.github.io/react-icons/) (tree-shakeable) |
| **Testing**            | Vitest + Testing Library                                                   |
| **Code Quality**       | ESLint, Prettier, Stylelint, TypeScript strict                             |
| **CI/CD**              | GitHub Actions, [Vercel](https://vercel.com/)                              |
| **Observability**      | Vercel Analytics + Speed Insights                                          |
| **SEO**                | Dynamic metadata with OG tags per page                                     |
| **Image Optimization** | Next.js Image with Supabase Storage remote patterns                        |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) LTS (v24+) — use `nvm use` to auto-select
- [pnpm](https://pnpm.io/) (v10.13.1+)

### Setup

```bash
git clone https://github.com/Nessi-Fishing-Supply/Nessi-Web-App.git
cd nessi-web-app
pnpm install
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials, or pull from Vercel:

```bash
vercel link
vercel env pull .env.local
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Start dev server                               |
| `pnpm build`        | Production build                               |
| `pnpm lint`         | ESLint (includes file naming enforcement)      |
| `pnpm lint:styles`  | Stylelint (SCSS)                               |
| `pnpm typecheck`    | TypeScript type checking                       |
| `pnpm format`       | Prettier (write)                               |
| `pnpm format:check` | Prettier (verify)                              |
| `pnpm test`         | Vitest (watch mode)                            |
| `pnpm test:run`     | Vitest (single run, used in CI)                |
| `pnpm db:types`     | Generate TypeScript types from Supabase schema |

## Project Structure

```
src/
├── features/              # Domain logic (feature-based organization)
│   ├── auth/              # Auth: services, types, validations, context, components
│   ├── products/          # Products: services, types, hooks, components
│   └── shared/            # Shared hooks (use-form, use-form-state) and types
├── components/            # Shared UI components (controls, layout, navigation)
├── app/                   # Next.js App Router pages and API routes
│   ├── (frontend)/        # UI pages (route group)
│   └── api/               # API routes (auth, products)
├── libs/                  # Infrastructure (Supabase clients, providers, query client)
├── types/                 # Generated types (database.ts)
├── styles/                # Global SCSS variables, mixins, utilities
└── assets/                # Brand assets (logos only — UI icons use react-icons)
```

## Architecture Decisions

### Feature-Based Organization

Domain code lives in `src/features/{domain}/` — each feature owns its services, types, hooks, validations, and components. Each feature has a `CLAUDE.md` for AI-assisted development context. Shared UI primitives stay in `src/components/`.

### State Management

- **Server state**: Tanstack Query with domain-specific hooks in `features/{domain}/hooks/` (e.g., `useAllProducts`, `useUserProducts`). Never use `useEffect` + `useState` for data fetching.
- **Client state**: Zustand stores in `features/{domain}/stores/` with auto-generated selectors via `createSelectors` utility.
- **Auth state**: Supabase `onAuthStateChange` via React Context (`useAuth()` hook).

### Data Layer

- Supabase PostgreSQL with Row Level Security (RLS) for access control
- Supabase Storage for image uploads (per-user paths, RLS-enforced)
- TypeScript types auto-generated from database schema (`pnpm db:types`)

### Error Handling

- `error.tsx` boundaries at root and dashboard levels
- `not-found.tsx` for 404 pages
- `loading.tsx` for navigation transitions
- API routes return structured JSON error responses

### Route Protection

`proxy.ts` intercepts all requests — refreshes Supabase sessions and redirects unauthenticated users from `/dashboard/*` to `/`.

## Conventions

| Area              | Convention                                            | Enforcement                |
| ----------------- | ----------------------------------------------------- | -------------------------- |
| File names        | kebab-case (`use-form-state.ts`)                      | `eslint-plugin-check-file` |
| Folder names      | kebab-case (`product-card/`)                          | `eslint-plugin-check-file` |
| SCSS modules      | kebab-case (`button.module.scss`)                     | `eslint-plugin-check-file` |
| Component exports | PascalCase (`export default function LoginForm`)      | Code review                |
| Hook exports      | camelCase with `use` prefix (`useAllProducts`)        | Code review                |
| Data fetching     | Tanstack Query hooks, not `useEffect`                 | Code review                |
| UI icons          | `react-icons`, not custom SVGs                        | Documented convention      |
| Brand assets      | `src/assets/logos/` only                              | Documented convention      |
| CSS in modules    | Flat class names, not BEM (module scoping handles it) | Documented convention      |

## CI/CD

GitHub Actions runs on every push to `main` and every PR:

1. ESLint (includes file naming rules)
2. Stylelint (SCSS)
3. TypeScript type checking
4. Prettier format verification
5. Vitest tests
6. Next.js production build

Vercel deploys automatically on push to `main` (production) and on PR branches (preview).

## AI Development Fleet

Nessi uses a fleet of **14 AI agents** and **21 skills** for autonomous feature development via [Claude Code](https://claude.ai/code). The system replaces the need for design comps by researching C2C marketplace competitors and generating design specifications.

### Quick Start

```bash
# End-to-end: research → design → tickets → build
/feature-pipeline "search and filters"

# Or step by step
/design-spec "seller profiles"          # Research competitors, generate spec
/ticket-gen "seller profiles"           # Create GitHub issues
/conductor start #15                    # Autonomous build → PR

# Quality checks
/preflight                              # Build, lint, type, format, tests, UI, a11y
/audit                                  # Combined quality + UX + accessibility dashboard

# Development tools
/feature-scaffold "messaging"           # New feature directory with CLAUDE.md
/db-migrate "add orders table"          # Supabase migration with RLS
/write-tests "src/features/products"    # Generate Vitest tests
/debug "cart total is wrong"            # 7-step investigation protocol

# Tech experts (also auto-trigger on file edits)
/ask-supabase "RLS policy for orders?"  # Database, Auth, Storage
/ask-nextjs "ISR vs SSR for listings?"  # App Router, rendering
/ask-scss "responsive product grid?"    # SCSS Modules, breakpoints
```

### Architecture

```
/feature-pipeline "{feature}"
    ├── /design-spec → ux-researcher agent (competitor research)
    ├── /ticket-gen → ticket-generator agent (GitHub issues)
    └── /conductor start → plan-architect → task-executor → /preflight → PR
                                                └── expert skills (auto-consulted)
```

Skills live in `.claude/skills/`, agents in `.claude/agents/`, Conductor docs in `.claude/conductor/CLAUDE.md`.

## Future Roadmap

Not yet implemented — address before or during launch:

- **Email transactional layer** — Resend + React Email for order confirmations, shipping notifications, seller alerts
- **Rate limiting** — Application-level rate limiting on API routes (product creation, image uploads)
- **Error monitoring** — Sentry for error aggregation, alerting, and stack traces in production

## License

Proprietary and confidential. Unauthorized use, reproduction, or distribution is prohibited.
