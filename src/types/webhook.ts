import type { Database } from '@/types/database';

export type WebhookEvent = Database['public']['Tables']['webhook_events']['Row'];

export type WebhookEventInsert = Database['public']['Tables']['webhook_events']['Insert'];

export type WebhookEventUpdate = Database['public']['Tables']['webhook_events']['Update'];
