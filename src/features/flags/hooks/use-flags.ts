import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchError } from '@/libs/fetch-error';
import { submitFlag, checkDuplicateFlag } from '@/features/flags/services/flag';
import type { FlagFormData, FlagTargetType } from '@/features/flags/types/flag';

export function useCheckDuplicateFlag(
  target_type: FlagTargetType | undefined,
  target_id: string | undefined,
) {
  return useQuery({
    queryKey: ['flags', 'check', target_type, target_id],
    queryFn: () => checkDuplicateFlag({ target_type: target_type!, target_id: target_id! }),
    enabled: !!target_type && !!target_id,
  });
}

type UseSubmitFlagOptions = {
  onSuccess?: () => void;
  onDuplicate?: () => void;
  onError?: (error: Error) => void;
};

export function useSubmitFlag(options: UseSubmitFlagOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FlagFormData) => submitFlag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags', 'check'] });
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
