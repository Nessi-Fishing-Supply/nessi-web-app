# Drizzle/Neon to Supabase Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Drizzle ORM + Neon with Supabase for all data access and auth, using `@supabase/ssr` cookie-based sessions and Row Level Security.

**Architecture:** Three Supabase clients (browser, server, admin) replace Drizzle + localStorage auth. `proxy.ts` refreshes sessions. RLS enforces access control at the database. Generated TypeScript types replace Drizzle schema.

**Tech Stack:** Next.js 16, @supabase/supabase-js, @supabase/ssr, Vercel Blob (unchanged)

**Spec:** `docs/superpowers/specs/2026-03-18-drizzle-to-supabase-migration-design.md`

---

## File Structure

### Files to Create

| File                                        | Responsibility                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/libs/supabase/client.ts`               | Browser Supabase client for Client Components                                       |
| `src/libs/supabase/server.ts`               | Server Supabase client for Server Components / Route Handlers                       |
| `src/libs/supabase/admin.ts`                | Admin Supabase client (service role, bypasses RLS)                                  |
| `src/proxy.ts`                              | Next.js 16 proxy — refreshes Supabase session on every request                      |
| `src/app/(frontend)/auth/callback/route.ts` | Server-side PKCE auth callback handler                                              |
| `src/types/database.ts`                     | Supabase-generated TypeScript types (placeholder until `supabase gen types` is run) |

### Files to Delete

| File                                        | Reason                                       |
| ------------------------------------------- | -------------------------------------------- |
| `src/libs/supabase.ts`                      | Replaced by `src/libs/supabase/` directory   |
| `src/libs/db.ts`                            | Drizzle client — no longer needed            |
| `src/db/schema/products.ts`                 | Drizzle schema — replaced by generated types |
| `src/db/schema/productImages.ts`            | Drizzle schema — replaced by generated types |
| `src/db/schema/index.ts`                    | Drizzle schema barrel export                 |
| `drizzle.config.ts`                         | Drizzle configuration                        |
| `src/app/api/auth/login/route.ts`           | Login moves client-side                      |
| `src/app/api/auth/logout/route.ts`          | Logout moves client-side                     |
| `src/app/api/auth/forgot-password/route.ts` | Forgot-password moves client-side            |

### Files to Modify

| File                                             | Changes                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `package.json`                                   | Remove 5 packages, add `@supabase/ssr`, update db scripts           |
| `src/context/auth.tsx`                           | Rewrite: cookie-based via Supabase, remove localStorage             |
| `src/services/auth.ts`                           | Rewrite: direct browser Supabase client calls                       |
| `src/services/product.ts`                        | Remove `x-user-id` headers, remove `userId` from bodies, snake_case |
| `src/types/product.ts`                           | Derive from generated Database types (snake_case)                   |
| `src/app/api/auth/register/route.ts`             | Use admin client                                                    |
| `src/app/api/products/route.ts`                  | Supabase client queries, server auth                                |
| `src/app/api/products/[id]/route.ts`             | Supabase client queries, server auth                                |
| `src/app/api/products/user/route.ts`             | Supabase client queries, server auth                                |
| `src/app/api/products/upload/route.ts`           | Add auth check                                                      |
| `src/app/(frontend)/layout.tsx`                  | Remove `"use client"`, remove AuthProvider                          |
| `src/app/(frontend)/auth/callback/page.tsx`      | Simplify to loading/redirect UI                                     |
| `src/app/(frontend)/page.tsx`                    | Update to snake_case fields                                         |
| `src/app/(frontend)/item/[id]/page.tsx`          | Update server-side fetch                                            |
| `src/app/(frontend)/item/[id]/ItemIdPage.tsx`    | Update to snake_case fields                                         |
| `src/app/(frontend)/dashboard/products/page.tsx` | Use new auth pattern, snake_case                                    |
| `src/app/(frontend)/dashboard/account/page.tsx`  | Use new auth pattern                                                |
| `src/components/navigation/navbar/index.tsx`     | Use new auth, remove old useAuth patterns                           |
| `src/components/forms/login/index.tsx`           | Direct Supabase signIn, no API route                                |
| `src/components/forms/registration/index.tsx`    | Keep API route call (register stays server-side)                    |
| `src/components/forms/reset-password/index.tsx`  | Use browser Supabase client                                         |
| `src/components/forms/add-product/index.tsx`     | Remove userId from create flow, snake_case                          |
| `src/components/cards/product-card/index.tsx`    | Update to snake_case image fields                                   |
| `CLAUDE.md`                                      | Update architecture docs                                            |

---

## Task 1: Install @supabase/ssr (Additive Only)

> **Build safety**: This task ONLY adds the new package. Drizzle/Neon packages are removed later in Task 9 after all consuming files are migrated. This keeps the build passing.

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install @supabase/ssr**

```bash
pnpm add @supabase/ssr
```

- [ ] **Step 2: Verify install succeeded**

Run: `pnpm list @supabase/ssr @supabase/supabase-js`
Expected: Both packages listed with versions

- [ ] **Step 3: Verify build still passes**

```bash
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @supabase/ssr package"
```

---

## Task 2: Create Supabase Client Architecture

**Files:**

- Create: `src/libs/supabase/client.ts`
- Create: `src/libs/supabase/server.ts`
- Create: `src/libs/supabase/admin.ts`
- Delete: `src/libs/supabase.ts`
- Delete: `src/libs/db.ts`

- [ ] **Step 1: Create browser client**

Create `src/libs/supabase/client.ts`:

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

- [ ] **Step 2: Create server client**

Create `src/libs/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from Server Component — ignored if proxy
            // handles session refresh
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create admin client**

