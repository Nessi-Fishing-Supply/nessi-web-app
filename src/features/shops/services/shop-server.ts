import { createClient } from '@/libs/supabase/server';
import type { Shop } from '@/features/shops/types/shop';

export async function getShopBySlugServer(slug: string): Promise<Shop | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch shop by slug: ${error.message}`);
  }

  return data;
}
