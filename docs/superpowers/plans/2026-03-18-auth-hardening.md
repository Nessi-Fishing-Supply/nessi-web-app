# Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Nessi's Supabase auth system with server-side validation, cache safety, stronger password policy, proper error logging, consistent redirect URLs, and cleaned-up legacy code.

**Architecture:** Seven focused changes to the existing auth feature. No new dependencies. All changes are to existing files except one new validation utility and its tests. The auth flow (registration, login, forgot/reset password, email confirmation) remains identical from the user's perspective — we're hardening the internals.

**Tech Stack:** Next.js 16 (App Router), Supabase Auth (`@supabase/ssr`), Yup validation, Vitest + Testing Library

---

## File Map

| File                                                         | Action | Responsibility                                                     |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------ |
| `src/features/auth/validations/auth.ts`                      | Modify | Add password complexity rules, export shared constants             |
| `src/features/auth/validations/auth.test.ts`                 | Create | Unit tests for all validation schemas                              |
| `src/features/auth/validations/server.ts`                    | Create | Server-side validation for register API (no Yup — pure functions)  |
| `src/features/auth/validations/server.test.ts`               | Create | Unit tests for server-side validation                              |
| `src/app/api/auth/register/route.ts`                         | Modify | Add server-side validation, `Cache-Control` header                 |
| `src/app/api/auth/callback/route.ts`                         | Modify | Add error logging, `Cache-Control` header, `next` redirect param   |
| `src/features/auth/services/auth.ts`                         | Modify | Use `NEXT_PUBLIC_APP_URL` for `forgotPassword` redirect            |
| `src/features/auth/context.tsx`                              | Modify | Remove legacy interface stubs                                      |
| `src/features/auth/components/reset-password-form/index.tsx` | Modify | Replace inline Yup schema with shared `resetPasswordSchema` import |
| `src/features/auth/CLAUDE.md`                                | Modify | Document hardening changes                                         |

---

### Task 1: Server-Side Validation Utility

**Files:**

- Create: `src/features/auth/validations/server.ts`
- Create: `src/features/auth/validations/server.test.ts`

Pure functions for validating registration input server-side. No Yup dependency — these run in API routes where we want zero overhead.

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/validations/server.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateRegisterInput } from './server';

