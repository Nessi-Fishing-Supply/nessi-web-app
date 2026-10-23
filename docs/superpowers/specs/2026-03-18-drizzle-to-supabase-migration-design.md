# Migration: Drizzle/Neon to All-in-One Supabase

**Date**: 2026-03-18
**Status**: Approved
**Scope**: Remove Drizzle ORM, Neon database, and localStorage auth. Adopt Supabase as the single backend for auth, data, and session management following Next.js 16 + Supabase SSR best practices.

---

## 1. Motivation

Nessi is a C2C marketplace (think Reverb, Etsy, Poshmark). The current stack splits concerns across two database systems (Supabase for auth, Neon/Drizzle for data) with an insecure `x-user-id` header pattern and localStorage-based auth state. This migration consolidates to Supabase for everything, enabling:

- **Row Level Security (RLS)** at the database level for multi-tenant access control
- **Cookie-based sessions** via `@supabase/ssr` (secure, works with Server Components)
- **One database, one client, one bill** instead of Supabase + Neon + Drizzle
- **Generated TypeScript types** from the live schema (replaces Drizzle schema-as-code)
- **Supabase Realtime** readiness for future features (messaging, live notifications)

---

## 2. Current Architecture (Before)

```
Browser (Client Components)
  ├── AuthProvider (localStorage: authToken, user)
  ├── services/auth.ts → fetch('/api/auth/*')
  └── services/product.ts → fetch('/api/products/*') with x-user-id header

API Routes
  ├── /api/auth/* → Supabase server client (service role key)
  └── /api/products/* → Drizzle ORM → Neon PostgreSQL (DATABASE_URL)

Dependencies: @supabase/supabase-js, @neondatabase/serverless, drizzle-orm, drizzle-kit, pg
```

**Problems**:

- `x-user-id` header is spoofable (no server-side verification)
- DELETE `/api/products/[id]` has no auth check at all
- localStorage tokens vulnerable to XSS
- Two database connections (Supabase + Neon) for no benefit
- No RLS — all access control is application-level

---

## 3. Target Architecture (After)

```
Browser (Client Components)
  ├── Supabase browser client (cookie-based session, auto-managed)
  ├── services/auth.ts → supabase.auth.* (direct client calls)
  └── services/product.ts → fetch('/api/products/*') (no x-user-id header)

proxy.ts (Next.js 16)
  └── Refreshes Supabase session on every request via cookies

Server Components / API Routes
  └── Supabase server client (anon key + user JWT from cookies)
      └── Queries go through RLS (user can only access own data for writes)

Admin Operations (register, background jobs)
  └── Supabase admin client (service role key, bypasses RLS)

Database: Supabase PostgreSQL (single instance)
  ├── RLS policies enforce access control
  └── Types generated via `supabase gen types typescript`

Dependencies: @supabase/supabase-js, @supabase/ssr
```

---

## 4. Supabase Client Architecture

Three client utilities in `src/libs/supabase/`:

### 4.1 Browser Client (`src/libs/supabase/client.ts`)

- Uses `createBrowserClient` from `@supabase/ssr`
- For Client Components only
- Auth session managed via `document.cookie` (automatic)
- Uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RLS enforced (anon key)

### 4.2 Server Client (`src/libs/supabase/server.ts`)

