import * as Yup from 'yup';

import { FLAG_REASONS, FLAG_TARGET_TYPES } from '@/features/flags/constants/reasons';

const reasonValues = FLAG_REASONS.map((r) => r.value);
const targetTypeValues = FLAG_TARGET_TYPES.map((t) => t.value);

export const flagSchema = Yup.object().shape({
  target_type: Yup.string()
    .oneOf(targetTypeValues, 'Invalid target type')
    .required('Target type is required'),
  target_id: Yup.string().uuid('Target ID must be a valid UUID').required('Target ID is required'),
  reason: Yup.string()
    .oneOf(reasonValues, 'Invalid flag reason')
    .required('Flag reason is required'),
  description: Yup.string()
    .trim()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
});