describe('validateRegisterInput', () => {
  const validInput = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'Str0ngP@ss',
    terms: true,
  };

  it('returns null for valid input', () => {
    expect(validateRegisterInput(validInput)).toBeNull();
  });

  it('rejects missing firstName', () => {
    expect(validateRegisterInput({ ...validInput, firstName: '' })).toBe('First name is required');
  });

  it('rejects missing lastName', () => {
    expect(validateRegisterInput({ ...validInput, lastName: '' })).toBe('Last name is required');
  });

  it('rejects invalid email format', () => {
    expect(validateRegisterInput({ ...validInput, email: 'notanemail' })).toBe(
      'Invalid email format',
    );
  });

  it('rejects empty email', () => {
    expect(validateRegisterInput({ ...validInput, email: '' })).toBe('Email is required');
  });

  it('rejects password shorter than 8 characters', () => {
    expect(validateRegisterInput({ ...validInput, password: 'Sh0rt!' })).toBe(
      'Password must be at least 8 characters',
    );
  });

  it('rejects password without uppercase letter', () => {
    expect(validateRegisterInput({ ...validInput, password: 'alllower1!' })).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    );
  });

  it('rejects password without lowercase letter', () => {
    expect(validateRegisterInput({ ...validInput, password: 'ALLUPPER1!' })).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    );
  });

  it('rejects password without number', () => {
    expect(validateRegisterInput({ ...validInput, password: 'NoNumbers!' })).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    );
  });

  it('rejects when terms not accepted', () => {
    expect(validateRegisterInput({ ...validInput, terms: false })).toBe('Terms must be accepted');
  });

  it('handles null/undefined fields gracefully', () => {
    expect(validateRegisterInput({} as any)).toBe('First name is required');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/auth/validations/server.test.ts`
Expected: FAIL — module `./server` not found

- [ ] **Step 3: Implement the server-side validation**

Create `src/features/auth/validations/server.ts`:

```typescript
interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  terms: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

/**
 * Validates registration input server-side.
 * Returns an error message string, or null if valid.
 */
export function validateRegisterInput(input: RegisterInput): string | null {
  if (!input.firstName?.trim()) return 'First name is required';
  if (!input.lastName?.trim()) return 'Last name is required';
  if (!input.email?.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(input.email)) return 'Invalid email format';
  if (!input.password || input.password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters';
  }
  if (
    !/[A-Z]/.test(input.password) ||
    !/[a-z]/.test(input.password) ||
    !/\d/.test(input.password)
  ) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }
  if (!input.terms) return 'Terms must be accepted';
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/auth/validations/server.test.ts`
Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/validations/server.ts src/features/auth/validations/server.test.ts
git commit -m "feat(auth): add server-side registration validation"
```

---

### Task 2: Strengthen Client-Side Password Validation

**Files:**

- Modify: `src/features/auth/validations/auth.ts`
- Create: `src/features/auth/validations/auth.test.ts`

Update Yup schemas to enforce the same password complexity the server now requires. Add tests for all three schemas.

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/validations/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, resetPasswordSchema } from './auth';

describe('loginSchema', () => {
  it('validates correct input', async () => {
    await expect(loginSchema.validate({ email: 'a@b.com', password: 'x' })).resolves.toBeDefined();
  });

  it('rejects invalid email', async () => {
    await expect(loginSchema.validate({ email: 'bad', password: 'x' })).rejects.toThrow();
  });

  it('rejects missing password', async () => {
    await expect(loginSchema.validate({ email: 'a@b.com', password: '' })).rejects.toThrow();
  });
});

describe('registerSchema', () => {
  const valid = {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.com',
    password: 'Str0ngP@ss',
    terms: true,
  };

  it('validates correct input', async () => {
    await expect(registerSchema.validate(valid)).resolves.toBeDefined();
  });

  it('rejects short password', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'Sh0rt' })).rejects.toThrow(
      'at least 8',
    );
  });

  it('rejects password without uppercase', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'alllower1' })).rejects.toThrow(
      'uppercase',
    );
  });

  it('rejects password without lowercase', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'ALLUPPER1' })).rejects.toThrow(
      'lowercase',
    );
  });

  it('rejects password without number', async () => {
    await expect(registerSchema.validate({ ...valid, password: 'NoNumbersHere' })).rejects.toThrow(
      'number',
    );
  });

  it('rejects unaccepted terms', async () => {
    await expect(registerSchema.validate({ ...valid, terms: false })).rejects.toThrow();
  });
});

