# Auth UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix auth flow UX gaps — duplicate messages, missing verification feedback, broken modal behavior, and PKCE email template support via `token_hash`.

**Architecture:** Seven tasks that build on each other: callback route fix first (backend), then toast component (shared UI), then auth service additions, then form/navbar modifications that wire everything together. Each task is independently committable.

**Tech Stack:** Next.js 16 (App Router), Supabase Auth (`@supabase/ssr`), React Hook Form + Yup, SCSS Modules, Vitest

---

## File Map

| File                                                                                         | Action | Responsibility                                              |
| -------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| `src/app/api/auth/callback/route.ts`                                                         | Modify | Add `token_hash` + `verifyOtp()` support                    |
| `src/components/indicators/toast/index.tsx`                                                  | Create | Reusable toast notification component                       |
| `src/components/indicators/toast/toast.module.scss`                                          | Create | Toast styles (soft green card)                              |
| `src/features/auth/services/auth.ts`                                                         | Modify | Add `resendVerification()` function                         |
| `src/features/auth/components/resend-verification-form/index.tsx`                            | Create | Email-only form for resending verification                  |
| `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss` | Create | Resend form styles                                          |
| `src/features/auth/types/auth.ts`                                                            | Modify | Add `email?` to `AuthResponse` interface                    |
| `src/features/auth/components/registration-form/index.tsx`                                   | Modify | Remove inline success, pass email in callback               |
| `src/features/auth/components/login-form/index.tsx`                                          | Modify | Add banner prop, unverified handling, forgot password close |
| `src/features/auth/components/login-form/login-form.module.scss`                             | Create | Banner and unverified error styles                          |
| `src/components/navigation/navbar/index.tsx`                                                 | Modify | Toast state, resend modal, query param detection, wiring    |

---

### Task 1: Add `token_hash` Support to Callback Route

**Files:**

- Modify: `src/app/api/auth/callback/route.ts`

The updated Supabase email templates send `token_hash` instead of `code`. The callback route needs to handle both.

- [ ] **Step 1: Update the callback route**

Replace the contents of `src/app/api/auth/callback/route.ts` with:

```typescript
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

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
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = sanitizeRedirectPath(searchParams.get('next'));

  const headers = { 'Cache-Control': 'private, no-store' };

  // Handle token_hash from Supabase email templates (verifyOtp flow)
  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type as EmailOtpType) || 'email',
    });

    if (error) {
      console.error('Auth callback error (verifyOtp):', { type, error: error.message });
      return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/callback?status=recovery`, { headers });
    }
    return NextResponse.redirect(`${origin}/?verified=true`, { headers });
  }

  // Handle code from client-initiated PKCE flows (exchangeCodeForSession)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error (exchangeCode):', { type, error: error.message });
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

  console.error('Auth callback error: no code or token_hash provided', { type });
  return NextResponse.redirect(`${origin}/?auth_error=true`, { headers });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/callback/route.ts
git commit -m "feat(auth): add token_hash + verifyOtp support to callback route"
```

---

### Task 2: Create Toast Component

**Files:**

- Create: `src/components/indicators/toast/index.tsx`
- Create: `src/components/indicators/toast/toast.module.scss`

A reusable toast notification positioned fixed at the top of the viewport.

- [ ] **Step 1: Create the toast SCSS module**

Create `src/components/indicators/toast/toast.module.scss`:

```scss
// Toast/banner colors use hardcoded hex values because the project's design token
// system only has base --color-success/#007e33 and --color-error/#c00, not the full
// shade scale needed for soft card backgrounds/borders. These specific shades were
// chosen during UX brainstorming for the toast aesthetic. If reused elsewhere,
// extract to src/styles/variables/colors.scss as semantic tokens.

@use '@/styles/mixins/breakpoints' as *;

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  padding: var(--space-sm);
  pointer-events: none;

  @include breakpoint(md) {
    padding: var(--space-md);
  }
}

.toast {
  pointer-events: auto;
  width: 100%;
  max-width: 420px;
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-md);
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  animation: slideDown 0.3s ease-out;
  box-shadow: var(--shadow-lg);
}

