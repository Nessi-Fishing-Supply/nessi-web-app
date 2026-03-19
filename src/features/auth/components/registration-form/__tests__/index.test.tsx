/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import RegisterForm from '../index';

vi.mock('@/features/auth/services/auth', () => ({
  register: vi.fn(),
}));

vi.mock('@/libs/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { register as registerMock } from '@/features/auth/services/auth';

const fillAndSubmitForm = async () => {
  await act(async () => {
    fireEvent.change(document.getElementById('firstName')!, { target: { value: 'Jane' } });
    fireEvent.change(document.getElementById('lastName')!, { target: { value: 'Doe' } });
    fireEvent.change(document.getElementById('email')!, { target: { value: 'jane@example.com' } });
    fireEvent.change(document.getElementById('password')!, {
      target: { value: 'Str0ngPass!' },
    });
    fireEvent.click(document.getElementById('terms')!);
  });

  await act(async () => {
    fireEvent.submit(document.querySelector('form')!);
  });

  // Allow async handleSubmit to settle
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
};

describe('RegisterForm', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders the friendly duplicate email message when register throws DUPLICATE_EMAIL', async () => {
    vi.mocked(registerMock).mockRejectedValueOnce(new Error('DUPLICATE_EMAIL'));

    render(<RegisterForm onSwitchToLogin={vi.fn()} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText(/an account with that email already exists\./i)).toBeInTheDocument();
    });
  });

  it('does not render the raw DUPLICATE_EMAIL string to the user', async () => {
    vi.mocked(registerMock).mockRejectedValueOnce(new Error('DUPLICATE_EMAIL'));

    render(<RegisterForm onSwitchToLogin={vi.fn()} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText(/an account with that email already exists\./i)).toBeInTheDocument();
    });
    expect(screen.queryByText('DUPLICATE_EMAIL')).not.toBeInTheDocument();
  });

  it('renders a Sign in button when DUPLICATE_EMAIL error is shown', async () => {
    vi.mocked(registerMock).mockRejectedValueOnce(new Error('DUPLICATE_EMAIL'));

    render(<RegisterForm onSwitchToLogin={vi.fn()} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('calls onSwitchToLogin when the Sign in button is clicked', async () => {
    vi.mocked(registerMock).mockRejectedValueOnce(new Error('DUPLICATE_EMAIL'));
    const onSwitchToLogin = vi.fn();

    render(<RegisterForm onSwitchToLogin={onSwitchToLogin} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await act(async () => {
      signInButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSwitchToLogin).toHaveBeenCalledOnce();
  });

  it('renders the original error message for non-DUPLICATE_EMAIL errors', async () => {
    vi.mocked(registerMock).mockRejectedValueOnce(new Error('Network error'));

    render(<RegisterForm onSwitchToLogin={vi.fn()} />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
