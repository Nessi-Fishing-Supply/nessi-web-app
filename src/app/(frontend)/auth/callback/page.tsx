'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './Callback.module.scss';
import ResetPasswordForm from '@/components/forms/reset-password';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams?.get('status');

  if (status === 'recovery') {
    return (
      <section className={styles.form}>
        <h5>Reset Password</h5>
        <p>Enter a new password for your account.</p>
        <ResetPasswordForm />
      </section>
    );
  }

  return <p>Processing authentication...</p>;
}

export default function Callback() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<p>Loading...</p>}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