Create `src/libs/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
```

- [ ] **Step 4: Commit (keep old files for now)**

> **Build safety**: Do NOT delete `src/libs/supabase.ts` or `src/libs/db.ts` yet. They are still imported by services/auth.ts, callback page, and product API routes. They are deleted in Task 9 after all consumers are migrated.

```bash
git add src/libs/supabase/
git commit -m "feat: add Supabase SSR client architecture (browser, server, admin)"
```

---

## Task 3: Create Proxy and Database Types

**Files:**

- Create: `src/proxy.ts`
- Create: `src/types/database.ts`
- Modify: `src/types/product.ts`

- [ ] **Step 1: Create proxy.ts for session refresh**

Create `src/proxy.ts`:

```typescript
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

> **If build fails with proxy.ts**: Next.js 16 may still expect `middleware.ts`. Rename file to `src/middleware.ts` and rename the exported function from `proxy` to `middleware`. The cookie logic is identical.

- [ ] **Step 2: Create placeholder database types**

Create `src/types/database.ts`. This is a placeholder matching the current schema. Replace with `pnpm db:types` once the Supabase CLI is linked.

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          price: number;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          price: number;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          image_url: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          image_url?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_images_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
```

- [ ] **Step 3: Commit (do NOT update product types yet)**

> **Build safety**: The `src/types/product.ts` update to snake_case is deferred to Task 8 when all consuming components are updated together. Changing it now would break every component that reads `product.images` or `image.imageUrl`.

```bash
git add src/proxy.ts src/types/database.ts
git commit -m "feat: add proxy.ts session refresh and database types"
```

---

## Task 4: Migrate Auth System

**Files:**

- Modify: `src/context/auth.tsx`
- Modify: `src/services/auth.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Delete: `src/app/api/auth/login/route.ts`
- Delete: `src/app/api/auth/logout/route.ts`
- Delete: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/(frontend)/auth/callback/route.ts`
- Modify: `src/app/(frontend)/auth/callback/page.tsx`

- [ ] **Step 1: Rewrite auth context**

Replace `src/context/auth.tsx` entirely.

