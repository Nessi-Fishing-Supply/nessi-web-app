import type { Database } from '@/types/database';

export type Flag = Database['public']['Tables']['flags']['Row'];

export type FlagInsert = Omit<
  Database['public']['Tables']['flags']['Insert'],
  'id' | 'created_at' | 'status'
>;

export type FlagReason = Database['public']['Enums']['flag_reason'];

export type FlagTargetType = Database['public']['Enums']['flag_target_type'];

export type FlagStatus = Database['public']['Enums']['flag_status'];

export type FlagFormData = {
  target_type: FlagTargetType;
  target_id: string;
  reason: FlagReason;
  description?: string;
};

export type DuplicateCheckParams = {
  target_type: FlagTargetType;
  target_id: string;
};
