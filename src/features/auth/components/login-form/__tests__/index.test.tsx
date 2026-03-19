/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import LoginForm from '../index';

vi.mock('@/features/auth/services/auth', () => ({
  login: vi.fn(),
}));

vi.mock('@/features/auth/services/onboarding', () => ({
  checkOnboardingComplete: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { login as loginMock } from '@/features/auth/services/auth';
import { checkOnboardingComplete as checkOnboardingMock } from '@/features/auth/services/onboarding';

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
    vi.mocked(checkOnboardingMock).mockResolvedValue({ isComplete: true });
  });

  it('calls checkOnboardingComplete after successful login', async () => {
    render(<LoginForm />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(checkOnboardingMock).toHaveBeenCalledOnce();
    });
  });

  it('calls onSuccess when login succeeds and isComplete is true', async () => {
    const onSuccess = vi.fn();

    render(<LoginForm onSuccess={onSuccess} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it('redirects to /onboarding when isComplete is false and does not call onSuccess', async () => {
    vi.mocked(checkOnboardingMock).mockResolvedValue({ isComplete: false });
    const onSuccess = vi.fn();

    const originalHref = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: originalHref },
    });

    render(<LoginForm onSuccess={onSuccess} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(window.location.href).toBe('/onboarding');
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