> **Build safety**: The new `useAuth` interface MUST preserve all fields that existing consumers use (`isAuthenticated`, `setAuthenticated`, `token`, `setToken`, `user`, `setUser`) as no-ops or pass-throughs. This keeps the build passing. These legacy fields are cleaned up in Task 7 when all consumers are updated.

```typescript
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/libs/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  // New interface
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Legacy interface (kept for backward compat until Task 7 cleans up consumers)
  setAuthenticated: (value: boolean) => void;
  token: string | null;
  setToken: (value: string | null) => void;
  setUser: (user: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      // Legacy no-ops — consumers still reference these until Task 7
      setAuthenticated: () => {},
      token: null,
      setToken: () => {},
      setUser: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

> Note: We keep AuthProvider because many client components consume `useAuth`. The layout keeps `"use client"` for now. The AuthProvider wraps Supabase's cookie-based session — no localStorage. The legacy fields (`setAuthenticated`, `token`, `setToken`, `setUser`) are no-ops that prevent TypeScript errors in consumers not yet updated.

- [ ] **Step 2: Rewrite auth service**

Replace `src/services/auth.ts` entirely:

```typescript
import { createClient } from '@/libs/supabase/client';

// Register new user (stays server-side — needs service role for metadata)
export const register = async (data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Registration failed');
  return json;
};

// Login — direct Supabase client call (cookie-based)
export const login = async (data: { email: string; password: string }) => {
  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw new Error(error.message);
  return { user: authData.user, session: authData.session };
};

// Logout — direct Supabase client call
export const logout = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

// Get current user profile
export const getUserProfile = async () => {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return user;
};

// Send password reset email — direct Supabase client call
export const forgotPassword = async (data: { email: string }) => {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  });

  if (error) throw new Error(error.message);
  return { message: 'Reset link sent! Check your email.' };
};

// Update password (user must have active session from recovery flow)
export const resetPassword = async (data: { newPassword: string; confirmNewPassword: string }) => {
  if (data.newPassword !== data.confirmNewPassword) {
    throw new Error('Passwords do not match');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: data.newPassword,
  });

  if (error) throw new Error(error.message);
  return { message: 'Password updated successfully' };
};
```

- [ ] **Step 3: Rewrite register route to use admin client**

Replace `src/app/api/auth/register/route.ts`:

```typescript
import { createAdminClient } from '@/libs/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { firstName, lastName, email, password, terms } = await req.json();

    if (!firstName || !lastName || !email || !password || !terms) {
      return NextResponse.json(
        { error: 'All fields are required and terms must be accepted' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { firstName, lastName },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Send verification email
    const { error: otpError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=signup`,
      },
    });

    if (otpError) {
      console.error('Failed to send verification email:', otpError.message);
    }

    return NextResponse.json(
      { message: 'Registration successful. Please check your email to verify your account.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
```

> **Note on register route**: The `admin.createUser` creates the user but `admin.generateLink` only _generates_ a link — it does NOT send an email automatically. If Supabase's built-in email sending is configured, use `supabase.auth.signUp()` from the admin client instead, which triggers the confirmation email. The simplest working approach:
>
> ```typescript
> const { data, error } = await supabase.auth.signUp({
>   email,
>   password,
>   options: {
>     data: { firstName, lastName },
>     emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=signup`,
>   },
> });
> ```
>
> This is essentially the same as the old register route but using `createAdminClient()` instead of `createSupabaseServer()`.

- [ ] **Step 4: Delete removed auth routes**

```bash
rm src/app/api/auth/login/route.ts
rm src/app/api/auth/logout/route.ts
rm src/app/api/auth/forgot-password/route.ts
```

- [ ] **Step 5: Create PKCE callback route handler**

Create `src/app/(frontend)/auth/callback/route.ts`:

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/callback?status=recovery`);
      }
      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/?verified=true`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
```