describe('resetPasswordSchema', () => {
  it('validates matching complex passwords', async () => {
    await expect(
      resetPasswordSchema.validate({ password: 'NewP@ss1', confirmPassword: 'NewP@ss1' }),
    ).resolves.toBeDefined();
  });

  it('rejects mismatched passwords', async () => {
    await expect(
      resetPasswordSchema.validate({ password: 'NewP@ss1', confirmPassword: 'Different1' }),
    ).rejects.toThrow('match');
  });

  it('rejects weak reset password', async () => {
    await expect(
      resetPasswordSchema.validate({ password: 'weak', confirmPassword: 'weak' }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to see which fail**

Run: `pnpm vitest run src/features/auth/validations/auth.test.ts`
Expected: Password complexity tests FAIL (current schema only checks length)

- [ ] **Step 3: Update the Yup schemas with complexity rules**

Replace the contents of `src/features/auth/validations/auth.ts` with:

```typescript
import * as Yup from 'yup';

const passwordSchema = Yup.string()
  .min(8, 'Password must be at least 8 characters')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/\d/, 'Password must contain at least one number')
  .required('Password is required');

// Form validation schemas for authentication
export const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export const registerSchema = Yup.object().shape({
  firstName: Yup.string().required('First Name is required'),
  lastName: Yup.string().required('Last Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: passwordSchema,
  terms: Yup.boolean().oneOf([true], 'Terms must be accepted').required(),
});

export const resetPasswordSchema = Yup.object().shape({
  password: passwordSchema,
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required(),
});
```

Note: `loginSchema` keeps a simple `required()` for password — we don't enforce complexity on login (the password was validated at registration time).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/auth/validations/auth.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/validations/auth.ts src/features/auth/validations/auth.test.ts
git commit -m "feat(auth): enforce password complexity in client-side validation"
```

---

### Task 3: Harden the Register API Route

**Files:**

- Modify: `src/app/api/auth/register/route.ts`

Add server-side validation (from Task 1) and `Cache-Control` header.

- [ ] **Step 1: Update the register route**

Replace the contents of `src/app/api/auth/register/route.ts` with:

```typescript
import { createAdminClient } from '@/libs/supabase/admin';
import { validateRegisterInput } from '@/features/auth/validations/server';
import { NextResponse } from 'next/server';

const AUTH_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, terms } = body;

    const validationError = validateRegisterInput({ firstName, lastName, email, password, terms });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400, headers: AUTH_HEADERS });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=signup`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: AUTH_HEADERS });
    }

    return NextResponse.json(
      { message: 'Registration successful. Please check your email to verify your account.' },
      { status: 201, headers: AUTH_HEADERS },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: AUTH_HEADERS },
    );
  }
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat(auth): add server-side validation and cache-control to register route"
```

---

### Task 4: Harden the Callback Route

**Files:**

- Modify: `src/app/api/auth/callback/route.ts`

Add error logging, `Cache-Control` header, and `next` redirect parameter support.

- [ ] **Step 1: Update the callback route**

Replace the contents of `src/app/api/auth/callback/route.ts` with:

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Sanitizes the `next` redirect parameter to prevent open redirect attacks.
 * Only allows relative paths starting with `/` that don't start with `//`
 * (protocol-relative URLs like `//evil.com` would redirect off-site).
 */
function sanitizeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard';
  }
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = sanitizeRedirectPath(searchParams.get('next'));

  const headers = { 'Cache-Control': 'private, no-store' };

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', { type, error: error.message });
      return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/callback?status=recovery`, { headers });
    }
    if (type === 'signup') {
      return NextResponse.redirect(`${origin}/?verified=true`, { headers });
    }
    return NextResponse.redirect(`${origin}${next}`, { headers });
  }

  console.error('Auth callback error: no code parameter provided', { type });
  return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/callback/route.ts
git commit -m "feat(auth): add error logging, cache-control, and next param to callback"
```

---

### Task 5: Fix Redirect URL Consistency in forgotPassword

**Files:**

- Modify: `src/features/auth/services/auth.ts`

Replace `window.location.origin` with the `NEXT_PUBLIC_APP_URL` env var for consistency.

- [ ] **Step 1: Update the forgotPassword function**

In `src/features/auth/services/auth.ts`, change the `forgotPassword` function. Replace:

```typescript
redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
```

with:

```typescript
redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=recovery`,
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/services/auth.ts
git commit -m "fix(auth): use NEXT_PUBLIC_APP_URL for forgot-password redirect consistency"
```

---

### Task 6: Use Shared Schema in Reset Password Form

**Files:**

- Modify: `src/features/auth/components/reset-password-form/index.tsx`

The reset-password-form currently defines its own inline Yup schema without the new password complexity rules. Without this fix, users could reset their password to a weak one (e.g., `abcdefgh`), bypassing the hardened policy.

- [ ] **Step 1: Update the reset-password-form to import the shared schema**

In `src/features/auth/components/reset-password-form/index.tsx`, make these changes:

Remove the inline imports and schema definition. Replace the top of the file:

```typescript
'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { Input, Button } from '@/components/controls';
import { resetPassword } from '@/features/auth/services/auth';
import { AuthFormProps } from '@/features/auth/types/forms';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}
```

with:

```typescript
'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { resetPasswordSchema } from '@/features/auth/validations/auth';
import { Input, Button } from '@/components/controls';
import { resetPassword } from '@/features/auth/services/auth';
import { AuthFormProps } from '@/features/auth/types/forms';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}
```

Then remove the inline schema definition block (lines 31-36 of the original file):

```typescript
const schema = Yup.object().shape({
  password: Yup.string().min(8, 'Minimum 8 characters').required(),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required(),
});
```

And update the `useForm` call to use the shared schema. Replace:

```typescript
    resolver: yupResolver(schema),
