import type { Database } from '@/types/database';

export type Message = Database['public']['Tables']['messages']['Row'];

export type MessageInsert = Omit<
  Database['public']['Tables']['messages']['Insert'],
  'id' | 'created_at' | 'edited_at' | 'is_filtered' | 'original_content'
>;

export type MessageType = Database['public']['Enums']['message_type'];

export type MessageWithSender = Message & {
  sender: { id: string; first_name: string; last_name: string; avatar_url: string | null };
};

export type ImageAttachment = {
  url: string;
  width: number;
  height: number;
  alt?: string;
};

export type ImageMessageMetadata = {
  images: ImageAttachment[];
};
