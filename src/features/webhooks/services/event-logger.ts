import { createAdminClient } from '@/libs/supabase/admin';
import type { Json } from '@/types/database';
import type { WebhookEventInsert } from '@/types/webhook';

export async function insertWebhookEvent(
  eventId: string,
  eventType: string,
  source: string,
  payload: object,
): Promise<void> {
  const admin = createAdminClient();

  const insert: WebhookEventInsert = {
    event_id: eventId,
    event_type: eventType,
    source,
    payload: payload as Json,
    status: 'received',
  };

  const { error } = await admin.from('webhook_events').insert(insert);

  if (error) throw new Error(`Failed to insert webhook event: ${error.message}`);
}

export async function markEventProcessed(eventId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to mark webhook event processed: ${error.message}`);
}

export async function markEventFailed(eventId: string, errorMessage: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('webhook_events')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('event_id', eventId);

  if (error) throw new Error(`Failed to mark webhook event failed: ${error.message}`);
}

export async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .in('status', ['processed', 'received'])
    .limit(1);

  if (error) throw new Error(`Failed to check webhook event status: ${error.message}`);

  return (data?.length ?? 0) > 0;
}
