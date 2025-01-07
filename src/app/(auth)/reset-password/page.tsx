"use client";

import React, { Suspense } from "react";
import styles from "./ResetPassword.module.scss";
import ResetPasswordForm from "@components/forms/reset-password";

export default function ResetPassword() {
  return (
      <div className={styles.container}>
        <section className={styles.form}>
          <h5>Reset Password</h5>
          <p>Enter a new password for your account.</p>
          <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </section>
      </div>
  );
}
