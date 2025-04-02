'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import styles from './Callback.module.scss';
import ResetPasswordForm from '@components/forms/reset-password';

export default function Callback() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [callbackType, setCallbackType] = useState<'signup' | 'recovery' | null>(null);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');
    const type = hashParams.get('type') as 'signup' | 'recovery' | null;

    setCallbackType(type);

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }: { error: Error | null }) => {
          if (error) {
            console.error('Session error:', error.message);
            setStatus('error');
          } else {
            setStatus('success');
          }
        });
    } else {
      setStatus('error');
    }
  }, [supabase]);

  const handleLoginClick = () => {
    router.push('/?login=true');
  };

  return (
    <div className={styles.container}>
      {status === 'loading' && <p>Verifying session...</p>}

      {status === 'success' && callbackType === 'signup' && (
        <>
          <h5>Email Verified</h5>
          <p>Your email has been successfully verified. You may now log in.</p>
          <button className={styles.loginButton} onClick={handleLoginClick}>
            Log In Now
          </button>
        </>
      )}

      {status === 'success' && callbackType === 'recovery' && (
        <section className={styles.form}>
          <h5>Reset Password</h5>
          <p>Enter a new password for your account.</p>
          <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </section>
      )}

      {status === 'error' && (
        <>
          <h5>Something went wrong</h5>
          <p>Please try logging in manually.</p>
        </>
      )}
    </div>
  );
}
