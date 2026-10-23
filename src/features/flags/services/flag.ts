import { get, post } from '@/libs/fetch';
import type { Flag, FlagFormData, DuplicateCheckParams } from '@/features/flags/types/flag';

export const submitFlag = async (data: FlagFormData): Promise<Flag> =>
  post<Flag>('/api/flags', data);

export const checkDuplicateFlag = async (
  params: DuplicateCheckParams,
): Promise<{ exists: boolean }> =>
  get<{ exists: boolean }>(
    `/api/flags/check?targetType=${params.target_type}&targetId=${params.target_id}`,
  );
