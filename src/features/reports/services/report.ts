import { get, post } from '@/libs/fetch';
import type { Report, ReportFormData, DuplicateCheckParams } from '@/features/reports/types/report';

export const submitReport = async (data: ReportFormData): Promise<Report> =>
  post<Report>('/api/reports', data);

export const checkDuplicateReport = async (
  params: DuplicateCheckParams,
): Promise<{ exists: boolean }> =>
  get<{ exists: boolean }>(
    `/api/reports/check?targetType=${params.target_type}&targetId=${params.target_id}`,
  );
