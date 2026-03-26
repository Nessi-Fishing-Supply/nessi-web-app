import type { Database } from '@/types/database';

export type Report = Database['public']['Tables']['reports']['Row'];

export type ReportInsert = Omit<
  Database['public']['Tables']['reports']['Insert'],
  'id' | 'created_at' | 'status'
>;

export type ReportReason = Database['public']['Enums']['report_reason'];

export type ReportTargetType = Database['public']['Enums']['report_target_type'];

export type ReportStatus = Database['public']['Enums']['report_status'];

export type ReportFormData = {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
};

export type DuplicateCheckParams = {
  target_type: ReportTargetType;
  target_id: string;
};
