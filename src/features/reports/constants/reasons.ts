import type { Database } from '@/types/database';

type ReportReason = Database['public']['Enums']['report_reason'];
type ReportTargetType = Database['public']['Enums']['report_target_type'];

export type ReportReasonOption = {
  value: ReportReason;
  label: string;
  description: string;
};

export type ReportTargetTypeOption = {
  value: ReportTargetType;
  label: string;
};

export const REPORT_REASONS: ReportReasonOption[] = [
  {
    value: 'spam',
    label: 'Spam',
    description: 'Irrelevant, repetitive, or unsolicited promotional content.',
  },
  {
    value: 'prohibited_item',
    label: 'Prohibited Item',
    description: 'Item that violates marketplace policies or is illegal to sell.',
  },
  {
    value: 'counterfeit',
    label: 'Counterfeit',
    description: 'Fake, replica, or knockoff item being sold as genuine.',
  },
  {
    value: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Offensive, vulgar, or otherwise inappropriate text or images.',
  },
  {
    value: 'off_platform_transaction',
    label: 'Off-Platform Transaction',
    description: 'Attempting to complete sales outside of Nessi.',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    description: 'Threatening, abusive, or harassing behavior toward other users.',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else not covered by the categories above.',
  },
];

export const REPORT_TARGET_TYPES: ReportTargetTypeOption[] = [
  { value: 'listing', label: 'Listing' },
  { value: 'member', label: 'Member' },
  { value: 'shop', label: 'Shop' },
  { value: 'message', label: 'Message' },
];
