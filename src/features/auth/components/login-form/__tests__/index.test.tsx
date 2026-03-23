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

  it('renders reset password link', () => {
    render(<LoginForm />);
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
  });

  it('shows unverified email error', async () => {
    vi.mocked(loginMock).mockRejectedValue(new Error('Email not confirmed'));
    render(<LoginForm />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByText(/email hasn't been verified/i)).toBeInTheDocument();
    });
  });
});
