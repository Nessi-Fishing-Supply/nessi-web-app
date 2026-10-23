import { createClient } from '@/libs/supabase/server';
import type { Flag, FlagFormData, FlagTargetType } from '@/features/flags/types/flag';

export async function createFlagServer(userId: string, data: FlagFormData): Promise<Flag> {
  const supabase = await createClient();

  const { data: flag, error } = await supabase
    .from('flags')
    .insert({
      reporter_id: userId,
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already flagged this item');
    }
    throw new Error(`Failed to create flag: ${error.message}`);
  }

  return flag as Flag;
}

export async function getExistingFlagServer(
  userId: string,
  targetType: FlagTargetType,
  targetId: string,
): Promise<Flag | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('flags')
    .select('*')
    .eq('reporter_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check existing flag: ${error.message}`);
  }

  return (data as Flag) ?? null;
}
