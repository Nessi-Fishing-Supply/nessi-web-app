import { createAdminClient } from '@/libs/supabase/admin';
import { createClient } from '@/libs/supabase/server';
import type {
  Notification,
  NotificationInsert,
  NotificationsResponse,
} from '@/features/notifications/types/notification';

export async function createNotificationServer(
  userId: string,
  type: NotificationInsert['type'],
  payload: {
    title?: string | null;
    body?: string | null;
    data?: Record<string, unknown> | null;
    link?: string | null;
  },
): Promise<Notification> {
  const supabase = createAdminClient();

  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title: payload.title ?? null,
      body: payload.body ?? null,
      data: payload.data ?? null,
      link: payload.link ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);

  const { count, error: countError } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) throw new Error(`Failed to count notifications: ${countError.message}`);

  if ((count ?? 0) > 100) {
    const excess = (count ?? 0) - 100;

    const { data: oldest, error: oldestError } = await (supabase as any)
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(excess);

    if (oldestError)
      throw new Error(`Failed to fetch oldest notifications: ${oldestError.message}`);

    if (oldest && oldest.length > 0) {
      const ids = (oldest as { id: string }[]).map((n) => n.id);

      const { error: deleteError } = await (supabase as any)
        .from('notifications')
        .delete()
        .in('id', ids);

      if (deleteError) throw new Error(`Failed to prune notifications: ${deleteError.message}`);
    }
  }

  return data as Notification;
}

export async function getNotificationsServer(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<NotificationsResponse> {
  const supabase = await createClient();
  const clampedLimit = Math.min(limit, 100);

  const { data, error, count } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + clampedLimit - 1);

  if (error) throw new Error(`Failed to get notifications: ${error.message}`);

  return {
    notifications: (data ?? []) as Notification[],
    total: count ?? 0,
  };
}

export async function markAsReadServer(
  notificationId: string,
  userId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
  if (!data) throw new Error('Notification not found');

  return { success: true };
}

export async function markAllAsReadServer(userId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(`Failed to mark all notifications as read: ${error.message}`);

  return { success: true };
}

export async function getUnreadCountServer(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(`Failed to get unread notification count: ${error.message}`);

  return count ?? 0;
}
