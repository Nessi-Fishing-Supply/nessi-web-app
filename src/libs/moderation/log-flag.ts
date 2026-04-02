import { createAdminClient } from '@/libs/supabase/admin';
import type { ModerationContext } from './types';

type LogModerationFlagParams = {
  memberId: string;
  context: ModerationContext;
  action: 'block' | 'redact';
  originalContent: string;
  filteredContent?: string | null;
  sourceId?: string | null;
};

export async function logModerationFlag(params: LogModerationFlagParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('moderation_flags' as any).insert({
      member_id: params.memberId,
      context: params.context,
      action: params.action,
      original_content: params.originalContent,
      filtered_content: params.filteredContent ?? null,
      source_id: params.sourceId ?? null,
    });
  } catch (error) {
    console.error('[moderation] Failed to log moderation flag:', error);
  }
}