- [ ] **Step 6: Simplify callback page.tsx**

Replace `src/app/(frontend)/auth/callback/page.tsx`:

```typescript
'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './Callback.module.scss';
import ResetPasswordForm from '@/components/forms/reset-password';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams?.get('status');

  if (status === 'recovery') {
    return (
      <section className={styles.form}>
        <h5>Reset Password</h5>
        <p>Enter a new password for your account.</p>
        <ResetPasswordForm />
      </section>
    );
  }

  // Default: show loading while the route.ts handler processes
  return <p>Processing authentication...</p>;
}

export default function Callback() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<p>Loading...</p>}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/context/auth.tsx src/services/auth.ts src/app/api/auth/register/route.ts \
  src/app/\(frontend\)/auth/callback/route.ts src/app/\(frontend\)/auth/callback/page.tsx
git rm src/app/api/auth/login/route.ts src/app/api/auth/logout/route.ts \
  src/app/api/auth/forgot-password/route.ts
git commit -m "feat: migrate auth to Supabase SSR cookie-based sessions"
```

---

## Task 5: Migrate Product API Routes

**Files:**

- Modify: `src/app/api/products/route.ts`
- Modify: `src/app/api/products/[id]/route.ts`
- Modify: `src/app/api/products/user/route.ts`
- Modify: `src/app/api/products/upload/route.ts`

- [ ] **Step 1: Rewrite GET/POST /api/products**

