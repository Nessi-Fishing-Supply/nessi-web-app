import { createClient } from '@/libs/supabase/server';
import type { Member } from '@/features/members/types/member';

export async function getMemberBySlugServer(slug: string): Promise<Member | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch member by slug: ${error.message}`);
  }

  return data;
}
