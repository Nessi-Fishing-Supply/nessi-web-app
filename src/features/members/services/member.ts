import { createClient } from '@/libs/supabase/client';
import type { Member, MemberUpdateInput } from '@/features/members/types/member';

export async function getMember(userId: string): Promise<Member | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('members').select('*').eq('id', userId).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch member: ${error.message}`);
  }

  return data;
}

export async function getMemberBySlug(slug: string): Promise<Member | null> {
  const supabase = createClient();
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

export async function updateMember(userId: string, data: MemberUpdateInput): Promise<Member> {
  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from('members')
    .update(data)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member: ${error.message}`);
  }

  return updated;
}

export async function checkDisplayNameAvailable(name: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .ilike('display_name', name)
    .limit(1);

  if (error) {
    throw new Error(`Failed to check display name availability: ${error.message}`);
  }

  return data.length === 0;
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('check_slug_available', { p_slug: slug });

  if (error) {
    throw new Error(`Failed to check slug availability: ${error.message}`);
  }

  return data;
}

export function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function completeOnboarding(userId: string): Promise<Member> {
  return updateMember(userId, { onboarding_completed_at: new Date().toISOString() });
}