Replace `src/app/api/products/route.ts`:

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, price, images } = await req.json();

    if (!title || !price) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({ title, description, price: parseFloat(price), user_id: user.id })
      .select()
      .single();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const imageRows = images
        .filter((img: { url: string }) => img.url)
        .map((img: { url: string }) => ({
          image_url: img.url,
          product_id: product.id,
        }));

      if (imageRows.length > 0) {
        await supabase.from('product_images').insert(imageRows);
      }
    }

    // Re-fetch with images
    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', product.id)
      .single();

    return NextResponse.json(fullProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_images(*)');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Rewrite GET/PUT/DELETE /api/products/[id]**

Replace `src/app/api/products/[id]/route.ts`:

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, price, images } = await req.json();

    // RLS ensures only the owner can update
    const { error: updateError } = await supabase
      .from('products')
      .update({ title, description, price: parseFloat(price) })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Replace images if provided
    if (images && images.length > 0) {
      await supabase.from('product_images').delete().eq('product_id', id);

      const imageRows = images
        .filter((img: { url: string }) => img.url)
        .map((img: { url: string }) => ({
          image_url: img.url,
          product_id: id,
        }));

      if (imageRows.length > 0) {
        await supabase.from('product_images').insert(imageRows);
      }
    }

    // Re-fetch with images
    const { data: product, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get image URLs for Vercel Blob cleanup
    const { data: images } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', id);

    // Delete blobs (best-effort)
    if (images) {
      for (const img of images) {
        try {
          await del(img.image_url);
        } catch (e) {
          console.error('Failed to delete blob:', img.image_url, e);
        }
      }
    }

    // RLS ensures only the owner can delete
    // FK cascade handles product_images deletion
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Rewrite GET /api/products/user**

Replace `src/app/api/products/user/route.ts`:

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching user products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Add auth to upload route**

Replace `src/app/api/products/upload/route.ts`:

```typescript
import { put } from '@vercel/blob';
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const blob = await put(file.name, file.stream(), {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/products/
git commit -m "feat: migrate product API routes from Drizzle to Supabase client"
```

---

## Task 6: Update Product Service and Layout

**Files:**

- Modify: `src/services/product.ts`
- Modify: `src/app/(frontend)/layout.tsx`

- [ ] **Step 1: Rewrite product service (remove x-user-id, snake_case)**

Replace `src/services/product.ts`:

```typescript
import axios from 'axios';
import type { ProductWithImages } from '@/types/product';

const BASE_URL = '/api/products';

export const createProduct = async (data: {
  title: string;
  description: string;
  price: string;
  images?: { url: string }[];
}): Promise<ProductWithImages> => {
  const res = await axios.post(BASE_URL, data);
  return res.data;
};

export const getAllProducts = async (): Promise<ProductWithImages[]> => {
  const res = await axios.get(BASE_URL);
  return res.data;
};

export const getUserProducts = async (): Promise<ProductWithImages[]> => {
  const res = await axios.get(`${BASE_URL}/user`);
  return res.data;
};

export const getProductById = async (id: string): Promise<ProductWithImages> => {
  const res = await axios.get(`${BASE_URL}/${id}`);
  return res.data;
};

export const updateProduct = async (
  id: string,
  data: {
    title: string;
    description: string;
    price: string;
    images?: { url: string }[];
  },
): Promise<ProductWithImages> => {
  const res = await axios.put(`${BASE_URL}/${id}`, data);
  return res.data;
};

export const deleteProduct = async (id: string): Promise<{ success: boolean }> => {
  const res = await axios.delete(`${BASE_URL}/${id}`);
  return res.data;
};

export const uploadProductImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${BASE_URL}/upload`, formData);
  return res.data.url;
};
```

> Key changes: Removed `userId` parameter from `getUserProducts`, `createProduct`, `updateProduct`. Removed all `x-user-id` headers. Removed server-side `BASE_URL` branching (this is client-only now). Cookies handle auth automatically.

- [ ] **Step 2: Update layout to Server Component**

Read the current `src/app/(frontend)/layout.tsx` and rewrite it. Remove `"use client"`, remove `AuthProvider` import/usage. Keep the rest of the layout intact. The `Navbar` component is `"use client"` already so it stays as a client component child.

The layout currently has `"use client"` because of `AuthProvider`. We keep `AuthProvider` (it's now a thin wrapper over Supabase cookies, no localStorage) but remove the `"use client"` directive from the layout since `AuthProvider` creates its own client boundary.

> **Critical**: Preserve the Inter font, `<Suspense>` around Navbar, the `<div id="modal-root">` (used by the Modal component for portals), and the correct SCSS import path (`globals.scss` with an 's').

```typescript
import React, { Suspense } from 'react';
import { Inter } from 'next/font/google';
import '@/styles/globals.scss';
import 'normalize.css';
import Navbar from '@/components/navigation/navbar';
import { AuthProvider } from '@/context/auth';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
});

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Navbar />
          </Suspense>
          {children}
          <div id="modal-root"></div>
        </AuthProvider>
      </body>
    </html>
  );
}
```

> Note: Only change from the current layout is removing `"use client"`. Everything else stays identical. `AuthProvider` is a client component so it creates its own boundary — Server Component children below the layout still work.

- [ ] **Step 3: Commit**

```bash
git add src/services/product.ts src/app/\(frontend\)/layout.tsx
git commit -m "feat: update product service and layout for Supabase auth"
```

---

## Task 7: Update Auth-Dependent Components

**Files:**

- Modify: `src/components/navigation/navbar/index.tsx`
- Modify: `src/components/forms/login/index.tsx`
- Modify: `src/components/forms/reset-password/index.tsx`
- Modify: `src/app/(frontend)/dashboard/products/page.tsx`
- Modify: `src/app/(frontend)/dashboard/account/page.tsx`
- Modify: `src/app/(frontend)/auth/forgot-password/page.tsx`

- [ ] **Step 1: Update Navbar**

In `src/components/navigation/navbar/index.tsx`, update the auth imports and usage:

1. Change `import { useAuth } from '@/context/auth'` — keep this (same hook, new implementation)
2. Remove `import { User } from '@supabase/supabase-js'` — the `useAuth` hook now provides the user
3. Update the component to use `useAuth()` which now returns `{ user, isAuthenticated, isLoading }`
4. Remove `getUserProfile` calls — `useAuth` provides the user directly
5. Update `logout` import and the logout handler — `logout()` from services now works directly
6. Remove the `fetchUser` useEffect entirely — user comes from context
7. Replace `user` state with `useAuth().user`
8. Remove `setAuthenticated` and `setToken` usage — just call `logout()` and reload

Key changes to the component:

- Remove: `const [user, setUser] = useState<User | null>(null);`
- Remove: The `fetchUser` useEffect
- Change: `const { isAuthenticated, setAuthenticated, setToken } = useAuth()` → `const { user, isAuthenticated, isLoading } = useAuth()`
- Change: logout handler to just call `logout()` then `window.location.href = '/'`

- [ ] **Step 2: Update Login Form**

In `src/components/forms/login/index.tsx`:

- The `login()` function in services now returns `{ user, session }` and sets cookies automatically
- Remove any `localStorage.setItem` calls
- Remove `setToken`, `setAuthenticated`, `setUser` calls from `useAuth`
- After successful login, just reload the page or redirect — the proxy will pick up the session

Update the submit handler:

```typescript
const onSubmit = async (data: LoginFormData) => {
  try {
    setFormState({ isLoading: true, error: null, success: false });
    await login(data);
    setFormState({ isLoading: false, error: null, success: true });
    // Reload to pick up the new session in the proxy
    window.location.href = '/dashboard';
  } catch (err) {
    setFormState({
      isLoading: false,
      error: err instanceof Error ? err.message : 'Login failed',
      success: false,
    });
  }
};
```

- [ ] **Step 3: Update Reset Password Form**

In `src/components/forms/reset-password/index.tsx`:

- The `resetPassword()` function from services now uses the browser Supabase client directly
- No changes needed to the form itself — just ensure it calls `resetPassword` from services which is already updated

- [ ] **Step 4: Update Dashboard Products Page**

In `src/app/(frontend)/dashboard/products/page.tsx`:

- Remove `getUserProfile` import — user comes from `useAuth()`
- Change `getUserProducts(user.id)` to `getUserProducts()` (no userId param needed)
- Use `useAuth()` to get `user` and `isAuthenticated`
- Remove the `getUserProfile()` call in the useEffect

- [ ] **Step 5: Update Dashboard Account Page**

In `src/app/(frontend)/dashboard/account/page.tsx`:

- Update to use `useAuth()` for user info instead of fetching separately
- The user object from Supabase includes `email` and `user_metadata` (firstName, lastName)

- [ ] **Step 6: Update Forgot Password Page**

In `src/app/(frontend)/auth/forgot-password/page.tsx` (if it calls the API route directly):

- Ensure it uses the `forgotPassword()` function from services (which now uses browser client directly)

- [ ] **Step 7: Commit**

```bash
git add src/components/navigation/navbar/index.tsx \
  src/components/forms/login/index.tsx \
  src/components/forms/reset-password/index.tsx \
  src/app/\(frontend\)/dashboard/products/page.tsx \
  src/app/\(frontend\)/dashboard/account/page.tsx \
  src/app/\(frontend\)/auth/forgot-password/page.tsx
