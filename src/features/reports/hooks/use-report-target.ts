'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/indicators/toast/context';
import { useCheckDuplicateReport } from '@/features/reports/hooks/use-reports';
import type { ReportTargetType } from '@/features/reports/types/report';

interface UseReportTargetParams {
  target_type: ReportTargetType;
  target_id: string;
}

export function useReportTarget({ target_type, target_id }: UseReportTargetParams) {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  const duplicateCheck = useCheckDuplicateReport(target_type, target_id);

  const openReportSheet = useCallback(() => {
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
    openReportSheet,
    isOpen,
    close,
    isDuplicate: duplicateCheck.data?.exists ?? false,
    isChecking: duplicateCheck.isPending,
  };
}
