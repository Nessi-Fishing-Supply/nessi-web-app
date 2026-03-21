// @ts-nocheck
import type { Database } from '@/types/database';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type ProductImage = Database['public']['Tables']['product_images']['Row'];
export type ProductImageInsert = Database['public']['Tables']['product_images']['Insert'];

export type ProductWithImages = Product & {
  product_images: ProductImage[];
};
