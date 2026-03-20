import * as Yup from 'yup';

export const step1Schema = Yup.object().shape({
  displayName: Yup.string()
    .trim()
    .min(3, 'Display name must be at least 3 characters')
    .max(40, 'Display name must be at most 40 characters')
    .required('Display name is required'),
});

export const step2Schema = Yup.object().shape({
  primarySpecies: Yup.array().of(Yup.string()).optional().default([]),
  primaryTechnique: Yup.array().of(Yup.string()).optional().default([]),
  homeState: Yup.string().optional().default(''),
});

export const step3Schema = Yup.object().shape({
  bio: Yup.string().max(280, 'Bio must be at most 280 characters').optional().default(''),
});
