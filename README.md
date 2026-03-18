# Nessi Web App

A C2C e-commerce marketplace built with Next.js, Supabase, and deployed on Vercel.

![Nessi Web App Logo](/src/assets/logos/logo_full.svg)

## Overview

Nessi is a consumer-to-consumer marketplace where users can:

- Create and manage accounts with secure authentication
- Browse and search product listings
- View detailed product information with image galleries
- List products for sale with multiple images
- Manage listings in a personalized dashboard

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19), App Router
- **Backend**: [Supabase](https://supabase.com/) — Auth, PostgreSQL, Storage
- **State**: [Tanstack Query](https://tanstack.com/query) (server), [Zustand](https://zustand.docs.pmnd.rs/) (client)
- **Styling**: SCSS Modules, CSS custom properties
- **Forms**: React Hook Form + Yup validation
- **Testing**: Vitest + Testing Library
- **Code Quality**: ESLint, Prettier, Stylelint, TypeScript strict
- **CI/CD**: GitHub Actions, [Vercel](https://vercel.com/)
- **Observability**: Vercel Analytics + Speed Insights

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

| Script              | Description                         |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Start dev server                    |
| `pnpm build`        | Production build                    |
| `pnpm lint`         | ESLint                              |
| `pnpm lint:styles`  | Stylelint (SCSS)                    |
| `pnpm typecheck`    | TypeScript type checking            |
| `pnpm format`       | Prettier (write)                    |
| `pnpm format:check` | Prettier (verify)                   |
| `pnpm test`         | Vitest (watch)                      |
| `pnpm test:run`     | Vitest (single run)                 |
| `pnpm db:types`     | Generate types from Supabase schema |

## Conventions

- **File and folder names**: kebab-case everywhere (`use-form-state.ts`, `button.module.scss`), enforced by ESLint
- **Component exports**: PascalCase (`export default function LoginForm`)
- **Hook exports**: camelCase with `use` prefix (`export function useAllProducts`)
- **Data fetching**: Tanstack Query hooks, not `useEffect` + `useState`
- **Client state**: Zustand stores in `features/{domain}/stores/`

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
└── assets/                # Static assets (icons, logos)
```

## License

Proprietary and confidential. Unauthorized use, reproduction, or distribution is prohibited.
