'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/indicators/toast/context';

export default function ContextRevocationListener() {
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const handleRevocation = (event: Event) => {
      const { shopName } = (event as CustomEvent<{ shopName: string }>).detail;

      showToast({
        type: 'error',
        message: 'Access Revoked',
        description: `You no longer have access to ${shopName}.`,
      });

      router.push('/dashboard');
    };

    window.addEventListener('nessi:context-revoked', handleRevocation);

    return () => {
      window.removeEventListener('nessi:context-revoked', handleRevocation);
    };
  }, [showToast, router]);

  return null;
}