git commit -m "feat: update auth-dependent components for Supabase SSR"
```

---

## Task 8: Update Product Types and All Product-Displaying Components (snake_case)

> **Build safety**: This task updates `src/types/product.ts` AND all consuming components in a single atomic commit. The type change and component updates must happen together.

**Files:**

- Modify: `src/types/product.ts`
- Modify: `src/app/(frontend)/page.tsx`
- Modify: `src/app/(frontend)/item/[id]/page.tsx`
- Modify: `src/app/(frontend)/item/[id]/ItemIdPage.tsx`
- Modify: `src/components/cards/product-card/index.tsx`
- Modify: `src/components/forms/add-product/index.tsx`

- [ ] **Step 1: Update product types to snake_case**

Rewrite `src/types/product.ts`:

```typescript
import type { Database } from './database';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductImage = Database['public']['Tables']['product_images']['Row'];
export type ProductImageInsert = Database['public']['Tables']['product_images']['Insert'];

export type ProductWithImages = Product & {
  product_images: ProductImage[];
};
```

- [ ] **Step 2: Update ProductCard**

In `src/components/cards/product-card/index.tsx`:

- Change `product.images` → `product.product_images`
- Change `img.imageUrl` → `img.image_url`
- Update the `ProductWithImages` import (already updated in types)
- Update any `product.createdAt` → `product.created_at`

- [ ] **Step 2: Update Home Page**

In `src/app/(frontend)/page.tsx`:

- The `getAllProducts()` call stays the same
- Update field access: `product.price` stays (same name), but check for any camelCase field usage
- `product.images` → `product.product_images` (if used here)

- [ ] **Step 3: Update Item Detail Pages**

In `src/app/(frontend)/item/[id]/page.tsx`:

- Server-side fetch to `/api/products/${id}` — the response now has snake_case fields
- Update `product.images` → `product.product_images` in the template

In `src/app/(frontend)/item/[id]/ItemIdPage.tsx`:

- Change all `product.images` → `product.product_images`
- Change `img.imageUrl` → `img.image_url`
- Update the `ProductWithImages` import type

- [ ] **Step 4: Update Add Product Form**

In `src/components/forms/add-product/index.tsx`:

- Remove `getUserProfile()` call and `userId` from the create flow
- The `createProduct()` function no longer takes `userId` — server gets it from session
- Remove `headers: { 'x-user-id': ... }` if present in direct fetch calls
- Update image field references if any use `imageUrl` → `image_url`

- [ ] **Step 5: Commit**

```bash
git add src/app/\(frontend\)/page.tsx src/app/\(frontend\)/item/ \
  src/components/cards/product-card/ src/components/forms/add-product/
