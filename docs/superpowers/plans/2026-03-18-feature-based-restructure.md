# Feature-Based Repo Restructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the `src/` directory from type-based organization (services/, types/, validations/, hooks/) to feature/domain-based organization (features/auth/, features/products/) while keeping shared UI components at `src/components/`.

**Architecture:** Move domain-specific services, types, validations, context, and components into `features/{domain}/` folders. Shared UI primitives (controls, layout, navigation) stay in `src/components/`. Generic hooks stay in `src/hooks/`. All `@/` path alias imports are updated to reflect new locations. Each feature folder gets a `CLAUDE.md` for AI-assisted context.

**Tech Stack:** Next.js 16 App Router, TypeScript, pnpm

---

## File Structure

### New directories to create

- `src/features/auth/` — services, types, validations, context, components
- `src/features/products/` — services, types, components

### Files to move

**Auth feature:**
| From | To |
|------|-----|
| `src/services/auth.ts` | `src/features/auth/services/auth.ts` |
| `src/types/auth.ts` | `src/features/auth/types/auth.ts` |
| `src/types/forms.ts` | `src/features/auth/types/forms.ts` |
| `src/validations/auth.ts` | `src/features/auth/validations/auth.ts` |
| `src/context/auth.tsx` | `src/features/auth/context.tsx` |
| `src/components/forms/login/` | `src/features/auth/components/login-form/` |
| `src/components/forms/registration/` | `src/features/auth/components/registration-form/` |
| `src/components/forms/forgot-password/` | `src/features/auth/components/forgot-password-form/` |
| `src/components/forms/reset-password/` | `src/features/auth/components/reset-password-form/` |

**Products feature:**
| From | To |
|------|-----|
| `src/services/product.ts` | `src/features/products/services/product.ts` |
| `src/types/product.ts` | `src/features/products/types/product.ts` |
| `src/components/forms/add-product/` | `src/features/products/components/add-product-form/` |
| `src/components/cards/product-card/` | `src/features/products/components/product-card/` |
| `src/components/indicators/product-reviews/` | `src/features/products/components/product-reviews/` |
| `src/components/indicators/favorite/` | `src/features/products/components/favorite/` |

### Files that stay

- `src/components/controls/` — shared UI primitives
- `src/components/layout/` — shared layout components
- `src/components/navigation/` — shared navigation components
- `src/components/indicators/pill/` — generic indicator, not product-specific
- `src/hooks/useForm.ts`, `src/hooks/useFormState.ts` — generic form hooks
- `src/types/database.ts` — shared generated types
- `src/libs/supabase/` — infrastructure
- `src/styles/` — global styles
- `src/app/` — route layer (imports from features)

### Empty directories to clean up after moves

- `src/services/` (will be empty)
- `src/validations/` (will be empty)
- `src/context/` (will be empty)
- `src/components/forms/` (will be empty)
- `src/components/cards/` (will be empty)

---

## Import Update Map

After moving files, these imports need updating across the codebase:

