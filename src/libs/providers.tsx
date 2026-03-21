'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from './query-client';
import { AuthProvider } from '@/features/auth/context';
import { ToastProvider } from '@/components/indicators/toast/context';
import ContextRevocationListener from '@/features/context/components/context-revocation-listener';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {children}
          <ContextRevocationListener />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