git commit -m "feat: update product components for snake_case Supabase fields"
```

---

## Task 9: Remove All Drizzle/Neon Files, Packages, and Update Docs

> All consumers of Drizzle, Neon, and the old `src/libs/supabase.ts` have been migrated in Tasks 2-8. Now we can safely remove everything.

**Files:**

- Delete: `src/db/schema/products.ts`
- Delete: `src/db/schema/productImages.ts`
- Delete: `src/db/schema/index.ts`
- Delete: `drizzle.config.ts`
- Delete: `src/libs/supabase.ts` (old single-file client)
- Delete: `src/libs/db.ts` (Drizzle client)
- Modify: `package.json` (remove packages, update scripts)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remove Drizzle/Neon packages and dotenv**

```bash
pnpm remove drizzle-orm drizzle-kit @neondatabase/serverless pg dotenv
```

- [ ] **Step 2: Update package.json scripts**

Replace the Drizzle db scripts. Change:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:pull": "drizzle-kit pull",
"db:check": "drizzle-kit check"
```

To:

```json
"db:types": "supabase gen types typescript --linked > src/types/database.ts"
```

- [ ] **Step 3: Delete Drizzle schema, config, and old client files**

```bash
rm -rf src/db/
rm drizzle.config.ts
rm src/libs/supabase.ts src/libs/db.ts
```

- [ ] **Step 2: Update CLAUDE.md**

Update the following sections in `CLAUDE.md`:

**Commands section** — replace Drizzle commands:

```markdown
- **DB generate types:** `pnpm db:types`
```

Remove: `db:generate`, `db:migrate`, `db:studio`, `db:pull`, `db:check`

**Architecture > Database section** — replace with:

```markdown
### Database

- Supabase PostgreSQL accessed via `@supabase/supabase-js` + `@supabase/ssr`
- Three client utilities in `src/libs/supabase/`: browser (`client.ts`), server (`server.ts`), admin (`admin.ts`)
- Row Level Security (RLS) policies enforce access control at the database level
- Types generated from Supabase schema via `pnpm db:types` into `src/types/database.ts`
```

