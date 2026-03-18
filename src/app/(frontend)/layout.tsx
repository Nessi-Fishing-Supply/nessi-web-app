import React, { Suspense } from 'react';
import { Inter } from 'next/font/google';
import '@/styles/globals.scss';
import Navbar from '@/components/navigation/navbar';
import Providers from '@/libs/providers';

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
        <Providers>
          <Suspense fallback={<div>Loading...</div>}>
            <Navbar />
          </Suspense>
          {children}
          <div id="modal-root"></div>
        </Providers>
      </body>
    </html>
  );
}
