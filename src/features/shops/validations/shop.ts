import * as Yup from 'yup';

export const createShopSchema = Yup.object().shape({
  shopName: Yup.string()
    .trim()
    .min(3, 'Shop name must be at least 3 characters')
    .max(60, 'Shop name must be at most 60 characters')
    .required('Shop name is required'),
  slug: Yup.string()
    .min(2, 'Handle must be at least 2 characters')
    .max(60, 'Handle must be at most 60 characters')
    .matches(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Handle can only contain lowercase letters, numbers, and hyphens',
    )
    .required('Handle is required'),
  description: Yup.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .default(''),
});

export const updateShopSchema = Yup.object().shape({
  shopName: Yup.string()
    .trim()
    .min(3, 'Shop name must be at least 3 characters')
    .max(60, 'Shop name must be at most 60 characters')
    .optional(),
  slug: Yup.string()
    .min(2, 'Handle must be at least 2 characters')
    .max(60, 'Handle must be at most 60 characters')
    .matches(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Handle can only contain lowercase letters, numbers, and hyphens',
    )
    .optional(),
  description: Yup.string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .default(''),
});
