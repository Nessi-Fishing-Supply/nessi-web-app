export type TextScanAction =
  | 'pass'
  | 'block'
  | 'redact'
  | 'nudge_off_platform'
  | 'nudge_negotiation';

export type ModerationContext = 'listing' | 'member' | 'shop' | 'message';

export type TextScanResult = {
  action: TextScanAction;
  filteredContent: string | null;
  originalContent: string;
  isFiltered: boolean;
  nudgeType?: 'off_platform' | 'negotiation';
  context: ModerationContext;
};

export type ModerationViolation = {
  id: string;
  member_id: string;
  context: ModerationContext;
  action: 'block' | 'redact';
  original_content: string;
  filtered_content: string | null;
  source_id: string | null;
  created_at: string;
};