**Architecture > Authentication section** — replace with:

```markdown
### Authentication

- **Cookie-based sessions** via `@supabase/ssr` — no localStorage
- **proxy.ts** refreshes Supabase sessions on every request
- **Server-side:** API routes use server client from `src/libs/supabase/server.ts` (user JWT from cookies)
- **Client-side:** Components use browser client from `src/libs/supabase/client.ts`
- **Admin operations:** Registration uses admin client from `src/libs/supabase/admin.ts` (bypasses RLS)
- `src/context/auth.tsx` provides `useAuth()` hook wrapping Supabase session state
```

**Environment Variables** — remove `DATABASE_URL`

- [ ] **Step 5: Commit**

```bash
git rm -r src/db/ && git rm drizzle.config.ts src/libs/supabase.ts src/libs/db.ts
git add package.json pnpm-lock.yaml CLAUDE.md
git commit -m "chore: remove Drizzle/Neon packages and files, update CLAUDE.md for Supabase"
```

---

## Task 10: Build Verification and Final Cleanup

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Fix any errors. Common issues:

- Unused imports from removed modules
- Missing imports for new Supabase utilities
- Type errors from snake_case migration

- [ ] **Step 2: Run build**

```bash
pnpm build
```

The build must succeed. Fix any TypeScript or import errors.

- [ ] **Step 3: Verify no references to removed modules**

Search for any remaining references:

```bash
grep -r "drizzle" src/ --include="*.ts" --include="*.tsx"
grep -r "@neondatabase" src/ --include="*.ts" --include="*.tsx"
grep -r "x-user-id" src/ --include="*.ts" --include="*.tsx"
grep -r "localStorage" src/ --include="*.ts" --include="*.tsx"
grep -r "from '@/libs/supabase'" src/ --include="*.ts" --include="*.tsx"  # old single-file import
grep -r "from '@/libs/db'" src/ --include="*.ts" --include="*.tsx"
```

All should return empty. Fix any remaining references.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix lint and build errors from Supabase migration"
```

---

## Task 11: Apply RLS Policies (Manual — Supabase Dashboard)

> **This task requires access to the Supabase Dashboard SQL editor.** It cannot be done from the codebase alone.

- [ ] **Step 1: Verify tables exist in Supabase**

Open Supabase Dashboard > Table Editor. Confirm `products` and `product_images` tables exist with the expected columns.

- [ ] **Step 2: Apply RLS policies via SQL Editor**

Run the following SQL in Supabase Dashboard > SQL Editor:

```sql
-- =====================
-- PRODUCTS TABLE RLS
-- =====================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- =====================
-- PRODUCT IMAGES TABLE RLS
-- =====================
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product images are viewable by everyone"
  ON product_images FOR SELECT
  TO authenticated, anon
  USING (true);

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

- [ ] **Step 3: Verify RLS in Supabase Dashboard**

Go to Authentication > Policies. Confirm all 8 policies are listed (4 for products, 4 for product_images).

- [ ] **Step 4: Verify PKCE flow setting**

Go to Authentication > URL Configuration. Ensure the Site URL and Redirect URLs include your callback path. If using implicit flow, switch to PKCE.

---

## Task 12: Push and Deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel deployment**

Check the Vercel deployment succeeds. Test the following flows manually:

1. Home page loads and shows products (public, no auth needed)
2. Register a new user
3. Verify email callback works
4. Login with registered user
5. Dashboard loads with user's products
6. Create a new product with images
7. Edit a product
8. Delete a product
9. Logout
10. Forgot password flow (send email, reset)

- [ ] **Step 3: Final commit if any deployment fixes needed**

```bash
git add -A && git commit -m "fix: deployment fixes for Supabase migration"
git push origin main
```
