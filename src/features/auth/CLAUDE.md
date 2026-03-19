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
- **Open redirect prevention** -- callback route sanitizes the `next` redirect parameter (rejects protocol-relative URLs)
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
- **reset-password-form** -- New password entry after reset link (uses shared `resetPasswordSchema`)