```

with:

```typescript
    resolver: yupResolver(resetPasswordSchema),
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/components/reset-password-form/index.tsx
git commit -m "fix(auth): use shared resetPasswordSchema with complexity rules in reset form"
```

---

### Task 7: Clean Up Legacy AuthContext Interface

**Files:**

- Modify: `src/features/auth/context.tsx`

Remove dead `setAuthenticated`, `token`, `setToken`, and `setUser` stubs. These are vestiges of a pre-Supabase auth model.

- [ ] **Step 1: Verify no consumers use legacy fields**

Run: `pnpm vitest run` (ensure all existing tests pass first)

Then search for usages:

```bash
# Search for any code referencing the legacy fields
grep -r "setAuthenticated\|\.token\b\|setToken\|context\.setUser" src/ --include="*.ts" --include="*.tsx" | grep -v "context.tsx" | grep -v "node_modules"
```

Expected: No results (if results found, update those consumers first)

- [ ] **Step 2: Update AuthContext to remove legacy fields**

Replace the contents of `src/features/auth/context.tsx` with:

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/libs/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading }}>
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

- [ ] **Step 3: Verify build and tests pass**

Run: `pnpm typecheck && pnpm vitest run`
Expected: No type errors, all tests pass. If any consumer references the removed fields, `typecheck` will catch it.

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/context.tsx
git commit -m "refactor(auth): remove legacy token/setAuthenticated stubs from AuthContext"
```

---

### Task 8: Update Auth Feature CLAUDE.md

**Files:**

- Modify: `src/features/auth/CLAUDE.md`

Document the hardening changes so future agents/developers understand the security posture.

- [ ] **Step 1: Update the CLAUDE.md**

Replace the contents of `src/features/auth/CLAUDE.md` with:

```markdown
# Auth Feature

## Overview

Authentication feature using Supabase Auth with cookie-based sessions via `@supabase/ssr`.

## Architecture

- **context.tsx** -- `AuthProvider` and `useAuth()` hook wrapping Supabase session state (client-side)
- **services/auth.ts** -- Client-side auth API functions (login, register, logout, password reset)
- **types/auth.ts** -- Auth data interfaces (RegisterData, LoginData, ResetPasswordData, AuthResponse)
- **types/forms.ts** -- Auth form prop interfaces and form data types (AuthFormProps, LoginFormData, etc.)
- **validations/auth.ts** -- Yup schemas for login, registration, and password reset forms (client-side)
- **validations/server.ts** -- Pure-function validation for register API route (server-side, no Yup)

## Session Flow

1. `proxy.ts` refreshes Supabase sessions on every request via `getUser()` (server-side)
2. `proxy.ts` redirects unauthenticated users away from `/dashboard/*` routes
3. `AuthProvider` listens to `onAuthStateChange` for client-side state
4. Auth forms call services which use the Supabase browser client
5. Registration goes through `/api/auth/register` (uses admin client to bypass RLS)

## Security

- **Cookie-based sessions** -- httpOnly cookies via `@supabase/ssr`, no localStorage
- **PKCE flow** -- `exchangeCodeForSession()` in `/api/auth/callback` for all magic links
- **Server-side validation** -- `/api/auth/register` validates email format, password complexity, and required fields independent of client-side Yup schemas
- **Password policy** -- minimum 8 characters, requires uppercase, lowercase, and number (enforced both client-side and server-side)
- **Cache-Control headers** -- `private, no-store` on all auth API responses to prevent CDN caching
- **Error logging** -- Auth callback logs errors with type context before redirecting
- **`getUser()` over `getSession()`** -- proxy.ts uses `getUser()` which verifies the JWT server-side (Supabase best practice)
- **Admin client isolation** -- `autoRefreshToken: false`, `persistSession: false`, used only for registration

## Key Patterns

- Cookie-based sessions -- no localStorage tokens
- Server-side: API routes use server client from `src/libs/supabase/server.ts`
- Client-side: Components use browser client from `src/libs/supabase/client.ts`
- Admin operations: Registration uses admin client from `src/libs/supabase/admin.ts`
- Route protection: `proxy.ts` guards `/dashboard/*` -- unauthenticated users redirected to `/`
- Redirect URLs use `NEXT_PUBLIC_APP_URL` env var (not `window.location.origin`)

## Components

- **login-form** -- Email/password login with redirect support
- **registration-form** -- New user signup with email verification
- **forgot-password-form** -- Password reset email request
- **reset-password-form** -- New password entry after reset link
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/CLAUDE.md
git commit -m "docs(auth): update CLAUDE.md with security hardening details"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run the full test suite**

Run: `pnpm vitest run`
Expected: All tests pass (including new validation tests from Tasks 1 and 2)

- [ ] **Step 2: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Run format check**

Run: `pnpm format:check`
Expected: All files formatted. If not, run `pnpm format` and commit.

- [ ] **Step 4: Build the project**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Final commit (if format changes needed)**

```bash
git add -A
git commit -m "chore: format auth hardening changes"
```
