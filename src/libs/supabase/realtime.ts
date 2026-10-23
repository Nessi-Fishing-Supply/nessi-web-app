import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { createClient } from './client';
import type { Database } from '@/types/database';

// Shared Supabase client instance for all realtime subscriptions.
// createBrowserClient does NOT return a singleton, so we cache one here
// to avoid creating multiple WebSocket connections.
let realtimeClient: SupabaseClient<Database> | null = null;

function getRealtimeClient(): SupabaseClient<Database> {
  if (!realtimeClient) {
    realtimeClient = createClient();
  }
  return realtimeClient;
}

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscribeToTableOptions<T extends TableName> {
  table: T;
  event?: PostgresChangeEvent;
  filter?: string;
  onPayload: (payload: RealtimePostgresChangesPayload<TableRow<T>>) => void;
  channelName?: string;
}

/**
 * Subscribe to Postgres Changes on a table via Supabase Realtime.
 * Returns a cleanup function that unsubscribes and removes the channel.
 */
export function subscribeToTable<T extends TableName>({
  table,
  event = '*',
  filter,
  onPayload,
  channelName,
}: SubscribeToTableOptions<T>): () => void {
  const supabase = getRealtimeClient();
  const name = channelName ?? `realtime-${table}-${Date.now()}`;

  const channel: RealtimeChannel = supabase
    .channel(name)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        onPayload(payload as RealtimePostgresChangesPayload<TableRow<T>>);
      },
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
    supabase.removeChannel(channel);
  };
}

interface BroadcastChannelOptions<T extends object> {
  channelName: string;
  event: string;
  onMessage: (payload: T) => void;
  self?: boolean;
}

interface BroadcastChannelResult<T extends object> {
  send: (payload: T) => Promise<void>;
  cleanup: () => void;
}

/**
 * Create a Broadcast channel for ephemeral events (typing indicators, cursor positions).
 * Broadcast events are NOT persisted — they are peer-to-peer via the Supabase Realtime server.
 */
export function createBroadcastChannel<T extends object>({
  channelName,
  event,
  onMessage,
  self = false,
}: BroadcastChannelOptions<T>): BroadcastChannelResult<T> {
  const supabase = getRealtimeClient();

  const channel: RealtimeChannel = supabase
    .channel(channelName, {
      config: {
        broadcast: { self, ack: false },
      },
    })
    .on('broadcast', { event }, (msg) => {
      onMessage(msg.payload as T);
    })
    .subscribe();

  const send = async (payload: T) => {
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  };

  const cleanup = () => {
    channel.unsubscribe();
    supabase.removeChannel(channel);
  };

  return { send, cleanup };
}
