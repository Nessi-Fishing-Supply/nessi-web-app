"use client";

import React from 'react';
import styles from './ForgotPassword.module.scss';
import ForgotPasswordForm from '@components/forms/forgot-password';

export default function ForgotPassword() {
  
  return (
    <div className={styles.container}>
      <section className={styles.form}>
        <h5>Forgot your password?</h5>
        <p>Enter your email address and we’ll send you a link to reset your password.</p>
        <ForgotPasswordForm />
      </section>
    </div>
  );
}
