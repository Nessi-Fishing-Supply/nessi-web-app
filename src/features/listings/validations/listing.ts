import * as Yup from 'yup';

export const photosSchema = Yup.object().shape({
  photos: Yup.array().min(2, 'At least 2 photos are required').required(),
});

export const categoryConditionSchema = Yup.object().shape({
  category: Yup.string().required('Category is required'),
  condition: Yup.string().required('Condition is required'),
});

export const detailsSchema = Yup.object().shape({
  title: Yup.string()
    .min(10, 'Title must be at least 10 characters')
    .max(80, 'Title must be at most 80 characters')
    .required('Title is required'),
  description: Yup.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must be at most 2000 characters')
    .required('Description is required'),
});

export const pricingSchema = Yup.object().shape({
  priceCents: Yup.number()
    .min(100, 'Price must be at least $1.00')
    .max(999900, 'Price must be at most $9,999.00')
    .required('Price is required'),
  shippingPreference: Yup.string()
    .oneOf(['ship', 'local_pickup'], 'Shipping preference must be ship or local pickup')
    .required('Shipping preference is required'),
});

export const shippingSchema = Yup.object().shape({
  weightOz: Yup.number()
    .positive('Weight must be a positive number')
    .required('Weight is required'),
  packageDimensions: Yup.object().shape({
    length: Yup.number()
      .positive('Length must be a positive number')
      .required('Length is required'),
    width: Yup.number().positive('Width must be a positive number').required('Width is required'),
    height: Yup.number()
      .positive('Height must be a positive number')
      .required('Height is required'),
  }),
  shippingPaidBy: Yup.string()
    .oneOf(['buyer', 'seller'], 'Shipping must be paid by buyer or seller')
    .required('Shipping paid by is required'),
});

export const STEP_SCHEMAS = [
  photosSchema,
  categoryConditionSchema,
  detailsSchema,
  pricingSchema,
  shippingSchema,
];
