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

import { verifyOtp } from '@/features/auth/services/auth';

const defaultProps = {
  email: 'test@example.com',
  type: 'signup' as const,
  onSuccess: vi.fn(),
  onResend: vi.fn(),
};

const enterDigits = async (digits: string) => {
  const inputs = screen.getAllByRole('textbox');
  // Filter to only the 6 visible digit inputs (exclude hidden)
  const digitInputs = inputs.filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.getAttribute('aria-label'),
  );
  for (let i = 0; i < digits.length && i < digitInputs.length; i++) {
    await act(async () => {
      fireEvent.change(digitInputs[i], { target: { value: digits[i] } });
    });
  }
};

describe('OtpInput', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('renders 6 digit inputs', () => {
    render(<OtpInput {...defaultProps} />);
    const inputs = screen
      .getAllByRole('textbox')
      .filter((el) => el.getAttribute('aria-label')?.match(/digit \d of 6/));
    expect(inputs).toHaveLength(6);
  });

  it('displays the email address', () => {
    render(<OtpInput {...defaultProps} />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('auto-advances focus to next input on digit entry', async () => {
    render(<OtpInput {...defaultProps} />);
    const inputs = screen
      .getAllByRole('textbox')
      .filter((el) => el.getAttribute('aria-label')?.match(/digit \d of 6/));

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: '1' } });
    });

    expect(document.activeElement).toBe(inputs[1]);
  });

  it('moves focus back on backspace when input is empty', async () => {
    render(<OtpInput {...defaultProps} />);
    const inputs = screen
      .getAllByRole('textbox')
      .filter((el) => el.getAttribute('aria-label')?.match(/digit \d of 6/));

    await act(async () => {
      fireEvent.change(inputs[0], { target: { value: '1' } });
    });

    await act(async () => {
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    });

    expect(document.activeElement).toBe(inputs[0]);
  });

  it('auto-submits when all 6 digits are entered and calls verifyOtp with correct params', async () => {
    vi.mocked(verifyOtp).mockResolvedValueOnce({ user: null });
    render(<OtpInput {...defaultProps} />);

    await enterDigits('123456');

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'signup',
      });
    });
  });

  it('calls onSuccess after successful verification', async () => {
    vi.mocked(verifyOtp).mockResolvedValueOnce({ user: null });
    render(<OtpInput {...defaultProps} />);

    await enterDigits('123456');

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledOnce();
    });
  });

  it('shows error message on invalid code', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(new Error('Invalid OTP'));
    render(<OtpInput {...defaultProps} />);

    await enterDigits('123456');

    await waitFor(() => {
      expect(screen.getByText('Invalid code. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows expired error message when error contains "expired"', async () => {
    vi.mocked(verifyOtp).mockRejectedValueOnce(new Error('Token has expired'));
    render(<OtpInput {...defaultProps} />);

    await enterDigits('123456');

    await waitFor(() => {
      expect(screen.getByText('Code expired. Please request a new one.')).toBeInTheDocument();
    });
  });

  it('has correct accessibility attributes on the digit group', () => {
    render(<OtpInput {...defaultProps} />);

    const group = screen.getByRole('group', { name: 'Verification code' });
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('aria-describedby', 'otp-instructions');
  });

  it('has correct aria-label and inputmode on each digit input', () => {
    render(<OtpInput {...defaultProps} />);

    for (let i = 1; i <= 6; i++) {
      const input = screen.getByLabelText(`Verification code digit ${i} of 6`);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('inputmode', 'numeric');
    }
  });

  it('renders resend link after cooldown expires', async () => {
    vi.useFakeTimers();
    render(<OtpInput {...defaultProps} />);

    // Advance one second at a time so each setTimeout fires and React re-renders
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
