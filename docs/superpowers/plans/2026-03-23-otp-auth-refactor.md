# OTP Auth Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email link-based verification with 6-digit OTP codes for signup and password reset, auto-login after verification, and remove forced onboarding redirects.

**Architecture:** Two-step modal for registration (form → OTP), multi-step page for password reset (email → OTP → new password). Shared `OtpInput` component handles code entry for both flows. Onboarding moves from forced redirect to persistent banner nudge.

**Tech Stack:** Next.js 16 App Router, Supabase Auth (`verifyOtp`, `resend`, `resetPasswordForEmail`), React Hook Form, Yup, SCSS Modules, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-03-23-otp-auth-refactor-design.md`

---

## File Structure

### New Files

| File                                                                | Responsibility                     |
| ------------------------------------------------------------------- | ---------------------------------- |
| `src/features/auth/components/otp-input/index.tsx`                  | Shared 6-digit OTP input component |
| `src/features/auth/components/otp-input/otp-input.module.scss`      | OTP input styles                   |
| `src/features/auth/components/otp-input/__tests__/index.test.tsx`   | OTP input component tests          |
| `src/app/(frontend)/auth/reset-password/page.tsx`                   | Multi-step reset password page     |
| `src/app/(frontend)/auth/reset-password/reset-password.module.scss` | Reset password page styles         |

### Modified Files

| File                                                                      | Changes                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/features/auth/services/auth.ts`                                      | Add `verifyOtp()`, rename `forgotPassword()` → `sendResetCode()`, remove `emailRedirectTo` reference |
| `src/features/auth/services/__tests__/auth.test.ts`                       | Add `verifyOtp` tests, update `forgotPassword` → `sendResetCode` tests                               |
| `src/features/auth/types/forms.ts`                                        | Remove `ForgotPasswordFormData`, add `OtpVerificationData`                                           |
| `src/features/auth/components/registration-form/index.tsx`                | Add step transition (form → OTP)                                                                     |
| `src/features/auth/components/registration-form/__tests__/index.test.tsx` | Add OTP step transition tests                                                                        |
| `src/features/auth/components/login-form/index.tsx`                       | Remove `checkOnboardingComplete`, `banner`, `onResendVerification`; update forgot password link      |
| `src/features/auth/components/login-form/login-form.module.scss`          | Remove dead banner/resend styles                                                                     |
| `src/features/auth/components/login-form/__tests__/index.test.tsx`        | Remove onboarding assertions, add simplified tests                                                   |
| `src/components/navigation/navbar/index.tsx`                              | Remove resend modal, query param handling; update register success flow                              |
| `src/components/navigation/notification-bar/index.tsx`                    | Add onboarding banner                                                                                |
| `src/components/navigation/notification-bar/notification-bar.module.scss` | Add onboarding banner styles                                                                         |
| `src/app/api/auth/register/route.ts`                                      | Remove `emailRedirectTo` from `signUp()` options                                                     |
| `src/app/api/auth/callback/route.ts`                                      | Update recovery redirect to `/auth/reset-password`                                                   |
| `src/proxy.ts`                                                            | Update guard from `/auth/forgot-password` to `/auth/reset-password`                                  |
| `src/__tests__/proxy.test.ts`                                             | Update tests for new route                                                                           |
| `src/features/auth/CLAUDE.md`                                             | Update documentation                                                                                 |

### Deleted Files

| File                                                                                         | Reason                             |
| -------------------------------------------------------------------------------------------- | ---------------------------------- |
| `src/app/(frontend)/auth/forgot-password/page.tsx`                                           | Replaced by `/auth/reset-password` |
| `src/app/(frontend)/auth/forgot-password/forgot-password.module.scss`                        | Replaced                           |
| `src/app/(frontend)/auth/callback/page.tsx`                                                  | Both flows are now code-based      |
| `src/app/(frontend)/auth/callback/callback.module.scss`                                      | Deleted with page                  |
| `src/features/auth/components/resend-verification-form/index.tsx`                            | Resend is inline in OTP component  |
| `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss` | Deleted with component             |
| `src/features/auth/components/forgot-password-form/index.tsx`                                | Absorbed into reset-password page  |
| `src/features/auth/components/reset-password-form/index.tsx`                                 | Absorbed into reset-password page  |

---

## Task 1: Service Layer — Add `verifyOtp` and rename `sendResetCode`

**Files:**

- Modify: `src/features/auth/services/auth.ts`
- Modify: `src/features/auth/services/__tests__/auth.test.ts`
- Modify: `src/features/auth/types/forms.ts`

- [ ] **Step 1: Write failing tests for `verifyOtp`**

Add to `src/features/auth/services/__tests__/auth.test.ts`:

```typescript
import {
  withTimeout,
  AUTH_TIMEOUT_MS,
  register,
  login,
  logout,
  getUserProfile,
  verifyOtp,
  sendResetCode,
} from '../auth';

// ... existing tests ...

describe('verifyOtp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls supabase.auth.verifyOtp with correct params for signup', async () => {
    const verifyOtpMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockSupabase = { auth: { verifyOtp: verifyOtpMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await verifyOtp({ email: 'a@b.com', token: '123456', type: 'signup' });

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      token: '123456',
      type: 'signup',
    });
  });

  it('calls supabase.auth.verifyOtp with correct params for recovery', async () => {
    const verifyOtpMock = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const mockSupabase = { auth: { verifyOtp: verifyOtpMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await verifyOtp({ email: 'a@b.com', token: '654321', type: 'recovery' });

    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'a@b.com',
      token: '654321',
      type: 'recovery',
    });
  });

  it('throws when verifyOtp returns an error', async () => {
    const mockSupabase = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Token has expired or is invalid' },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(verifyOtp({ email: 'a@b.com', token: '000000', type: 'signup' })).rejects.toThrow(
      'Token has expired or is invalid',
    );
  });

  it('times out after AUTH_TIMEOUT_MS', async () => {
    const neverResolves = new Promise<never>(() => {});
    const mockSupabase = { auth: { verifyOtp: vi.fn().mockReturnValue(neverResolves) } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const result = verifyOtp({ email: 'a@b.com', token: '123456', type: 'signup' });
    vi.advanceTimersByTime(AUTH_TIMEOUT_MS + 1);
    await expect(result).rejects.toThrow(TIMEOUT_MESSAGE);
  });
});

describe('sendResetCode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls resetPasswordForEmail without redirectTo', async () => {
    const resetMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { auth: { resetPasswordForEmail: resetMock } };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await sendResetCode({ email: 'a@b.com' });

    expect(resetMock).toHaveBeenCalledWith('a@b.com');
  });

  it('throws when resetPasswordForEmail returns an error', async () => {
    const mockSupabase = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: { message: 'Rate limit exceeded' },
        }),
      },
    };
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    await expect(sendResetCode({ email: 'a@b.com' })).rejects.toThrow('Rate limit exceeded');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/auth/services/__tests__/auth.test.ts`
Expected: FAIL — `verifyOtp` and `sendResetCode` are not exported from `auth.ts`

- [ ] **Step 3: Implement `verifyOtp` and rename `forgotPassword` to `sendResetCode`**

In `src/features/auth/services/auth.ts`, add after `resendVerification`:

```typescript
export const verifyOtp = async (data: {
  email: string;
  token: string;
  type: 'signup' | 'recovery';
}) => {
  const supabase = createClient();
  const { data: authData, error } = await withTimeout(
    supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: data.type,
    }),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { user: authData.user };
};
```

Rename `forgotPassword` to `sendResetCode` and remove the `redirectTo` option:

```typescript
export const sendResetCode = async (data: { email: string }) => {
  const supabase = createClient();
  const { error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(data.email),
    AUTH_TIMEOUT_MS,
  );

  if (error) throw new Error(error.message);
  return { message: 'Reset code sent! Check your email.' };
};
```

Delete the old `forgotPassword` function. Also remove or rename any existing `forgotPassword` tests in the test file — the old `forgotPassword` describe block (if any) should be deleted since the new `sendResetCode` tests replace it.

- [ ] **Step 4: Update types**

In `src/features/auth/types/forms.ts`, remove `ForgotPasswordFormData` and add:

```typescript
export type OtpVerificationData = {
  email: string;
  token: string;
  type: 'signup' | 'recovery';
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/features/auth/services/__tests__/auth.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/services/auth.ts src/features/auth/services/__tests__/auth.test.ts src/features/auth/types/forms.ts
git commit -m "feat(auth): add verifyOtp service, rename forgotPassword to sendResetCode"
```

---

## Task 2: OTP Input Component — Tests + Implementation

**Files:**

- Create: `src/features/auth/components/otp-input/index.tsx`
- Create: `src/features/auth/components/otp-input/otp-input.module.scss`
- Create: `src/features/auth/components/otp-input/__tests__/index.test.tsx`

- [ ] **Step 1: Write failing tests for OtpInput**

Create `src/features/auth/components/otp-input/__tests__/index.test.tsx`:

