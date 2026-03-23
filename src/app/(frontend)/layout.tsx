import React, { Suspense } from 'react';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import '@/styles/globals.scss';
import Navbar from '@/components/navigation/navbar';
import OnboardingBanner from '@/components/navigation/onboarding-banner';
import Providers from '@/libs/providers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-serif',
  weight: '400',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} ${dmSerif.variable}`}>
        <Providers>
          <Suspense fallback={<div>Loading...</div>}>
            <Navbar />
            <OnboardingBanner />
          </Suspense>
          {children}
          <div id="modal-root"></div>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
