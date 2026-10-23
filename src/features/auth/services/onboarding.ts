import { createClient } from '@/libs/supabase/client';

/**
 * Check if the current user has completed onboarding.
 * Queries the members table for `onboarding_completed_at`.
 */
export async function checkOnboardingComplete(): Promise<{ isComplete: boolean }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isComplete: false };

  const { data: member } = await supabase
    .from('members')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .single();

  if (!member) return { isComplete: false };

  return { isComplete: member.onboarding_completed_at !== null };
}
