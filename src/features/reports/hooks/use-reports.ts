import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from '@/libs/fetch-error';
import { submitReport, checkDuplicateReport } from '@/features/reports/services/report';
import type { ReportFormData, ReportTargetType } from '@/features/reports/types/report';

export function useCheckDuplicateReport(
  target_type: ReportTargetType | undefined,
  target_id: string | undefined,
) {
  return useQuery({
    queryKey: ['reports', 'check', target_type, target_id],
    queryFn: () => checkDuplicateReport({ target_type: target_type!, target_id: target_id! }),
    enabled: !!target_type && !!target_id,
  });
}

type UseSubmitReportOptions = {
  onSuccess?: () => void;
  onDuplicate?: () => void;
  onError?: (error: Error) => void;
};

export function useSubmitReport(options: UseSubmitReportOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReportFormData) => submitReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'check'] });
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      if (error instanceof FetchError && error.status === 409) {
        options.onDuplicate?.();
      } else {
        options.onError?.(error);
      }
    },
  });
}