```typescript
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import OtpInput from '../index';

vi.mock('@/features/auth/services/auth', () => ({
  verifyOtp: vi.fn(),
}));

vi.mock('@/libs/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { verifyOtp as verifyOtpMock } from '@/features/auth/services/auth';

const defaultProps = {
  email: 'test@example.com',
  type: 'signup' as const,
  onSuccess: vi.fn(),
  onResend: vi.fn().mockResolvedValue(undefined),
};

describe('OtpInput', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders 6 digit inputs', () => {
    render(<OtpInput {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('displays the email address', () => {
    render(<OtpInput {...defaultProps} />);
    expect(screen.getByText(/test@example\.com/)).toBeInTheDocument();
  });

  it('auto-advances focus on digit entry', async () => {
    render(<OtpInput {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: '1' } });
    });

    expect(document.activeElement).toBe(inputs[1]);
  });

  it('moves focus back on backspace', async () => {
    render(<OtpInput {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });
    });

    await act(async () => {
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    });

    expect(document.activeElement).toBe(inputs[0]);
  });

  it('auto-submits when all 6 digits are entered', async () => {
    vi.mocked(verifyOtpMock).mockResolvedValue({ user: { id: 'u1' } });

    render(<OtpInput {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: String(i + 1) } });
      }
    });

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'signup',
      });
    });
  });

  it('calls onSuccess after successful verification', async () => {
    vi.mocked(verifyOtpMock).mockResolvedValue({ user: { id: 'u1' } });
    const onSuccess = vi.fn();

    render(<OtpInput {...defaultProps} onSuccess={onSuccess} />);
    const inputs = screen.getAllByRole('textbox');

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: String(i + 1) } });
      }
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it('shows error message on invalid code', async () => {
    vi.mocked(verifyOtpMock).mockRejectedValue(new Error('Token has expired or is invalid'));

    render(<OtpInput {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        fireEvent.change(inputs[i], { target: { value: String(i + 1) } });
      }
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid code/i);
    });
  });

  it('has correct accessibility attributes', () => {
    render(<OtpInput {...defaultProps} />);
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'Verification code');

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input, i) => {
      expect(input).toHaveAttribute('aria-label', `Verification code digit ${i + 1} of 6`);
      expect(input).toHaveAttribute('inputmode', 'numeric');
    });
  });

  it('renders resend link', () => {
    render(<OtpInput {...defaultProps} />);
    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/auth/components/otp-input/__tests__/index.test.tsx`
Expected: FAIL — component does not exist

- [ ] **Step 3: Create OTP input styles**

Create `src/features/auth/components/otp-input/otp-input.module.scss`:

```scss
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) 0;
}

.emailText {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0;
}

.emailAddress {
  font-weight: 600;
  color: var(--color-text-primary);
}

.instructions {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0;
}

.digitGroup {
  display: flex;
  gap: var(--space-xs);
  justify-content: center;
}

.digitInput {
  width: 48px;
  height: 56px;
  text-align: center;
  font-size: var(--font-size-xl);
  font-weight: 600;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }

  &::placeholder {
    color: var(--color-text-tertiary);
  }
}

.digitInputError {
  border-color: var(--color-error-500);

  &:focus {
    box-shadow: 0 0 0 3px var(--color-error-100);
  }
}

.error {
  font-size: var(--font-size-xs);
  color: var(--color-error-600);
  text-align: center;
  margin: 0;
}

.resendContainer {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.resendButton {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: var(--color-primary-700);
  }

  &:disabled {
    color: var(--color-text-tertiary);
    cursor: not-allowed;
    text-decoration: none;
  }
}

.cooldownText {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

- [ ] **Step 4: Implement OTP input component**

Create `src/features/auth/components/otp-input/index.tsx`:

```tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { verifyOtp } from '@/features/auth/services/auth';
import styles from './otp-input.module.scss';

interface OtpInputProps {
  email: string;
  type: 'signup' | 'recovery';
  onSuccess: () => void;
  onResend: () => Promise<void>;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

const OtpInput: React.FC<OtpInputProps> = ({ email, type, onSuccess, onResend }) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const submitCode = useCallback(
    async (code: string) => {
      setIsVerifying(true);
      setError(null);
      try {
        await verifyOtp({ email, token: code, type });
        onSuccess();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        setError(
          message.includes('expired')
            ? 'Code expired. Please request a new one.'
            : 'Invalid code. Please try again.',
        );
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [email, type, onSuccess],
  );

  const handleChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (digit && newDigits.every((d) => d !== '')) {
      submitCode(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setError(null);

    // Focus the next empty input or last input
    const nextEmpty = newDigits.findIndex((d) => d === '');
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();

    // Auto-submit if all digits filled
    if (newDigits.every((d) => d !== '')) {
      submitCode(newDigits.join(''));
    }
  };

  // Hidden input for autocomplete="one-time-code" (mobile auto-fill)
  const handleHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newDigits = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < value.length; i++) {
      newDigits[i] = value[i];
    }
    setDigits(newDigits);
    if (newDigits.every((d) => d !== '')) {
      submitCode(newDigits.join(''));
    }
  };

  const handleResend = async () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setError(null);
    setDigits(Array(OTP_LENGTH).fill(''));
    try {
      await onResend();
    } catch {
      setError('Failed to resend code. Please try again.');
    }
    inputRefs.current[0]?.focus();
  };

