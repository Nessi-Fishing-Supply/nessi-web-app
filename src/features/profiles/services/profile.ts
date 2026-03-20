import { createClient } from '@/libs/supabase/client';
import type { Profile, ProfileUpdateInput } from '@/features/profiles/types/profile';

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch profile: ${error.message}`);
  }

  return data;
}

export async function getProfileBySlug(slug: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch profile by slug: ${error.message}`);
  }

  return data;
}

export async function updateProfile(userId: string, data: ProfileUpdateInput): Promise<Profile> {
  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return updated;
}

export async function checkDisplayNameAvailable(name: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
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
  const { data, error } = await supabase.from('profiles').select('id').eq('slug', slug).limit(1);

  if (error) {
    throw new Error(`Failed to check slug availability: ${error.message}`);
  }

  return data.length === 0;
}

export function generateSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function completeOnboarding(userId: string): Promise<Profile> {
  return updateProfile(userId, { onboarding_completed_at: new Date().toISOString() });
}