- Uses `createServerClient` from `@supabase/ssr`
- For Server Components, Route Handlers, Server Actions
- Reads cookies via `cookies()` from `next/headers`
- Uses `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- RLS enforced (user JWT extracted from cookies)
- Exported as `async function createClient()` (must be called per-request)

### 4.3 Admin Client (`src/libs/supabase/admin.ts`)

- Uses `createClient` from `@supabase/supabase-js` (not SSR)
- For admin/background operations only (user registration, webhooks, cron jobs)
- Uses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- **Bypasses RLS** — never use for user-facing requests
- No cookie handling needed

---

## 5. Auth Flow Changes

### 5.1 Session Management

| Aspect          | Before                             | After                                          |
| --------------- | ---------------------------------- | ---------------------------------------------- |
| Session storage | localStorage (`authToken`, `user`) | HTTP-only cookies (managed by `@supabase/ssr`) |
| Session refresh | None (token could expire)          | `proxy.ts` refreshes on every request          |
| Server access   | Not available (client-only)        | Available in Server Components via cookies     |
| Security        | XSS-vulnerable localStorage        | HTTP-only cookies, not accessible to JS        |

### 5.2 proxy.ts (Next.js 16 — replaces middleware.ts)

Location: `src/proxy.ts` (same level as `src/app/`)

In Next.js 16, `middleware.ts` was renamed to `proxy.ts`. It exports a named `proxy` function and a `config` object with a `matcher` array. The function receives a `NextRequest` and returns a `NextResponse`.

Responsibilities:

1. Create Supabase server client with request/response cookie handlers
2. Call `supabase.auth.getUser()` to refresh expired tokens
3. Pass refreshed tokens to both the request (for downstream Server Components) and the response (for the browser)
4. Redirect unauthenticated users from protected routes (`/dashboard/*`) to home

```typescript
// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — this updates cookies if the token was expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users from protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

> **Fallback**: If `proxy.ts` does not work as expected in the installed Next.js 16 version, rename to `middleware.ts` with the same content (exporting `middleware` instead of `proxy`). The Supabase SSR integration is identical either way.

### 5.3 Auth Routes Changes

| Route                       | Before                                                   | After                                                                            |
| --------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `/api/auth/register`        | Keeps server-side (needs service role for user metadata) | Rewrite to use admin client                                                      |
| `/api/auth/login`           | Server-side API route                                    | **Remove** — use browser client `supabase.auth.signInWithPassword()` directly    |
| `/api/auth/logout`          | Server-side API route                                    | **Remove** — use browser client `supabase.auth.signOut()` directly               |
| `/api/auth/forgot-password` | Server-side API route                                    | **Remove** — use browser client `supabase.auth.resetPasswordForEmail()` directly |

### 5.4 AuthProvider / useAuth Replacement

The current `AuthProvider` in `src/context/auth.tsx` stores auth state in localStorage with `useState` + `useEffect`. This is replaced with a simpler pattern:

- No more `AuthProvider` wrapping the app
- Client components that need the user call the browser Supabase client directly
- Server components call the server Supabase client
- Auth state is the Supabase session in cookies — single source of truth

A lightweight `useAuth` hook can be retained for convenience in client components, wrapping `supabase.auth.getUser()` and `supabase.auth.onAuthStateChange()`.

### 5.5 Auth Callback (PKCE Flow)

The current callback page (`src/app/(frontend)/auth/callback/page.tsx`) parses `access_token` and `refresh_token` from `window.location.hash` (implicit flow) and calls `supabase.auth.setSession()`. This changes to the PKCE flow, which is the recommended Supabase pattern:

**New: Server-side Route Handler** (`src/app/(frontend)/auth/callback/route.ts`):

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'signup', 'recovery', etc.

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect based on callback type
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Auth error — redirect to home with error indicator
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
```

The existing client-side `page.tsx` can be simplified to a loading/error UI, or the callback can be purely server-side (Route Handler only) with redirects.

**Supabase dashboard change**: Ensure the auth flow uses PKCE (this is the default for new projects; older projects may use implicit flow and need the setting toggled in Supabase Dashboard > Auth > URL Configuration).

**Password reset flow**: After migration, the full flow is: forgot-password email -> callback route exchanges code -> redirect to reset-password page -> `supabase.auth.updateUser({ password })` on the browser client (session is now in cookies from the code exchange). This must be verified end-to-end.

### 5.6 Layout Changes

The current `src/app/(frontend)/layout.tsx` is a client component (`"use client"`) because it wraps children with `<AuthProvider>`. After removing `AuthProvider`, the layout must be converted to a Server Component:

- Remove `"use client"` directive
- Remove `AuthProvider` import and wrapper
- Any interactive elements (modals, etc.) stay as client component children

This is critical — a root-level client component prevents all descendants from being Server Components, undermining the cookie-based auth architecture.

---

## 6. Data Access Changes

### 6.1 Query Migration (Drizzle to Supabase Client)

**GET all products (public)**

```typescript
// Before (Drizzle)
const products = await db.query.products.findMany({ with: { images: true } });

// After (Supabase)
const { data: products, error } = await supabase.from('products').select('*, product_images(*)');
```

**GET product by ID**

```typescript
// Before
const product = await db.query.products.findFirst({
  where: eq(products.id, id),
  with: { images: true },
});

// After
const { data: product, error } = await supabase
  .from('products')
  .select('*, product_images(*)')
  .eq('id', id)
  .single();
```

**INSERT product + images**

```typescript
// Before
const [product] = await db
  .insert(products)
  .values({ title, description, price, userId })
  .returning();
await db
  .insert(productImages)
  .values(images.map((img) => ({ imageUrl: img.url, productId: product.id })));

// After
const { data: product, error } = await supabase
  .from('products')
  .insert({ title, description, price, user_id: user.id })
  .select()
  .single();

if (images.length > 0) {
  await supabase
    .from('product_images')
    .insert(images.map((img) => ({ image_url: img.url, product_id: product.id })));
}
```

**UPDATE product + replace images**

The current PUT route deletes all existing images then inserts new ones. With Supabase + RLS, both the DELETE and INSERT policies must pass (they check product ownership via the products table join). The pattern is the same delete-then-insert approach:

```typescript
// After — update product fields
const { error: updateError } = await supabase
  .from('products')
  .update({ title, description, price })
  .eq('id', id);

// Replace images if provided (delete old, insert new)
if (images && images.length > 0) {
  // RLS DELETE policy checks product ownership
  await supabase.from('product_images').delete().eq('product_id', id);

  // RLS INSERT policy checks product ownership
  await supabase
    .from('product_images')
    .insert(images.map((img) => ({ image_url: img.url, product_id: id })));
}

// Re-fetch the updated product with images
const { data, error } = await supabase
  .from('products')
  .select('*, product_images(*)')
  .eq('id', id)
  .single();
```

**DELETE product**

```typescript
// After — RLS ensures only the owner can delete
// Cascade delete on product_images handled by FK constraint
const { error } = await supabase.from('products').delete().eq('id', id);
```

### 6.2 API Route Auth Pattern

All product routes that require auth use the server client (which has the user's JWT from cookies):

```typescript
import { createClient } from '@/libs/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS ensures this user can only insert rows with their own user_id
  const { data, error } = await supabase
    .from('products')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();
}
```

No `x-user-id` header. No spoofing possible. RLS is the enforcement layer.

---

## 7. Row Level Security Policies

### 7.1 Products Table

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view products (public marketplace)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can insert their own products
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only update their own products
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only delete their own products
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

### 7.2 Product Images Table

```sql
-- Enable RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images (follows product visibility)
CREATE POLICY "Product images are viewable by everyone"
  ON product_images FOR SELECT
  TO authenticated, anon
  USING (true);

-- Authenticated users can insert images for their own products
CREATE POLICY "Users can insert images for own products"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id
      AND products.user_id = (SELECT auth.uid())
    )
  );

-- Users can update images for their own products
CREATE POLICY "Users can update images for own products"
  ON product_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id
      AND products.user_id = (SELECT auth.uid())
    )
  );

-- Users can delete images for their own products
CREATE POLICY "Users can delete images for own products"
  ON product_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_id
      AND products.user_id = (SELECT auth.uid())
    )
  );
```

---

## 8. Type Safety

### 8.1 Generated Types

Replace Drizzle schema files with Supabase-generated types:

```bash
# Add to package.json scripts
"db:types": "supabase gen types typescript --linked > src/types/database.ts"
```

This generates types like:

```typescript
export type Database = {
  public: {
    Tables: {
      products: {
        Row: { id: string; title: string; description: string | null; price: number; user_id: string; created_at: string; }
        Insert: { ... }
        Update: { ... }
      }
      product_images: { ... }
    }
  }
}
```

### 8.2 Typed Supabase Client

Pass the `Database` type to client creation:

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

This gives you autocomplete on `.from('products')` and type-safe `.select()` results.

### 8.3 Application Types and Naming Convention

**Breaking change**: Drizzle used camelCase in TypeScript (`userId`, `imageUrl`, `productId`, `createdAt`) mapped to snake_case columns. The Supabase client returns snake_case directly (`user_id`, `image_url`, `product_id`, `created_at`). All components currently consuming these types expect camelCase.

**Decision**: Adopt snake_case throughout to match the database and Supabase client. This is the standard Supabase convention. Update all consuming components during the migration. This is a clean break since the app will be largely rebuilt for the marketplace.

Keep `src/types/product.ts` and `src/types/auth.ts` for application-level types that extend or simplify the generated database types:

```typescript
import type { Database } from './database';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];

export type ProductWithImages = ProductRow & {
  product_images: ProductImageRow[];
};
```

Components update from `product.userId` to `product.user_id`, `image.imageUrl` to `image.image_url`, etc.

---

## 9. Product Service Layer Changes

`src/services/product.ts` drops the `x-user-id` header from all requests:

```typescript
// Before
const res = await axios.post(BASE_URL, data, {
  headers: { 'x-user-id': data.userId },
});

// After
const res = await axios.post(BASE_URL, data);
// Auth is handled by cookies automatically — no headers needed
```

The `userId` field is removed from the request body for create/update. The server-side route handler gets `user.id` from the Supabase session.

**Important**: The product service layer (`services/product.ts`) is for **client-side use only**. Client-side `fetch` calls automatically include cookies (auth). Server Components that need product data should use the Supabase server client directly (not the service layer), since server-side `fetch` to your own API routes does not automatically forward cookies.

---

## 10. Files Removed

| File/Directory                              | Reason                                             |
| ------------------------------------------- | -------------------------------------------------- |
| `src/libs/db.ts`                            | Drizzle client — replaced by Supabase clients      |
| `src/db/schema/` (entire directory)         | Drizzle schema — replaced by generated types       |
| `drizzle.config.ts`                         | Drizzle configuration                              |
| `migrations/` (directory, if exists)        | Drizzle migration output — no longer needed        |
| `src/app/api/auth/login/route.ts`           | Login moves to client-side Supabase call           |
| `src/app/api/auth/logout/route.ts`          | Logout moves to client-side Supabase call          |
| `src/app/api/auth/forgot-password/route.ts` | Forgot password moves to client-side Supabase call |

### Packages Removed

| Package                    | Reason                                                       |
| -------------------------- | ------------------------------------------------------------ |
| `drizzle-orm`              | ORM replaced by Supabase client                              |
| `drizzle-kit`              | CLI tooling for Drizzle                                      |
| `@neondatabase/serverless` | Neon connection — using Supabase DB now                      |
| `pg`                       | PostgreSQL driver — not needed with Supabase client          |
| `dotenv`                   | Drizzle config used this — Next.js handles env vars natively |

## 11. Files Added

| File                                        | Purpose                                                    |
| ------------------------------------------- | ---------------------------------------------------------- |
| `src/libs/supabase/client.ts`               | Browser Supabase client (Client Components)                |
| `src/libs/supabase/server.ts`               | Server Supabase client (Server Components, Route Handlers) |
| `src/libs/supabase/admin.ts`                | Admin Supabase client (service role, bypasses RLS)         |
| `src/proxy.ts`                              | Next.js 16 proxy for session refresh                       |
| `src/app/(frontend)/auth/callback/route.ts` | Server-side PKCE auth callback handler                     |
| `src/types/database.ts`                     | Generated Supabase types                                   |

## 12. Files Modified

| File                                        | Changes                                                                                                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/libs/supabase.ts`                      | **Remove** — replaced by `src/libs/supabase/` directory                                                                           |
| `src/context/auth.tsx`                      | Rewrite — cookie-based auth, remove localStorage                                                                                  |
| `src/services/auth.ts`                      | Rewrite — use browser Supabase client directly                                                                                    |
| `src/services/product.ts`                   | Remove `x-user-id` headers, remove `userId` from request bodies                                                                   |
| `src/app/api/auth/register/route.ts`        | Use admin client instead of old server client                                                                                     |
| `src/app/api/products/route.ts`             | Supabase queries, server client auth                                                                                              |
| `src/app/api/products/[id]/route.ts`        | Supabase queries, server client auth, RLS handles access control                                                                  |
| `src/app/api/products/user/route.ts`        | Supabase queries, server client auth                                                                                              |
| `src/app/api/products/upload/route.ts`      | Add server client auth check (`supabase.auth.getUser()`) — Vercel Blob is outside RLS so must be protected at application level   |
| `src/app/(frontend)/auth/callback/page.tsx` | Replace with server-side PKCE callback (see Section 5.5)                                                                          |
| `src/app/(frontend)/layout.tsx`             | Remove `"use client"` and `AuthProvider` wrapper — convert to Server Component so descendants can be Server Components by default |
| `src/types/product.ts`                      | Derive from generated Database types (snake_case fields — see Section 8.3)                                                        |
| `package.json`                              | Remove Drizzle/Neon packages, add `@supabase/ssr`, add `db:types` script, update scripts                                          |
| `CLAUDE.md`                                 | Update architecture documentation                                                                                                 |

---

## 13. Environment Variables

### Removed

- `DATABASE_URL` (Neon connection string)

### Kept

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (admin client only)
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob — unchanged)
- `NEXT_PUBLIC_APP_URL`

---

## 14. Migration Strategy

### Database

The products and product_images tables already exist in the Supabase database (they were created via Drizzle push). The migration involves:

1. Verify tables exist with correct schema in Supabase
2. Apply RLS policies via Supabase SQL editor or migration
3. No data migration needed — same database, same tables

### Deployment Coordination

**Critical**: RLS must be enabled and code changes deployed together. If RLS is enabled before the code migration is complete, existing Drizzle-based routes (which use the Neon `DATABASE_URL`, not Supabase) will be unaffected — they bypass Supabase entirely. However, once the code switches to the Supabase client with the anon key, RLS policies MUST already be in place or writes will fail. **Apply RLS policies in Phase 4 immediately before testing the migrated routes.**

Since Neon's `DATABASE_URL` connects to a separate database from Supabase, the data lives in two places. The current production data is in Neon. After migration, all queries go through Supabase. If there is data in Neon that needs to be preserved, it must be exported and imported into Supabase before switching. If the app is pre-launch (no production data to preserve), this is a non-issue.

### Code

Phased approach:

1. **Phase 1**: Set up new Supabase client architecture (`src/libs/supabase/`, proxy.ts, generated types)
2. **Phase 2**: Migrate auth (cookie-based sessions, remove localStorage, simplify auth routes)
3. **Phase 3**: Migrate product API routes (Drizzle queries to Supabase client)
4. **Phase 4**: Apply RLS policies, remove `x-user-id` header pattern
5. **Phase 5**: Remove Drizzle/Neon packages and files, update CLAUDE.md
6. **Phase 6**: Verify build, lint, and test all flows

---

## 15. Future Considerations

This migration sets the foundation for:

- **Supabase Realtime** for live updates (new listings, order status, messaging)
- **Supabase Storage** as potential alternative to Vercel Blob for product images
- **Supabase Edge Functions** for background processing (notifications, search indexing)
- **RLS policies for new tables** (orders, reviews, messages, shipping) following the same pattern
- **Supabase CLI** for local development and migration management
