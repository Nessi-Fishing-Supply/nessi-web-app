import { createClient } from '@/libs/supabase/server';
import type { ProductWithImages } from '@/features/products/types/product';

export async function getProductsByMemberServer(memberId: string): Promise<ProductWithImages[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('member_id', memberId)
    .eq('is_visible', true);

  if (error) {
    throw new Error(`Failed to fetch products by member: ${error.message}`);
  }

  return (data ?? []) as ProductWithImages[];
}

export async function getProductsByShopServer(shopId: string): Promise<ProductWithImages[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('shop_id', shopId)
    .eq('is_visible', true);

  if (error) {
    throw new Error(`Failed to fetch products by shop: ${error.message}`);
  }

  return (data ?? []) as ProductWithImages[];
}
