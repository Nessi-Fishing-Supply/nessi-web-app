import * as Yup from 'yup';

import { REPORT_REASONS, REPORT_TARGET_TYPES } from '@/features/reports/constants/reasons';

const reasonValues = REPORT_REASONS.map((r) => r.value);
const targetTypeValues = REPORT_TARGET_TYPES.map((t) => t.value);

export const reportSchema = Yup.object().shape({
  target_type: Yup.string()
    .oneOf(targetTypeValues, 'Invalid target type')
    .required('Target type is required'),
  target_id: Yup.string().uuid('Target ID must be a valid UUID').required('Target ID is required'),
  reason: Yup.string()
    .oneOf(reasonValues, 'Invalid report reason')
    .required('Report reason is required'),
  description: Yup.string()
    .trim()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
});
