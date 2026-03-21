import * as Yup from 'yup';

export const step1Schema = Yup.object().shape({
  displayName: Yup.string()
    .trim()
    .min(3, 'Display name must be at least 3 characters')
    .max(40, 'Display name must be at most 40 characters')
    .required('Display name is required'),
});

export const intentSchema = Yup.object().shape({
  intent: Yup.string()
    .oneOf(['buyer', 'seller'], 'Please select how you plan to use Nessi')
    .required('Please select how you plan to use Nessi'),
});

export const fishingSchema = Yup.object().shape({
  primarySpecies: Yup.array().of(Yup.string()).optional().default([]),
  primaryTechnique: Yup.array().of(Yup.string()).optional().default([]),
  homeState: Yup.string().optional().default(''),
});

export const sellerTypeSchema = Yup.object().shape({
  sellerType: Yup.string()
    .oneOf(['free', 'shop'], 'Please select how you want to sell')
    .required('Please select how you want to sell'),
});

export const bioSchema = Yup.object().shape({
  bio: Yup.string().max(280, 'Bio must be at most 280 characters').optional().default(''),
});
