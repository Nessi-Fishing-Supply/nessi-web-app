import type { Database } from '@/types/database';

export type Member = Database['public']['Tables']['members']['Row'];

export type MemberUpdateInput = Omit<
  Database['public']['Tables']['members']['Update'],
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'stripe_account_id'
  | 'is_stripe_connected'
  | 'stripe_onboarding_status'
  | 'average_rating'
  | 'review_count'
  | 'total_transactions'
  | 'last_seen_at'
  | 'response_time_hours'
>;

export type OnboardingStatus = {
  isComplete: boolean;
  completedAt: string | null;
};
