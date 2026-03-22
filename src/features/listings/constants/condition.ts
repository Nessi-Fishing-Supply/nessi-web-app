import type { Database } from '@/types/database';

type ListingCondition = Database['public']['Enums']['listing_condition'];

export type ConditionTier = {
  value: ListingCondition;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  textColor: string;
};

export const CONDITION_TIERS: ConditionTier[] = [
  {
    value: 'new_with_tags',
    label: 'New with Tags',
    shortLabel: 'NWT',
    description: 'Brand new, never used. Original tags, packaging, and warranty intact.',
    color: '#1b7340',
    textColor: '#ffffff',
  },
  {
    value: 'new_without_tags',
    label: 'New without Tags',
    shortLabel: 'NWoT',
    description: 'Brand new and unused, but original tags or packaging have been removed.',
    color: '#0e7c6b',
    textColor: '#ffffff',
  },
  {
    value: 'like_new',
    label: 'Like New',
    shortLabel: 'Like New',
    description:
      'Used once or twice with no visible wear. Looks and performs like it just came out of the box.',
    color: '#456b7a',
    textColor: '#ffffff',
  },
  {
    value: 'good',
    label: 'Good',
    shortLabel: 'Good',
    description: 'Regular use with normal wear. Fully functional with minor cosmetic signs of use.',
    color: '#8a6d00',
    textColor: '#ffffff',
  },
  {
    value: 'fair',
    label: 'Fair',
    shortLabel: 'Fair',
    description:
      'Noticeable wear and cosmetic imperfections. Works but may need minor maintenance.',
    color: '#b35900',
    textColor: '#ffffff',
  },
  {
    value: 'poor',
    label: 'Poor / For Parts',
    shortLabel: 'Parts',
    description:
      'Heavy wear, damage, or missing parts. Best suited for parts, repair, or a project.',
    color: '#c0392b',
    textColor: '#ffffff',
  },
];

export const CATEGORY_PHOTO_GUIDANCE: Record<string, string> = {
  rods: 'Show the full rod, then close-ups of: cork/EVA grip condition, guide wraps and inserts, rod tip, and any marks on the blank.',
  reels:
    'Show the reel from both sides, then close-ups of: drag knob, bail/levelwind, spool edge, and body/foot condition.',
  lures_hard:
    'Show all sides of the lure. Highlight: hook points, split rings, paint chips or scratches, and eye condition.',
  lures_soft:
    'Show the full bag or package if available, then close-ups of: individual bait condition, any tears, and tail integrity.',
  flies:
    'Show a top-down shot on a light background, then a profile view. Highlight: hackle condition, hook point, and any material loss.',
  _default:
    'Show the item from multiple angles. Include close-ups of any wear, damage, or notable features mentioned in your condition rating.',
};