| Old import path                           | New import path                                   | Files affected                                                                                      |
| ----------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@/services/auth`                         | `@/features/auth/services/auth`                   | navbar, login form, registration form, forgot-password form, reset-password form, dashboard/account |
| `@/services/product`                      | `@/features/products/services/product`            | page.tsx (home), item/[id], dashboard/products, add-product form                                    |
| `@/types/auth`                            | `@/features/auth/types/auth`                      | login form, registration form                                                                       |
| `@/types/forms`                           | `@/features/auth/types/forms`                     | useFormState, login form, registration form, forgot-password form, reset-password form              |
| `@/types/product`                         | `@/features/products/types/product`               | product service, product-card, add-product form, page.tsx (home), item/[id], dashboard/products     |
| `@/validations/auth`                      | `@/features/auth/validations/auth`                | login form, registration form                                                                       |
| `@/context/auth`                          | `@/features/auth/context`                         | layout.tsx, navbar, add-product form, dashboard/account, dashboard/products                         |
| `@/components/forms/login`                | `@/features/auth/components/login-form`           | navbar                                                                                              |
| `@/components/forms/registration`         | `@/features/auth/components/registration-form`    | navbar                                                                                              |
| `@/components/forms/forgot-password`      | `@/features/auth/components/forgot-password-form` | auth/forgot-password/page.tsx                                                                       |
| `@/components/forms/reset-password`       | `@/features/auth/components/reset-password-form`  | auth/callback/page.tsx                                                                              |
| `@/components/forms/add-product`          | `@/features/products/components/add-product-form` | dashboard/products/page.tsx                                                                         |
| `@/components/cards/product-card`         | `@/features/products/components/product-card`     | page.tsx (home), dashboard/products/page.tsx                                                        |
| `@/components/indicators/favorite`        | `@/features/products/components/favorite`         | product-card                                                                                        |
| `@/components/indicators/product-reviews` | `@/features/products/components/product-reviews`  | product-card                                                                                        |

---

## Tasks

### Task 1: Create feature directory structure and move auth files

**Files:**

- Create: `src/features/auth/services/auth.ts` (moved)
- Create: `src/features/auth/types/auth.ts` (moved)
- Create: `src/features/auth/types/forms.ts` (moved)
- Create: `src/features/auth/validations/auth.ts` (moved)
- Create: `src/features/auth/context.tsx` (moved)
- Create: `src/features/auth/components/login-form/index.tsx` (moved)
- Create: `src/features/auth/components/registration-form/index.tsx` (moved)
- Create: `src/features/auth/components/forgot-password-form/index.tsx` (moved)
- Create: `src/features/auth/components/reset-password-form/index.tsx` (moved)
- Delete: original files in `src/services/auth.ts`, `src/types/auth.ts`, `src/types/forms.ts`, `src/validations/auth.ts`, `src/context/auth.tsx`, `src/components/forms/login/`, `src/components/forms/registration/`, `src/components/forms/forgot-password/`, `src/components/forms/reset-password/`

- [ ] **Step 1: Create auth feature directories**

```bash
mkdir -p src/features/auth/{services,types,validations,components/{login-form,registration-form,forgot-password-form,reset-password-form}}
```

- [ ] **Step 2: Move auth service, types, validations, and context**

```bash
git mv src/services/auth.ts src/features/auth/services/auth.ts
git mv src/types/auth.ts src/features/auth/types/auth.ts
git mv src/types/forms.ts src/features/auth/types/forms.ts
git mv src/validations/auth.ts src/features/auth/validations/auth.ts
git mv src/context/auth.tsx src/features/auth/context.tsx
```

- [ ] **Step 3: Move auth form components**

```bash
git mv src/components/forms/login/index.tsx src/features/auth/components/login-form/index.tsx
git mv src/components/forms/registration/index.tsx src/features/auth/components/registration-form/index.tsx
git mv src/components/forms/forgot-password/index.tsx src/features/auth/components/forgot-password-form/index.tsx
git mv src/components/forms/reset-password/index.tsx src/features/auth/components/reset-password-form/index.tsx
```

- [ ] **Step 4: Update internal imports within moved auth files**

In `src/features/auth/types/forms.ts`:

- `@/types/auth` → `@/features/auth/types/auth`

In `src/features/auth/context.tsx`:

- No change needed (`@/libs/supabase/client` stays)

In `src/features/auth/services/auth.ts`:

- No change needed (`@/libs/supabase/client` stays)

In `src/features/auth/validations/auth.ts`:

- No change needed (only imports `yup`)

In `src/features/auth/components/login-form/index.tsx`:

- `@/validations/auth` → `@/features/auth/validations/auth`
- `@/types/auth` → `@/features/auth/types/auth`
- `@/services/auth` → `@/features/auth/services/auth`
- `@/types/forms` → `@/features/auth/types/forms`
- `@/hooks/useFormState` stays (shared hook)
- `@/components/controls` stays (shared component)

In `src/features/auth/components/registration-form/index.tsx`:

- `@/validations/auth` → `@/features/auth/validations/auth`
- `@/types/auth` → `@/features/auth/types/auth`
- `@/services/auth` → `@/features/auth/services/auth`
- `@/types/forms` → `@/features/auth/types/forms`
- `@/hooks/useFormState` stays
- `@/components/controls` stays
- `@/components/layout/grid` stays

In `src/features/auth/components/forgot-password-form/index.tsx`:

- `@/services/auth` → `@/features/auth/services/auth`
- `@/types/forms` → `@/features/auth/types/forms`
- `@/hooks/useFormState` stays
- `@/components/controls` stays

In `src/features/auth/components/reset-password-form/index.tsx`:

- `@/services/auth` → `@/features/auth/services/auth`
- `@/types/forms` → `@/features/auth/types/forms`
- `@/components/controls` stays

- [ ] **Step 5: Commit auth feature moves**

```bash
git add -A
git commit -m "refactor: move auth domain files into features/auth/"
```

---

### Task 2: Create products feature directory and move product files

**Files:**

- Create: `src/features/products/services/product.ts` (moved)
- Create: `src/features/products/types/product.ts` (moved)
- Create: `src/features/products/components/add-product-form/index.tsx` (moved)
- Create: `src/features/products/components/product-card/index.tsx` (moved + scss)
- Create: `src/features/products/components/product-reviews/index.tsx` (moved + scss)
- Create: `src/features/products/components/favorite/index.tsx` (moved + scss)
- Delete: original files

- [ ] **Step 1: Create products feature directories**

```bash
mkdir -p src/features/products/{services,types,components/{add-product-form,product-card,product-reviews,favorite}}
```

- [ ] **Step 2: Move product service and types**

```bash
git mv src/services/product.ts src/features/products/services/product.ts
git mv src/types/product.ts src/features/products/types/product.ts
```

- [ ] **Step 3: Move product components (with SCSS files)**

```bash
git mv src/components/forms/add-product/index.tsx src/features/products/components/add-product-form/index.tsx
git mv src/components/cards/product-card/index.tsx src/features/products/components/product-card/index.tsx
git mv src/components/cards/product-card/ProductCard.module.scss src/features/products/components/product-card/ProductCard.module.scss
git mv src/components/indicators/product-reviews/index.tsx src/features/products/components/product-reviews/index.tsx
git mv src/components/indicators/product-reviews/ProductReviews.module.scss src/features/products/components/product-reviews/ProductReviews.module.scss
git mv src/components/indicators/favorite/index.tsx src/features/products/components/favorite/index.tsx
git mv src/components/indicators/favorite/Favorite.module.scss src/features/products/components/favorite/Favorite.module.scss
```

- [ ] **Step 4: Update internal imports within moved product files**

In `src/features/products/services/product.ts`:

- `@/types/product` → `@/features/products/types/product`

In `src/features/products/types/product.ts`:

- `./database` → `@/types/database` (now needs absolute path since it moved)

In `src/features/products/components/product-card/index.tsx`:

- `@/components/indicators/pill` stays (shared component)
- `@/components/indicators/favorite` → `@/features/products/components/favorite`
- `@/components/indicators/product-reviews` → `@/features/products/components/product-reviews`
- `@/types/product` → `@/features/products/types/product`

In `src/features/products/components/add-product-form/index.tsx`:

- `@/context/auth` → `@/features/auth/context`
- `@/services/product` → `@/features/products/services/product`
- `@/types/product` → `@/features/products/types/product`
- `@/components/controls/*` stays

- [ ] **Step 5: Commit products feature moves**

```bash
git add -A
git commit -m "refactor: move product domain files into features/products/"
```

---

### Task 3: Update all consumer imports in app/ and shared components

**Files:**

- Modify: `src/app/(frontend)/layout.tsx`
- Modify: `src/app/(frontend)/page.tsx`
- Modify: `src/app/(frontend)/item/[id]/page.tsx`
- Modify: `src/app/(frontend)/item/[id]/ItemIdPage.tsx`
- Modify: `src/app/(frontend)/auth/callback/page.tsx`
- Modify: `src/app/(frontend)/auth/forgot-password/page.tsx`
- Modify: `src/app/(frontend)/dashboard/account/page.tsx`
- Modify: `src/app/(frontend)/dashboard/products/page.tsx`
- Modify: `src/components/navigation/navbar/index.tsx`
- Modify: `src/hooks/useFormState.ts`

- [ ] **Step 1: Update layout.tsx**

```typescript
// Change:
import { AuthProvider } from '@/context/auth';
// To:
import { AuthProvider } from '@/features/auth/context';
```

- [ ] **Step 2: Update navbar**

```typescript
// Change:
import { useAuth } from '@/context/auth';
import { logout } from '@/services/auth';
import LoginForm from '@/components/forms/login';
import RegisterForm from '@/components/forms/registration';
// To:
import { useAuth } from '@/features/auth/context';
import { logout } from '@/features/auth/services/auth';
import LoginForm from '@/features/auth/components/login-form';
import RegisterForm from '@/features/auth/components/registration-form';
```

- [ ] **Step 3: Update home page (page.tsx)**

```typescript
// Change:
import { getAllProducts } from '@/services/product';
import { ProductWithImages } from '@/types/product';
import ProductCard from '@/components/cards/product-card';
// To:
import { getAllProducts } from '@/features/products/services/product';
import { ProductWithImages } from '@/features/products/types/product';
import ProductCard from '@/features/products/components/product-card';
```

- [ ] **Step 4: Update item/[id] pages**

In `src/app/(frontend)/item/[id]/page.tsx`:

```typescript
// Change:
import { getAllProducts } from '@/services/product';
import type { ProductWithImages } from '@/types/product';
// To:
import { getAllProducts } from '@/features/products/services/product';
import type { ProductWithImages } from '@/features/products/types/product';
```

In `src/app/(frontend)/item/[id]/ItemIdPage.tsx`:

```typescript
// Change:
import { ProductWithImages } from '@/types/product';
// To:
import { ProductWithImages } from '@/features/products/types/product';
```

- [ ] **Step 5: Update auth pages**

In `src/app/(frontend)/auth/callback/page.tsx`:

```typescript
// Change:
import ResetPasswordForm from '@/components/forms/reset-password';
// To:
import ResetPasswordForm from '@/features/auth/components/reset-password-form';
```

In `src/app/(frontend)/auth/forgot-password/page.tsx`:

```typescript
// Change:
import ForgotPasswordForm from '@/components/forms/forgot-password';
// To:
import ForgotPasswordForm from '@/features/auth/components/forgot-password-form';
```

- [ ] **Step 6: Update dashboard pages**

In `src/app/(frontend)/dashboard/account/page.tsx`:

```typescript
// Change:
import { useAuth } from '@/context/auth';
import { logout } from '@/services/auth';
// To:
import { useAuth } from '@/features/auth/context';
import { logout } from '@/features/auth/services/auth';
```

In `src/app/(frontend)/dashboard/products/page.tsx`:

```typescript
// Change:
import { useAuth } from '@/context/auth';
import { getUserProducts } from '@/services/product';
import type { ProductWithImages } from '@/types/product';
import ProductForm from '@/components/forms/add-product';
import ProductCard from '@/components/cards/product-card';
// To:
import { useAuth } from '@/features/auth/context';
import { getUserProducts } from '@/features/products/services/product';
import type { ProductWithImages } from '@/features/products/types/product';
import ProductForm from '@/features/products/components/add-product-form';
import ProductCard from '@/features/products/components/product-card';
```

- [ ] **Step 7: Update useFormState hook**

In `src/hooks/useFormState.ts`:

```typescript
// Change:
import { FormState } from '@/types/forms';
// To:
import { FormState } from '@/features/auth/types/forms';
```

- [ ] **Step 8: Commit consumer import updates**

```bash
git add -A
git commit -m "refactor: update all imports to use features/ paths"
```

---

### Task 4: Clean up empty directories

- [ ] **Step 1: Remove empty directories**

```bash
rmdir src/services
rmdir src/validations
rmdir src/context
rmdir src/components/forms
rmdir src/components/cards
```

Note: `src/types/` keeps `database.ts` so it stays. `src/components/indicators/` keeps `pill/` so it stays.

- [ ] **Step 2: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove empty directories after feature restructure"
```

---

### Task 5: Add feature CLAUDE.md files

**Files:**

- Create: `src/features/auth/CLAUDE.md`
- Create: `src/features/products/CLAUDE.md`

- [ ] **Step 1: Create auth CLAUDE.md**

```markdown
# Auth Feature

## Overview

Authentication feature using Supabase Auth with cookie-based sessions via `@supabase/ssr`.

## Architecture

- **context.tsx** — `AuthProvider` and `useAuth()` hook wrapping Supabase session state (client-side)
- **services/auth.ts** — Client-side auth API functions (login, register, logout, password reset)
- **types/auth.ts** — Auth data interfaces (RegisterData, LoginData, ResetPasswordData, AuthResponse)
- **types/forms.ts** — Form prop interfaces and form state types (AuthFormProps, FormState)
- **validations/auth.ts** — Yup schemas for login, registration, and password reset forms

## Session Flow

1. `proxy.ts` refreshes Supabase sessions on every request (server-side)
2. `AuthProvider` listens to `onAuthStateChange` for client-side state
3. Auth forms call services which use the Supabase browser client
4. Registration goes through `/api/auth/register` (uses admin client to bypass RLS)

## Key Patterns

- Cookie-based sessions — no localStorage tokens
- Server-side: API routes use server client from `src/libs/supabase/server.ts`
- Client-side: Components use browser client from `src/libs/supabase/client.ts`
- Admin operations: Registration uses admin client from `src/libs/supabase/admin.ts`

## Components

- **login-form** — Email/password login with redirect support
- **registration-form** — New user signup with email verification
- **forgot-password-form** — Password reset email request
- **reset-password-form** — New password entry after reset link
```

- [ ] **Step 2: Create products CLAUDE.md**

```markdown
# Products Feature

## Overview

Product management feature with CRUD operations, image uploads via Vercel Blob, and product display components.

## Architecture

- **services/product.ts** — Client-side product API functions (CRUD + image upload via axios)
- **types/product.ts** — Database-derived types (Product, ProductImage, ProductWithImages)

## API Routes

Product API routes live in `src/app/api/products/`:

- `route.ts` — GET all products, POST create product
- `[id]/route.ts` — GET/PUT/DELETE single product
- `user/route.ts` — GET current user's products
- `upload/route.ts` — POST image upload to Vercel Blob

## Components

- **product-card** — Product display card with image carousel (Swiper), pricing, reviews, favorites
- **add-product-form** — Form for creating new products with multi-image upload
- **product-reviews** — Star rating display component
- **favorite** — Heart toggle button component

## Key Patterns

- Images uploaded to Vercel Blob, URLs stored in `product_images` table
- Product types derived from Supabase database schema via `@/types/database`
- Product card uses Swiper for image carousel with navigation/pagination
```

- [ ] **Step 3: Commit CLAUDE.md files**

```bash
git add -A
git commit -m "docs: add CLAUDE.md files for auth and products features"
```

---

### Task 6: Update root CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update Key Directories section in root CLAUDE.md**

Replace the Key Directories section with the updated structure reflecting the feature-based organization:

```markdown
### Key Directories

- `src/features/auth/` — Auth domain: services, types, validations, context, form components
- `src/features/products/` — Products domain: services, types, product display and form components
- `src/app/api/` — API routes (auth, products, upload)
- `src/app/(frontend)/` — UI pages (App Router with route group)
- `src/components/` — Shared React components: controls, layout, navigation, indicators
- `src/hooks/` — Shared custom hooks (useForm, useFormState)
- `src/types/` — Shared TypeScript types (database.ts)
- `src/libs/supabase/` — Supabase client utilities (browser, server, admin)
- `src/styles/` — SCSS with variables, mixins, and utilities

### Feature Organization

Domain-specific code lives in `src/features/{domain}/` with its own services, types, validations, and components. Each feature has a `CLAUDE.md` for AI-assisted context. Shared UI primitives and generic hooks remain in `src/components/` and `src/hooks/`.
```

- [ ] **Step 2: Commit CLAUDE.md update**

```bash
git add CLAUDE.md
git commit -m "docs: update root CLAUDE.md for feature-based structure"
```

---

### Task 7: Build verification

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: No errors (only existing warnings if any)

- [ ] **Step 2: Run build**

```bash
pnpm build
```

Expected: Build succeeds with no import resolution errors

- [ ] **Step 3: Fix any broken imports if needed**

If build fails, check error messages for unresolved imports and fix them.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve import issues from feature restructure"
```
