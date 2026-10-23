import * as Yup from 'yup';

import { US_STATES } from '@/features/listings/config/us-states';

const stateValues = US_STATES.map((s) => s.value);

export const addressSchema = Yup.object().shape({
  label: Yup.string()
    .trim()
    .max(50, 'Label must be at most 50 characters')
    .required('Label is required'),
  line1: Yup.string()
    .trim()
    .max(100, 'Address line 1 must be at most 100 characters')
    .required('Address line 1 is required'),
  line2: Yup.string()
    .trim()
    .max(100, 'Address line 2 must be at most 100 characters')
    .nullable()
    .optional(),
  city: Yup.string()
    .trim()
    .max(50, 'City must be at most 50 characters')
    .required('City is required'),
  state: Yup.string()
    .oneOf(stateValues, 'State must be a valid US state code')
    .required('State is required'),
  zip: Yup.string()
    .matches(/^\d{5}(-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789')
    .required('ZIP code is required'),
  is_default: Yup.boolean().optional().default(false),
});
