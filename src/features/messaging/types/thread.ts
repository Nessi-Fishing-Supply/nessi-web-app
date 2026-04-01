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

export type ThreadWithParticipants = MessageThread & {
  participants: (ThreadParticipant & {
    member: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url: string | null;
      slug: string | null;
      last_seen_at: string | null;
    };
  })[];
  my_unread_count: number;
};

export type CreateThreadResult = {
  thread: ThreadWithParticipants;
  existing: boolean;
};
