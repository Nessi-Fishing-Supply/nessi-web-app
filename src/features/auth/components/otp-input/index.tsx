'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { verifyOtp } from '@/features/auth/services/auth';
import styles from './otp-input.module.scss';

interface OtpInputProps {
  email: string;
  type: 'signup' | 'recovery' | 'email_change';
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
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submitOtp = useCallback(
    async (token: string) => {
      setIsVerifying(true);
      setError(null);
      try {
        await verifyOtp({ email, token, type });
        onSuccess();
      } catch (err) {
        const message =
          err instanceof Error && err.message.toLowerCase().includes('expired')
            ? 'Code expired. Please request a new one.'
            : 'Invalid code. Please try again.';
        setError(message);
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      } finally {
        setIsVerifying(false);
      }
    },
    [email, type, onSuccess],
  );

  const distributeDigits = useCallback(
    (pastedDigits: string[], autoSubmit = true) => {
      const next = [...pastedDigits.slice(0, OTP_LENGTH)];
      while (next.length < OTP_LENGTH) next.push('');
      setDigits(next);

      const filled = next.filter(Boolean).length;
      if (filled < OTP_LENGTH) {
        inputRefs.current[filled]?.focus();
      } else {
        inputRefs.current[OTP_LENGTH - 1]?.focus();
        if (autoSubmit) {
          submitOtp(next.join(''));
        }
      }
    },
    [submitOtp],
  );

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every(Boolean)) {
      submitOtp(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    distributeDigits(pasted.split(''));
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pasted = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    distributeDigits(pasted.split(''));
    if (hiddenInputRef.current) hiddenInputRef.current.value = '';
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setDigits(Array(OTP_LENGTH).fill(''));
    await onResend();
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setTimeout(() => inputRefs.current[0]?.focus(), 0);
  };

  const hasError = !!error;

  return (
    <div className={styles.container}>
      <p className={styles.emailText}>
        Enter the code sent to <span className={styles.emailAddress}>{email}</span>
      </p>

      <p id="otp-instructions" className={styles.instructions}>
        Enter each digit of the 6-digit verification code below.
      </p>

      {isVerifying ? (
        <div className={styles.spinner} role="status" aria-live="polite">
          Verifying code...
        </div>
      ) : (
        <div
          role="group"
          aria-label="Verification code"
          aria-describedby="otp-instructions"
          className={styles.digitGroup}
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
              aria-label={`Verification code digit ${index + 1} of ${OTP_LENGTH}`}
              aria-invalid={hasError ? 'true' : 'false'}
              className={`${styles.digitInput}${hasError ? ` ${styles.digitInputError}` : ''}`}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
            />
          ))}
        </div>
      )}

      <input
        ref={hiddenInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleHiddenInputChange}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />

      {error && (
        <p className={styles.error} role="alert">
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
            disabled={cooldown > 0}
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpInput;