.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-white);
}

.iconSuccess {
  background: #22c55e;
}

.iconError {
  background: #ef4444;
}

.body {
  flex: 1;
  min-width: 0;
}

.message {
  margin: 0 0 2px;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.messageSuccess {
  color: #166534;
}

.messageError {
  color: #991b1b;
}

.description {
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.descriptionSuccess {
  color: #15803d;
}

.descriptionError {
  color: #b91c1c;
}

.subtitle {
  margin: 4px 0 0;
  font-size: var(--font-size-2xs);
}

.subtitleSuccess {
  color: #6b9e7a;
}

.subtitleError {
  color: #999;
}

.close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-gray-400);
  font-size: var(--font-size-md);
  line-height: 1;
  flex-shrink: 0;

  &:hover {
    color: var(--color-gray-600);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 2: Create the toast component**

Create `src/components/indicators/toast/index.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import styles from './toast.module.scss';
import { HiCheck, HiExclamation, HiX } from 'react-icons/hi';

interface ToastProps {
  message: string;
  description: string;
  subtitle?: string;
  type: 'success' | 'error';
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
}

const Toast: React.FC<ToastProps> = ({
  message,
  description,
  subtitle,
  type,
  duration = 8000,
  onDismiss,
  visible,
}) => {
  useEffect(() => {
    if (!visible || !onDismiss) return;

    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const Icon = type === 'success' ? HiCheck : HiExclamation;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.toast} ${styles[type]}`}>
        <div
          className={`${styles.icon} ${type === 'success' ? styles.iconSuccess : styles.iconError}`}
        >
          <Icon />
        </div>
        <div className={styles.body}>
          <p
            className={`${styles.message} ${type === 'success' ? styles.messageSuccess : styles.messageError}`}
          >
            {message}
          </p>
          <p
            className={`${styles.description} ${type === 'success' ? styles.descriptionSuccess : styles.descriptionError}`}
          >
            {description}
          </p>
          {subtitle && (
            <p
              className={`${styles.subtitle} ${type === 'success' ? styles.subtitleSuccess : styles.subtitleError}`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {onDismiss && (
          <button className={styles.close} onClick={onDismiss} aria-label="Dismiss notification">
            <HiX />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/indicators/toast/
git commit -m "feat: add reusable toast notification component"
```

---

### Task 3: Add `resendVerification` Service Function

**Files:**

- Modify: `src/features/auth/services/auth.ts`

- [ ] **Step 1: Add the resendVerification function**

In `src/features/auth/services/auth.ts`, add at the end of the file (before any trailing newline):

```typescript
export const resendVerification = async (data: { email: string }) => {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: data.email,
  });

  if (error) throw new Error(error.message);
  return { message: 'Verification email sent!' };
};
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/services/auth.ts
git commit -m "feat(auth): add resendVerification service function"
```

---

### Task 4: Create Resend Verification Form Component

**Files:**

- Create: `src/features/auth/components/resend-verification-form/index.tsx`
- Create: `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss`

An email-only form for resending verification emails. Has two states: the form state and the success confirmation state. Follows the forgot-password-form pattern.

- [ ] **Step 1: Create the SCSS module**

Create `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss`:

```scss
.header {
  text-align: center;
  margin-bottom: var(--space-md);
}

.iconCircle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-sm);
  font-size: var(--font-size-xl);
}

.warningIcon {
  background: #fef2f2;
  color: #ef4444;
}

.successIcon {
  background: #f0fdf4;
  color: #22c55e;
}

.title {
  margin: 0 0 var(--space-3xs);
  font-size: var(--font-size-lg);
}

.subtitle {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-gray-600);
}

.successCard {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  text-align: center;
  margin-bottom: var(--space-md);
}

.successTitle {
  margin: 0 0 var(--space-3xs);
  font-size: var(--font-size-md);
  color: #166534;
  font-weight: 600;
}

.successDescription {
  margin: 0 0 var(--space-3xs);
  font-size: var(--font-size-xs);
  color: #15803d;
}

.successSubtitle {
  margin: 0;
  font-size: var(--font-size-2xs);
  color: #6b9e7a;
}

.backLink {
  text-align: center;
  margin-top: var(--space-sm);
}
```

- [ ] **Step 2: Create the resend verification form component**

Create `src/features/auth/components/resend-verification-form/index.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { Input, Button } from '@/components/controls';
import { resendVerification } from '@/features/auth/services/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { HiOutlineExclamation, HiCheck } from 'react-icons/hi';
import styles from './resend-verification-form.module.scss';

interface ResendVerificationFormProps {
  onBackToLogin?: () => void;
}

const schema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

const ResendVerificationForm: React.FC<ResendVerificationFormProps> = ({ onBackToLogin }) => {
  const { isLoading, error, setLoading, setError } = useFormState();
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const methods = useForm<{ email: string }>({
    resolver: yupResolver(schema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      await resendVerification({ email: data.email });
      setSentToEmail(data.email);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Success state — soft green card
  if (sentToEmail) {
    return (
      <div>
        <div className={styles.successCard}>
          <div className={`${styles.iconCircle} ${styles.successIcon}`}>
            <HiCheck />
          </div>
          <p className={styles.successTitle}>Verification email sent!</p>
          <p className={styles.successDescription}>
            Check your inbox at <strong>{sentToEmail}</strong>
          </p>
          <p className={styles.successSubtitle}>
            Click the link in the email, then come back and sign in.
          </p>
        </div>
        {onBackToLogin && (
          <div className={styles.backLink}>
            <button onClick={onBackToLogin} className="link">
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    );
  }

  // Form state — email input with warning header
  return (
    <div>
      <div className={styles.header}>
        <div className={`${styles.iconCircle} ${styles.warningIcon}`}>
          <HiOutlineExclamation />
        </div>
        <h6 className={styles.title}>Verification link expired</h6>
        <p className={styles.subtitle}>Enter your email to resend the verification link.</p>
      </div>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
          <Input name="email" label="Email" type="email" isRequired />
          {error && <p className="errorMessage">{error}</p>}
          <Button type="submit" fullWidth loading={isLoading}>
            Resend Verification Email
          </Button>
        </form>
      </FormProvider>
      {onBackToLogin && (
        <div className={styles.backLink}>
          <button onClick={onBackToLogin} className="link">
            Back to Sign In
          </button>
        </div>
      )}
    </div>
  );
};

export default ResendVerificationForm;
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/components/resend-verification-form/
git commit -m "feat(auth): add resend verification form component"
```

---

### Task 5: Update Registration Form (Remove Duplicate Message + Fix Types)

**Files:**

- Modify: `src/features/auth/types/auth.ts`

**Files:**

- Modify: `src/features/auth/components/registration-form/index.tsx`

Remove the inline success message. The `onSuccess` callback now passes the email so the navbar can show a toast. First, update `AuthResponse` to include optional `email`.

- [ ] **Step 1: Update AuthResponse type to include email**

In `src/features/auth/types/auth.ts`, change:

```typescript
export interface AuthResponse {
  message: string;
  error?: string;
}
```

to:

```typescript
export interface AuthResponse {
  message: string;
  error?: string;
  email?: string;
}
```

- [ ] **Step 2: Update the registration form**

In `src/features/auth/components/registration-form/index.tsx`, make two changes.

First, update the `handleSubmit` to remove `setSuccess` and pass email in the callback. Replace:

```typescript
const response = await registerUser(data);
setSuccess(response.message);
if (onSuccess) onSuccess(response);
```

with:

```typescript
const response = await registerUser(data);
if (onSuccess) onSuccess({ ...response, email: data.email });
```

Second, remove the `success` destructuring and the success message JSX. Change:

```typescript
const { isLoading, error, success, setLoading, setError, setSuccess } = useFormState();
```

to:

```typescript
const { isLoading, error, setLoading, setError } = useFormState();
```

And remove this line from the JSX:

```tsx
{
  success && <div className="successMessage">{success}</div>;
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/types/auth.ts src/features/auth/components/registration-form/index.tsx
git commit -m "fix(auth): remove duplicate success message, add email to AuthResponse type"
```

---

### Task 6: Update Login Form (Banner, Unverified Handling, Forgot Password Fix)

**Files:**

- Create: `src/features/auth/components/login-form/login-form.module.scss`
- Modify: `src/features/auth/components/login-form/index.tsx`

Three changes: (1) add optional `banner` prop for verified/error banners, (2) detect "Email not confirmed" error and show resend link, (3) fix forgot password to close modal first. Banner styles use SCSS module.

- [ ] **Step 1: Create the login form SCSS module**

Create `src/features/auth/components/login-form/login-form.module.scss`:

```scss
// Banner colors match toast/resend-form pattern — see toast.module.scss for rationale

.banner {
  border-radius: var(--radius-md);
  padding: var(--space-xs) var(--space-sm);
  margin-bottom: var(--space-sm);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.bannerSuccess {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.bannerError {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.bannerIcon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-white);
  font-size: var(--font-size-2xs);
}

.bannerIconSuccess {
  background: #22c55e;
}

.bannerIconError {
  background: #ef4444;
}

.bannerText {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.bannerTextSuccess {
  color: #166534;
}

.bannerTextError {
  color: #991b1b;
}

.resendLink {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--font-size-2xs);
  color: #b91c1c;
  text-decoration: underline;
  cursor: pointer;
}

.forgotLink {
  background: none;
  border: none;
  width: 100%;
  text-align: center;
  font-size: var(--font-size-sm);
  text-decoration: underline;
  cursor: pointer;
  color: inherit;
  padding: 0;
}

.unverifiedBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

- [ ] **Step 2: Update the login form component**

Replace the contents of `src/features/auth/components/login-form/index.tsx` with:

```tsx
'use client';

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRouter } from 'next/navigation';
import { loginSchema } from '@/features/auth/validations/auth';
import { LoginData } from '@/features/auth/types/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { Input, Button } from '@/components/controls';
import { login } from '@/features/auth/services/auth';
import { AuthFormProps, LoginFormData } from '@/features/auth/types/forms';
import { HiCheck, HiExclamation } from 'react-icons/hi';
import styles from './login-form.module.scss';

interface LoginFormProps extends AuthFormProps<LoginFormData> {
  banner?: { type: 'verified' } | null;
  onClose?: () => void;
  onResendVerification?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  onClose,
  onResendVerification,
  redirectUrl = '/dashboard',
  banner,
}) => {
  const { isLoading, error, setLoading, setError } = useFormState();
  const router = useRouter();

  const methods = useForm<LoginData>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur',
  });

  const isUnverifiedError = error?.includes('Email not confirmed');

  const handleSubmit = async (data: LoginData) => {
    setLoading(true);
    try {
      await login({
        email: data.email,
        password: data.password,
      });

      setError(null);
      onSuccess?.call(null, data);
      window.location.href = redirectUrl;
    } catch (error) {
      const err = error as Error;
      setError(err.message || 'Login failed. Please try again.');
      onError?.call(null, err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onClose?.();
    router.push('/auth/forgot-password');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {banner?.type === 'verified' && (
          <div className={`${styles.banner} ${styles.bannerSuccess}`}>
            <div className={`${styles.bannerIcon} ${styles.bannerIconSuccess}`}>
              <HiCheck />
            </div>
            <p className={`${styles.bannerText} ${styles.bannerTextSuccess}`}>
              Email verified! Sign in to get started.
            </p>
          </div>
        )}

        {error && !isUnverifiedError && <div className="errorMessage">{error}</div>}

        {isUnverifiedError && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <div className={`${styles.bannerIcon} ${styles.bannerIconError}`}>
              <HiExclamation />
            </div>
            <div className={styles.unverifiedBody}>
              <p className={`${styles.bannerText} ${styles.bannerTextError}`}>
                Your email hasn&apos;t been verified yet.
              </p>
              {onResendVerification && (
                <button type="button" onClick={onResendVerification} className={styles.resendLink}>
                  Resend verification email
                </button>
              )}
            </div>
          </div>
        )}

        <Input name="email" label="Email" type="email" isRequired />
        <Input name="password" label="Password" type="password" isRequired />
        <Button type="submit" fullWidth marginBottom loading={isLoading}>
          Submit
        </Button>
        <button type="button" onClick={handleForgotPassword} className={styles.forgotLink}>
          Forgot your password?
        </button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/components/login-form/index.tsx
git commit -m "feat(auth): add verified banner, unverified handling, and forgot password fix to login form"
```

---

### Task 7: Wire Everything Together in Navbar

**Files:**

- Modify: `src/components/navigation/navbar/index.tsx`

This is the orchestration task. Adds: toast state for registration success, query param detection for `?verified=true` and `?auth_error=true`, resend verification modal state, and passes all callbacks to forms.

- [ ] **Step 1: Update the navbar**

Replace the contents of `src/components/navigation/navbar/index.tsx` with:

```tsx
'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import styles from './navbar.module.scss';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  HiBell,
  HiOutlineShoppingBag,
  HiUser,
  HiOutlineHome,
  HiOutlineUserCircle,
  HiSearch,
} from 'react-icons/hi';

// Components
import NotificationBar from '@/components/navigation/notification-bar';
import Modal from '@/components/layout/modal';
import Toast from '@/components/indicators/toast';
import LoginForm from '@/features/auth/components/login-form';
import RegisterForm from '@/features/auth/components/registration-form';
import ResendVerificationForm from '@/features/auth/components/resend-verification-form';
import { Button, AppLink, Dropdown, DropdownItem, DropdownTitle } from '@/components/controls';

// Assets
import LogoFull from '@/assets/logos/logo_full.svg';

// Auth
import { useAuth } from '@/features/auth/context';
import { logout } from '@/features/auth/services/auth';

export default function Navbar() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setRegisterModalOpen] = useState(false);
  const [isResendModalOpen, setResendModalOpen] = useState(false);
  const [loginBanner, setLoginBanner] = useState<{ type: 'verified' } | null>(null);

  // Toast state for registration success
  const [toast, setToast] = useState<{
    visible: boolean;
    email: string;
  }>({ visible: false, email: '' });

  const { user, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  // Detect query params and open appropriate modals
  useEffect(() => {
    const loginQuery = searchParams?.get('login');
    const verified = searchParams?.get('verified');
    const authError = searchParams?.get('auth_error');

    if (loginQuery === 'true') {
      requestAnimationFrame(() => setLoginModalOpen(true));
    }

    if (verified === 'true') {
      requestAnimationFrame(() => {
        setLoginBanner({ type: 'verified' });
        setLoginModalOpen(true);
      });
    }

    if (authError === 'true') {
      requestAnimationFrame(() => setResendModalOpen(true));
    }

    // Clean up query params after consuming
    if (loginQuery || verified || authError) {
      const url = new URL(window.location.href);
      url.searchParams.delete('login');
      url.searchParams.delete('verified');
      url.searchParams.delete('auth_error');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch {
      // Logout failed silently — user stays on page
    }
  };

  const toggleLoginModal = () => {
    setLoginModalOpen((prev) => !prev);
    setLoginBanner(null);
    if (isRegisterModalOpen) setRegisterModalOpen(false);
    if (isResendModalOpen) setResendModalOpen(false);
  };

  const toggleRegisterModal = () => {
    setRegisterModalOpen((prev) => !prev);
    if (isLoginModalOpen) setLoginModalOpen(false);
    if (isResendModalOpen) setResendModalOpen(false);
  };

  const toggleResendModal = () => {
    setResendModalOpen((prev) => !prev);
    if (isLoginModalOpen) setLoginModalOpen(false);
    if (isRegisterModalOpen) setRegisterModalOpen(false);
  };

  const handleLoginSuccess = () => {
    setLoginModalOpen(false);
    setLoginBanner(null);
  };

  const handleRegisterSuccess = (response: { message: string; email?: string }) => {
    setRegisterModalOpen(false);
    setToast({ visible: true, email: response.email || '' });
  };

  const handleResendToLogin = () => {
    setResendModalOpen(false);
    setLoginModalOpen(true);
    setLoginBanner(null);
  };

  const handleUnverifiedResend = () => {
    setLoginModalOpen(false);
    setResendModalOpen(true);
  };

  const firstName = user?.user_metadata?.firstName ?? '';
  const lastName = user?.user_metadata?.lastName ?? '';

  return (
    <nav>
      <NotificationBar />
      <div className={styles.container}>
        <Link href="/">
          <LogoFull className={styles.logo} />
        </Link>
        <form className={styles.form}>
          <input type="search" placeholder="Search Fishing Gear" />
          <button className={styles.searchButton} type="submit">
            <HiSearch />
          </button>
        </form>
        <button className={styles.button}>Sell Your Gear</button>

        {mounted && isAuthenticated && <HiBell className={styles.icon} />}

        {mounted && isAuthenticated && user ? (
          <Dropdown icon={<HiUser />}>
            <DropdownItem isClickable={false}>
              <p>
                {firstName} {lastName}
              </p>
            </DropdownItem>
            <DropdownTitle>
              <p>My Account</p>
            </DropdownTitle>
            <DropdownItem>
              <AppLink href="/dashboard" icon={<HiOutlineHome />}>
                Dashboard
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <AppLink href="/dashboard/account" icon={<HiOutlineUserCircle />}>
                Account
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <AppLink href="/dashboard/products" icon={<HiOutlineShoppingBag />}>
                Products
              </AppLink>
            </DropdownItem>
            <DropdownItem>
              <Button onClick={handleLogout} fullWidth>
                Log Out
              </Button>
            </DropdownItem>
          </Dropdown>
        ) : (
          mounted && (
            <button onClick={toggleLoginModal} className={styles.link}>
              Sign Up / Log In
            </button>
          )
        )}

        <HiOutlineShoppingBag className={styles.icon} />
      </div>

      <div className={styles.categories}>
        {[
          'Rods',
          'Reels',
          'Combos',
          'Baits',
          'Lures',
          'Tackle',
          'Line',
          'Storage',
          'Apparel',
          'Bargain Bin',
        ].map((category) => (
          <Link key={category} href="#">
            {category}
          </Link>
        ))}
      </div>

      {/* Login Modal */}
      <Modal isOpen={isLoginModalOpen} onClose={toggleLoginModal}>
        <div className={styles.modalHeader}>
          <h6>Log In</h6>
          <Button style="dark" round outline onClick={toggleRegisterModal}>
            Register
          </Button>
        </div>
        <LoginForm
          onSuccess={handleLoginSuccess}
          onClose={toggleLoginModal}
          onResendVerification={handleUnverifiedResend}
          redirectUrl="/dashboard"
          banner={loginBanner}
        />
      </Modal>

      {/* Register Modal */}
      <Modal isOpen={isRegisterModalOpen} onClose={toggleRegisterModal}>
        <h6>Create Your Account</h6>
        <RegisterForm onSuccess={handleRegisterSuccess} />
      </Modal>

      {/* Resend Verification Modal */}
      <Modal isOpen={isResendModalOpen} onClose={toggleResendModal}>
        <ResendVerificationForm onBackToLogin={handleResendToLogin} />
      </Modal>

      {/* Registration Success Toast */}
      <Toast
        visible={toast.visible}
        type="success"
        message="Account created!"
        description={`Check your inbox at ${toast.email} for a verification link.`}
        subtitle="Come back and sign in once verified."
        onDismiss={() => setToast({ visible: false, email: '' })}
      />
    </nav>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Verify lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation/navbar/index.tsx
git commit -m "feat(auth): wire toast, resend modal, query param detection, and modal fixes in navbar"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: No errors

- [ ] **Step 2: Run tests**

Run: `pnpm test:run`
Expected: All existing tests pass (23 pass, 1 pre-existing jsdom error)

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Format check**

Run: `pnpm format:check`
Expected: All files formatted. If not, run `pnpm format` and commit.

- [ ] **Step 5: Final commit (if format changes needed)**

```bash
git add -A
git commit -m "chore: format auth UX improvement files"
```
