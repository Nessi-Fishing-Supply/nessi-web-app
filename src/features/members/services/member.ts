import { createClient } from '@/libs/supabase/client';
import { post } from '@/libs/fetch';
import type { Member, MemberUpdateInput } from '@/features/members/types/member';
import { generateSlug as generateSlugShared } from '@/features/shared/utils/slug';

const TEXT_MODERATED_FIELDS = ['bio', 'first_name', 'last_name'] as const;

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
  const hasTextFields = TEXT_MODERATED_FIELDS.some((field) => field in data);

  if (hasTextFields) {
    return post<Member>('/api/members/profile', data);
  }

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

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('check_slug_available', { p_slug: slug });

  if (error) {
    throw new Error(`Failed to check slug availability: ${error.message}`);
  }

  return data;
}

export const generateSlug = generateSlugShared;

export async function completeOnboarding(userId: string): Promise<Member> {
  return updateMember(userId, { onboarding_completed_at: new Date().toISOString() });
}