  if (isVerifying) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} role="status" aria-live="polite">
          Verifying code...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <p className={styles.emailText}>
        We sent a 6-digit code to <span className={styles.emailAddress}>{email}</span>
      </p>
      <p className={styles.instructions} id="otp-instructions">
        Enter the code from your email to continue
      </p>

      {/* Hidden input for mobile autocomplete */}
      <input
        ref={hiddenRef}
        type="text"
        autoComplete="one-time-code"
        onChange={handleHiddenChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        className={styles.digitGroup}
        role="group"
        aria-label="Verification code"
        aria-describedby="otp-instructions"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`${styles.digitInput} ${error ? styles.digitInputError : ''}`}
            aria-label={`Verification code digit ${index + 1} of 6`}
            aria-invalid={!!error}
            disabled={isVerifying}
          />
        ))}
      </div>

      {error && (
        <p className={styles.error} role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      <div className={styles.resendContainer}>
        {cooldown > 0 ? (
          <span className={styles.cooldownText}>Resend code in {cooldown}s</span>
        ) : (
          <button
            type="button"
            className={styles.resendButton}
            onClick={handleResend}
            aria-label="Resend verification code"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpInput;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/features/auth/components/otp-input/__tests__/index.test.tsx`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/components/otp-input/
git commit -m "feat(auth): add shared OTP input component with tests"
```

---

## Task 3: Registration Modal — Add OTP Step Transition

**Files:**

- Modify: `src/features/auth/components/registration-form/index.tsx`
- Modify: `src/features/auth/components/registration-form/__tests__/index.test.tsx`

- [ ] **Step 1: Write failing tests for OTP step transition**

Add to `src/features/auth/components/registration-form/__tests__/index.test.tsx`:

```typescript
import { verifyOtp as verifyOtpMock } from '@/features/auth/services/auth';

// Update the mock to include verifyOtp
vi.mock('@/features/auth/services/auth', () => ({
  register: vi.fn(),
  verifyOtp: vi.fn(),
  resendVerification: vi.fn(),
}));

// Add after existing tests:

it('transitions to OTP step after successful registration', async () => {
  vi.mocked(registerMock).mockResolvedValueOnce({ message: 'Success' });

  render(<RegisterForm onSwitchToLogin={vi.fn()} onSuccess={vi.fn()} />);
  await fillAndSubmitForm();

  await waitFor(() => {
    expect(screen.getByText(/we sent a 6-digit code/i)).toBeInTheDocument();
  });
});

it('displays the registered email in OTP step', async () => {
  vi.mocked(registerMock).mockResolvedValueOnce({ message: 'Success' });

  render(<RegisterForm onSwitchToLogin={vi.fn()} onSuccess={vi.fn()} />);
  await fillAndSubmitForm();

  await waitFor(() => {
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });
});

it('calls onSuccess after OTP verification succeeds', async () => {
  vi.mocked(registerMock).mockResolvedValueOnce({ message: 'Success' });
  vi.mocked(verifyOtpMock).mockResolvedValueOnce({ user: { id: 'u1' } });
  const onSuccess = vi.fn();

  render(<RegisterForm onSwitchToLogin={vi.fn()} onSuccess={onSuccess} />);
  await fillAndSubmitForm();

  // Wait for OTP step to appear
  await waitFor(() => {
    expect(screen.getByRole('group', { name: /verification code/i })).toBeInTheDocument();
  });

  // Enter all 6 digits
  const inputs = screen.getAllByRole('textbox');
  await act(async () => {
    for (let i = 0; i < 6; i++) {
      fireEvent.change(inputs[i], { target: { value: String(i + 1) } });
    }
  });

  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/auth/components/registration-form/__tests__/index.test.tsx`
Expected: FAIL — registration form doesn't transition to OTP step

- [ ] **Step 3: Update registration form with OTP step**

Update `src/features/auth/components/registration-form/index.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { registerSchema } from '@/features/auth/validations/auth';
import { RegisterData } from '@/features/auth/types/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { Input, Button, Checkbox } from '@/components/controls';
import { register as registerUser, resendVerification } from '@/features/auth/services/auth';
import Grid from '@/components/layout/grid';
import { AuthFormProps, RegisterFormData, AuthFormResponse } from '@/features/auth/types/forms';
import OtpInput from '@/features/auth/components/otp-input';
import styles from './registration-form.module.scss';

interface RegisterFormProps extends AuthFormProps<RegisterFormData, AuthFormResponse> {
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onError, onSwitchToLogin }) => {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<RegisterData>({
    resolver: yupResolver(registerSchema),
    mode: 'onBlur',
  });

  const handleSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await registerUser(data);
      setRegisteredEmail(data.email);
      setStep('otp');
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'DUPLICATE_EMAIL') {
          setError('DUPLICATE_EMAIL');
        } else {
          setError(error.message);
        }
      } else {
        setError('Registration failed. Please try again.');
      }
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    if (onSuccess) onSuccess({ message: 'Verification successful', email: registeredEmail });
  };

  const handleResend = async () => {
    await resendVerification({ email: registeredEmail });
  };

  if (step === 'otp') {
    return (
      <OtpInput
        email={registeredEmail}
        type="signup"
        onSuccess={handleOtpSuccess}
        onResend={handleResend}
      />
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error === 'DUPLICATE_EMAIL' ? (
          <div role="alert" className="errorMessage">
            An account with that email already exists.{' '}
            <button type="button" className={styles.signInLink} onClick={onSwitchToLogin}>
              Sign in
            </button>{' '}
            instead?
          </div>
        ) : (
          error && (
            <div role="alert" className="errorMessage">
              {error}
            </div>
          )
        )}

        <Grid columns={2}>
          <Input
            name="firstName"
            label="First Name"
            type="text"
            isRequired
            autoComplete="given-name"
          />
          <Input
            name="lastName"
            label="Last Name"
            type="text"
            isRequired
            autoComplete="family-name"
          />
        </Grid>
        <Input name="email" label="Email" type="email" isRequired autoComplete="email" />
        <Input
          name="password"
          label="Password"
          type="password"
          showPasswordStrength
          isRequired
          autoComplete="new-password"
        />
        <Checkbox name="terms" label="I accept the terms and conditions" isRequired />
        <Button type="submit" fullWidth loading={isLoading}>
          Sign Up
        </Button>
      </form>
    </FormProvider>
  );
};

export default RegisterForm;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/features/auth/components/registration-form/__tests__/index.test.tsx`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/registration-form/
git commit -m "feat(auth): add OTP step transition to registration modal"
```

---

## Task 4: Login Form — Remove Onboarding Gate, Update Links

**Files:**

- Modify: `src/features/auth/components/login-form/index.tsx`
- Modify: `src/features/auth/components/login-form/login-form.module.scss`
- Modify: `src/features/auth/components/login-form/__tests__/index.test.tsx`

- [ ] **Step 1: Update login form tests**

Replace `src/features/auth/components/login-form/__tests__/index.test.tsx`:

```typescript
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import LoginForm from '../index';

vi.mock('@/features/auth/services/auth', () => ({
  login: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { login as loginMock } from '@/features/auth/services/auth';

const fillAndSubmitForm = async () => {
  await act(async () => {
    fireEvent.change(document.getElementById('email')!, { target: { value: 'user@example.com' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'Str0ngPass!' } });
  });

  await act(async () => {
    fireEvent.submit(document.querySelector('form')!);
  });

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
};

describe('LoginForm', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
    vi.mocked(loginMock).mockResolvedValue({
      user: { id: 'u1' },
      session: { access_token: 'tok' },
    } as any);
  });

  it('calls onSuccess after successful login', async () => {
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it('does not call checkOnboardingComplete', async () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    await fillAndSubmitForm();

    // checkOnboardingComplete should not exist in the import chain anymore
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledOnce();
    });
  });

  it('renders reset password link', () => {
    render(<LoginForm />);
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  it('shows unverified email error with inline message', async () => {
    vi.mocked(loginMock).mockRejectedValue(new Error('Email not confirmed'));

    render(<LoginForm />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText(/email hasn't been verified/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/features/auth/components/login-form/__tests__/index.test.tsx`
Expected: FAIL — still imports `checkOnboardingComplete`, still has banner prop

- [ ] **Step 3: Update login form component**

Update `src/features/auth/components/login-form/index.tsx`:

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
import { HiExclamation } from 'react-icons/hi';
import styles from './login-form.module.scss';

interface LoginFormProps extends AuthFormProps<LoginFormData> {
  onClose?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError, onClose }) => {
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
    } catch (error) {
      const err = error as Error;
      setError(err.message || 'Login failed. Please try again.');
      onError?.call(null, err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    onClose?.();
    router.push('/auth/reset-password');
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="authForm">
        {error && !isUnverifiedError && (
          <div className="errorMessage" role="alert">
            {error}
          </div>
        )}

        {isUnverifiedError && (
          <div
            className={`${styles.banner} ${styles.bannerError}`}
            role="alert"
            aria-live="assertive"
          >
            <div className={`${styles.bannerIcon} ${styles.bannerIconError}`}>
              <HiExclamation aria-hidden="true" />
            </div>
            <div className={styles.unverifiedBody}>
              <p className={`${styles.bannerText} ${styles.bannerTextError}`}>
                Your email hasn&apos;t been verified yet.
              </p>
              <button
                type="button"
                className={styles.resendLink}
                onClick={async () => {
                  const email = methods.getValues('email');
                  if (!email) return;
                  try {
                    const { resendVerification } = await import('@/features/auth/services/auth');
                    await resendVerification({ email });
                    setError(
                      'Verification code sent! Check your inbox and enter the code when you register again.',
                    );
                  } catch {
                    setError('Failed to resend verification code. Please try again.');
                  }
                }}
              >
                Resend verification code
              </button>
            </div>
          </div>
        )}

        <Input name="email" label="Email" type="email" isRequired autoComplete="email" />
        <Input
          name="password"
          label="Password"
          type="password"
          isRequired
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth marginBottom loading={isLoading}>
          Submit
        </Button>
        <button type="button" onClick={handleResetPassword} className={styles.forgotLink}>
          Reset your password
        </button>
      </form>
    </FormProvider>
  );
};

export default LoginForm;
```

- [ ] **Step 4: Clean up login form styles**

Remove dead banner styles from `src/features/auth/components/login-form/login-form.module.scss`. Keep `.banner`, `.bannerError`, `.bannerIcon`, `.bannerIconError`, `.bannerText`, `.bannerTextError`, `.forgotLink`, `.resendLink`, `.unverifiedBody` (still used for unverified error display). Remove `.bannerSuccess`, `.bannerIconSuccess`, `.bannerTextSuccess`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/features/auth/components/login-form/__tests__/index.test.tsx`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/components/login-form/
git commit -m "refactor(auth): remove onboarding gate from login, update reset password link"
```

---

## Task 5: Navbar — Remove Resend Modal, Update Register Flow

**Files:**

- Modify: `src/components/navigation/navbar/index.tsx`

- [ ] **Step 1: Update navbar component**

In `src/components/navigation/navbar/index.tsx`:

1. Remove imports: `ResendVerificationForm`
2. Remove state: `isResendModalOpen`, `loginBanner`
3. Remove handlers: `toggleResendModal`, `handleResendSuccess`, `handleResendToLogin`, `handleUnverifiedResend`
4. Remove `useEffect` handling for `?verified=true`, `?auth_error=true`, and `?password_reset=true` query params (keep `?login=true` only — the reset password page now shows its own toast directly)
5. Update `handleRegisterSuccess` — it now receives the OTP verification success. Show toast "Welcome to Nessi! Your account is ready." and close modal:

```typescript
const handleRegisterSuccess = () => {
  setRegisterModalOpen(false);
  showToast({
    type: 'success',
    message: 'Welcome to Nessi!',
    description: 'Your account is ready.',
  });
};
```

6. Remove the `LoginForm` props: `banner={loginBanner}`, `onResendVerification={handleUnverifiedResend}`
7. Update `LoginForm` to not pass `banner` prop
8. Remove the resend verification modal JSX entirely
9. Update login modal header — remove `loginBanner` reset from `toggleLoginModal`

- [ ] **Step 2: Run full test suite to verify nothing is broken**

Run: `pnpm vitest run`
Expected: ALL PASS (or only pre-existing failures unrelated to auth)

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation/navbar/index.tsx
git commit -m "refactor(auth): remove resend modal and link-based query params from navbar"
```

---

## Task 6: Reset Password Page — Multi-Step Form

**Files:**

- Create: `src/app/(frontend)/auth/reset-password/page.tsx`
- Create: `src/app/(frontend)/auth/reset-password/reset-password.module.scss`

- [ ] **Step 1: Create reset password page styles**

Create `src/app/(frontend)/auth/reset-password/reset-password.module.scss`:

```scss
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: var(--space-lg);
}

.form {
  width: 100%;
  max-width: 420px;

  h1 {
    margin-bottom: var(--space-xs);
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: var(--space-lg);
    font-size: var(--font-size-sm);
  }
}

.successMessage {
  text-align: center;
  color: var(--color-success-600);
  font-size: var(--font-size-sm);
}
```

- [ ] **Step 2: Create reset password page**

Create `src/app/(frontend)/auth/reset-password/page.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import { Input, Button } from '@/components/controls';
import { sendResetCode, resetPassword } from '@/features/auth/services/auth';
import { resetPasswordSchema } from '@/features/auth/validations/auth';
import { useFormState } from '@/features/shared/hooks/use-form-state';
import { useToast } from '@/components/indicators/toast/context';
import OtpInput from '@/features/auth/components/otp-input';
import styles from './reset-password.module.scss';

type Step = 'email' | 'otp' | 'password';

const emailSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

export default function ResetPassword() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const { showToast } = useToast();
  const router = useRouter();

  return (
    <div className={styles.container}>
      <section className={styles.form}>
        {step === 'email' && (
          <EmailStep
            onSuccess={(submittedEmail) => {
              setEmail(submittedEmail);
              setStep('otp');
            }}
          />
        )}
        {step === 'otp' && (
          <>
            <h1>Check your email</h1>
            <OtpInput
              email={email}
              type="recovery"
              onSuccess={() => setStep('password')}
              onResend={async () => {
                await sendResetCode({ email });
              }}
            />
          </>
        )}
        {step === 'password' && (
          <PasswordStep
            onSuccess={() => {
              showToast({
                type: 'success',
                message: 'Password updated!',
                description: 'You are now logged in.',
              });
              router.push('/');
            }}
          />
        )}
      </section>
    </div>
  );
}

function EmailStep({ onSuccess }: { onSuccess: (email: string) => void }) {
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<{ email: string }>({
    resolver: yupResolver(emailSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      await sendResetCode({ email: data.email });
      onSuccess(data.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Reset your password</h1>
      <p>Enter your email and we&apos;ll send you a code to reset your password.</p>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
          <Input name="email" label="Email" type="email" isRequired autoComplete="email" />
          {error && (
            <p className="errorMessage" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth loading={isLoading}>
            Send Code
          </Button>
        </form>
      </FormProvider>
    </>
  );
}

function PasswordStep({ onSuccess }: { onSuccess: () => void }) {
  const { isLoading, error, setLoading, setError } = useFormState();

  const methods = useForm<{ password: string; confirmPassword: string }>({
    resolver: yupResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: { password: string; confirmPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword({
        newPassword: data.password,
        confirmNewPassword: data.confirmPassword,
      });
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1>Set a new password</h1>
      <p>Choose a strong password for your account.</p>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="authForm">
          <Input
            name="password"
            label="New Password"
            type="password"
            isRequired
            showPasswordStrength
            autoComplete="new-password"
          />
          <Input
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            isRequired
            autoComplete="new-password"
          />
          {error && (
            <p className="errorMessage" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth loading={isLoading}>
            Update Password
          </Button>
        </form>
      </FormProvider>
    </>
  );
}
```

- [ ] **Step 3: Run the dev server and verify the page renders**

Run: `pnpm dev`
Visit: `http://localhost:3000/auth/reset-password`
Expected: Email step renders with heading "Reset your password"

- [ ] **Step 4: Commit**

```bash
git add src/app/(frontend)/auth/reset-password/
git commit -m "feat(auth): add multi-step reset password page with OTP verification"
```

---

## Task 7: Proxy + API Route Updates

**Files:**

- Modify: `src/proxy.ts`
- Modify: `src/__tests__/proxy.test.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/callback/route.ts`

- [ ] **Step 1: Update proxy tests**

In `src/__tests__/proxy.test.ts`:

Delete the `/auth/forgot-password` test suite entirely — the guarded auth paths check is removed (see proxy changes above). The `/auth/callback` tests can stay as-is. Add a new test to confirm `/auth/reset-password` is NOT guarded for authenticated users (since they need access during recovery):

```typescript
describe('proxy — /auth/reset-password', () => {
  it('does not redirect authenticated user (needed for recovery flow)', async () => {
    mockGetUser({ id: 'user-1' });
    const request = makeRequest('/auth/reset-password');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('does not redirect unauthenticated user', async () => {
    mockGetUser(null);
    const request = makeRequest('/auth/reset-password');
    await proxy(request);
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Update proxy route guard**

In `src/proxy.ts`, remove the guarded auth paths check entirely. The reset password page must be accessible to authenticated users because Supabase establishes a session during recovery OTP verification (the user becomes authenticated at Step 2, but still needs to complete Step 3 — entering a new password).

```typescript
// Before:
const GUARDED_AUTH_PATHS = ['/auth/forgot-password'];

if (user && GUARDED_AUTH_PATHS.includes(request.nextUrl.pathname)) {
  return NextResponse.redirect(new URL('/', request.url));
}

// After:
// Removed — /auth/reset-password must remain accessible to authenticated users
// during the recovery flow (session is established after OTP verification,
// before the new password is set).
```

- [ ] **Step 3: Run proxy tests**

Run: `pnpm vitest run src/__tests__/proxy.test.ts`
Expected: ALL PASS

- [ ] **Step 4: Update register API route — remove `emailRedirectTo`**

In `src/app/api/auth/register/route.ts`, change the `signUp` call to remove the `emailRedirectTo` option:

```typescript
// Before:
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { firstName, lastName },
    emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?type=signup`,
  },
});

// After:
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { firstName, lastName },
  },
});
```

- [ ] **Step 5: Update API callback route — fix recovery redirect**

In `src/app/api/auth/callback/route.ts`, update the recovery redirect target:

```typescript
// Before:
if (type === 'recovery') {
  return NextResponse.redirect(`${origin}/auth/callback?status=recovery`, { headers });
}

// After (in both tokenHash and code blocks):
if (type === 'recovery') {
  return NextResponse.redirect(`${origin}/auth/reset-password`, { headers });
}
```

- [ ] **Step 6: Run full test suite**

Run: `pnpm vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/proxy.ts src/__tests__/proxy.test.ts src/app/api/auth/register/route.ts src/app/api/auth/callback/route.ts
git commit -m "refactor(auth): update proxy guard, remove emailRedirectTo, fix callback redirect"
```

---

## Task 8: Notification Bar — Onboarding Banner

**Files:**

- Modify: `src/components/navigation/notification-bar/index.tsx`
- Modify: `src/components/navigation/notification-bar/notification-bar.module.scss`
- Modify: `src/components/navigation/navbar/index.tsx`

- [ ] **Step 1: Update NotificationBar to accept onboarding prop**

Update `src/components/navigation/notification-bar/index.tsx`:

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './notification-bar.module.scss';
import { HiChevronRight, HiX } from 'react-icons/hi';

interface NotificationBarProps {
  showOnboardingBanner?: boolean;
}

export default function NotificationBar({ showOnboardingBanner = false }: NotificationBarProps) {
  const [dismissed, setDismissed] = useState(false);

  // Read sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (sessionStorage.getItem('nessi-onboarding-dismissed') === 'true') {
      setDismissed(true);
    }
  }, []);

  if (showOnboardingBanner && !dismissed) {
    return (
      <div className={`${styles.container} ${styles.onboarding}`} role="status" aria-live="polite">
        <p className={styles.text}>Complete your profile to start buying and selling on Nessi</p>
        <Link href="/onboarding" className={styles.link}>
          <span>Complete Profile</span>
          <HiChevronRight className={styles.icon} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className={styles.dismissButton}
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem('nessi-onboarding-dismissed', 'true');
          }}
          aria-label="Dismiss onboarding banner"
        >
          <HiX aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container} role="banner">
      <p className={styles.text}>Maker&apos;s Week | Shop Unique and Custom Baits</p>
      <Link href="/" className={styles.link}>
        <span>Shop Now</span>
        <HiChevronRight className={styles.icon} aria-hidden="true" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Add onboarding banner styles**

Add to `src/components/navigation/notification-bar/notification-bar.module.scss`:

```scss
.onboarding {
  background-color: var(--color-warning-500);
}

.dismissButton {
  background: none;
  border: none;
  color: var(--color-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: var(--space-xxs);
  border-radius: var(--radius-sm);

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  &:focus-visible {
    outline: 2px solid var(--color-light);
    outline-offset: 2px;
  }
}
```

- [ ] **Step 3: Pass onboarding prop from navbar**

In `src/components/navigation/navbar/index.tsx`, update the `NotificationBar` usage:

```tsx
// Determine if onboarding banner should show
const showOnboardingBanner = isAuthenticated && !!member && !member.onboarding_completed_at;

// In JSX:
<NotificationBar showOnboardingBanner={showOnboardingBanner} />;
```

- [ ] **Step 4: Verify in dev server**

Run: `pnpm dev`
Expected: When logged in without completed onboarding, the warning-colored banner appears. When dismissed, it stays hidden until next session.

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation/notification-bar/ src/components/navigation/navbar/index.tsx
git commit -m "feat(auth): add onboarding banner to notification bar"
```

---

## Task 9: Delete Old Files

**Files:**

- Delete: `src/app/(frontend)/auth/forgot-password/page.tsx`
- Delete: `src/app/(frontend)/auth/forgot-password/forgot-password.module.scss`
- Delete: `src/app/(frontend)/auth/callback/page.tsx`
- Delete: `src/app/(frontend)/auth/callback/callback.module.scss`
- Delete: `src/features/auth/components/resend-verification-form/index.tsx`
- Delete: `src/features/auth/components/resend-verification-form/resend-verification-form.module.scss`
- Delete: `src/features/auth/components/forgot-password-form/index.tsx`
- Delete: `src/features/auth/components/reset-password-form/index.tsx`

- [ ] **Step 1: Delete old auth pages**

```bash
rm src/app/\(frontend\)/auth/forgot-password/page.tsx
rm src/app/\(frontend\)/auth/forgot-password/forgot-password.module.scss
rmdir src/app/\(frontend\)/auth/forgot-password
rm src/app/\(frontend\)/auth/callback/page.tsx
rm src/app/\(frontend\)/auth/callback/callback.module.scss
rmdir src/app/\(frontend\)/auth/callback
```

- [ ] **Step 2: Delete old auth components**

```bash
rm src/features/auth/components/resend-verification-form/index.tsx
rm src/features/auth/components/resend-verification-form/resend-verification-form.module.scss
rmdir src/features/auth/components/resend-verification-form
rm src/features/auth/components/forgot-password-form/index.tsx
rmdir src/features/auth/components/forgot-password-form
rm src/features/auth/components/reset-password-form/index.tsx
rmdir src/features/auth/components/reset-password-form
```

- [ ] **Step 3: Run build to ensure no broken imports**

Run: `pnpm build`
Expected: Build succeeds with no import errors

- [ ] **Step 4: Run full test suite**

Run: `pnpm vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(auth): delete old link-based auth pages and components"
```

---

## Task 10: Update Documentation

**Files:**

- Modify: `src/features/auth/CLAUDE.md`

- [ ] **Step 1: Update auth CLAUDE.md**

Update `src/features/auth/CLAUDE.md` to reflect:

1. **Overview** — change "email verification" to "6-digit OTP code verification"
2. **Session Flow** — update steps to describe OTP flow instead of link-based
3. **API Routes** — remove `/auth/callback` page reference, update register route docs (no `emailRedirectTo`)
4. **Auth Pages** — remove `/auth/forgot-password` and `/auth/callback` page entries, add `/auth/reset-password`
5. **Components** — remove `resend-verification-form`, `forgot-password-form`, `reset-password-form` entries; add `otp-input` entry; update `registration-form` description (two-step with OTP); update `login-form` description (no banner/onResendVerification props)
6. **Security** — add note about OTP code verification via `verifyOtp()`
7. **Error Handling** — update unverified email handling description

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/CLAUDE.md
git commit -m "docs(auth): update CLAUDE.md for OTP auth refactor"
```

---

## Task 11: Preflight Check

- [ ] **Step 1: Run full quality gate**

```bash
pnpm lint
pnpm lint:styles
pnpm typecheck
pnpm format:check
pnpm vitest run
pnpm build
```

Expected: ALL PASS

- [ ] **Step 2: Fix any issues found**

If any linting, type, or format issues, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve lint/type/format issues from OTP auth refactor"
```

- [ ] **Step 3: Manual Supabase Dashboard reminder**

Print reminder to the developer:

> **MANUAL ACTION REQUIRED:** Before testing the OTP flows, update Supabase email templates in the dashboard:
>
> 1. Authentication > Email Templates > "Confirm signup" — replace confirmation link with `{{ .Token }}`
> 2. Authentication > Email Templates > "Reset password" — replace reset link with `{{ .Token }}`
> 3. Authentication > Settings — optionally reduce OTP expiry from 1 hour to 10-15 minutes
