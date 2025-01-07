"use client";

import React, { Suspense } from 'react';
import { Inter } from 'next/font/google';
import '@styles/main.scss';
import Navbar from "@components/navigation/navbar";
import { AuthProvider } from '@context/auth';
import VerifyEmailBanner from "@components/banners/verify-email";

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Navbar />
            <VerifyEmailBanner />
          </Suspense>
          {children}
          <div id="modal-root"></div>
        </AuthProvider>
      </body>
    </html>
  );
}
