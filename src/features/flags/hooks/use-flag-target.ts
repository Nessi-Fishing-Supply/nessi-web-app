'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/indicators/toast/context';
import { useCheckDuplicateFlag } from '@/features/flags/hooks/use-flags';
import type { FlagTargetType } from '@/features/flags/types/flag';

interface UseFlagTargetParams {
  target_type: FlagTargetType;
  target_id: string;
}

export function useFlagTarget({ target_type, target_id }: UseFlagTargetParams) {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  const duplicateCheck = useCheckDuplicateFlag(target_type, target_id);

  const openFlagSheet = useCallback(() => {
    if (duplicateCheck.data?.exists) {
      showToast({
        message: 'Already reported',
        description: `You have already reported this ${target_type}.`,
        type: 'error',
      });
      return;
    }

    setIsOpen(true);
  }, [duplicateCheck.data?.exists, showToast, target_type]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    openFlagSheet,
    isOpen,
    close,
    isDuplicate: duplicateCheck.data?.exists ?? false,
    isChecking: duplicateCheck.isPending,
  };
}
