import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/libs/supabase/admin';
import { sendEmail } from '@/features/email/services/send-email';

export async function sendNotificationEmail({
  recipientId,
  subject,
  html,
}: {
  recipientId: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: member } = await supabase
      .from('members')
      .select('notification_preferences')
      .eq('id', recipientId)
      .single();

    const prefs = member?.notification_preferences;
    let communityMessages = true;

    if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
      const email = (prefs as Record<string, unknown>)['email'];
      if (email && typeof email === 'object' && !Array.isArray(email)) {
        const e = email as Record<string, unknown>;
        if (typeof e['community_messages'] === 'boolean') {
          communityMessages = e['community_messages'];
        }
      }
    }

    if (!communityMessages) {
      return;
    }

    const { data: authData } = await supabase.auth.admin.getUserById(recipientId);
    const userEmail = authData?.user?.email;

    if (!userEmail) {
      return;
    }

    await sendEmail({ to: userEmail, subject, html });
  } catch (err) {
    console.error('[sendNotificationEmail] failed:', err);
  }
}

export async function getOfferEmailContext({
  senderId,
  listingId,
  supabase,
}: {
  senderId: string;
  listingId: string;
  supabase: SupabaseClient;
}): Promise<{ senderName: string; listingTitle: string }> {
  try {
    const [memberResult, listingResult] = await Promise.all([
      supabase.from('members').select('first_name, last_name').eq('id', senderId).single(),
      supabase.from('listings').select('title').eq('id', listingId).single(),
    ]);

    const firstName = memberResult.data?.first_name ?? '';
    const lastName = memberResult.data?.last_name ?? '';
    const senderName = firstName || lastName ? `${firstName} ${lastName}`.trim() : 'A user';
    const listingTitle = listingResult.data?.title ?? 'a listing';

    return { senderName, listingTitle };
  } catch (err) {
    console.error('[getOfferEmailContext] failed:', err);
    return { senderName: 'A user', listingTitle: 'a listing' };
  }
}
