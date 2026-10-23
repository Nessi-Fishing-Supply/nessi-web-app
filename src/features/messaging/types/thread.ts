import type { Database } from '@/types/database';

export type MessageThread = Database['public']['Tables']['message_threads']['Row'];
export type MessageThreadInsert = Omit<
  Database['public']['Tables']['message_threads']['Insert'],
  'id' | 'created_at' | 'updated_at' | 'last_message_at' | 'last_message_preview'
>;
export type ThreadType = Database['public']['Enums']['thread_type'];
export type ThreadStatus = Database['public']['Enums']['thread_status'];
export type ThreadParticipant = Database['public']['Tables']['message_thread_participants']['Row'];
export type ParticipantRole = Database['public']['Enums']['participant_role'];
export type ParticipantContextType = Database['public']['Enums']['participant_context_type'];

export type ThreadListingDetails = {
  id: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  condition: string | null;
};

export type ThreadWithParticipants = MessageThread & {
  participants: (ThreadParticipant & {
    context_type: ParticipantContextType;
    context_id: string;
    member: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      slug: string | null;
      last_seen_at: string | null;
    };
    shop?: {
      id: string;
      shop_name: string;
      avatar_url: string | null;
      slug: string | null;
    } | null;
  })[];
  my_unread_count: number;
  listing?: ThreadListingDetails | null;
};

export type CreateThreadResult = {
  thread: ThreadWithParticipants;
  existing: boolean;
};
