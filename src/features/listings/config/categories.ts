import type { ListingCategory } from '@/features/listings/types/listing';

export type CategoryConfig = {
  slug: ListingCategory;
  label: string;
  description: string;
  enumValue: ListingCategory;
};

const CATEGORY_MAP: Record<ListingCategory, CategoryConfig> = {
  rods: {
    slug: 'rods',
    label: 'Rods',
    description:
      'Buy and sell fishing rods — spinning, casting, fly, and ice rods from top brands at great prices.',
    enumValue: 'rods',
  },
  reels: {
    slug: 'reels',
    label: 'Reels',
    description:
      'Shop used and new fishing reels — spinning, baitcasting, fly, and conventional reels from trusted sellers.',
    enumValue: 'reels',
  },
  lures: {
    slug: 'lures',
    label: 'Lures',
    description:
      'Find fishing lures for every technique — crankbaits, soft plastics, jigs, swimbaits, and more.',
    enumValue: 'lures',
  },
  flies: {
    slug: 'flies',
    label: 'Flies',
    description:
      'Discover hand-tied and commercial flies for fly fishing — dry flies, nymphs, streamers, and saltwater patterns.',
    enumValue: 'flies',
  },
  tackle: {
    slug: 'tackle',
    label: 'Tackle',
    description:
      'Browse fishing tackle — hooks, weights, swivels, terminal tackle, and tackle boxes from fellow anglers.',
    enumValue: 'tackle',
  },
  line: {
    slug: 'line',
    label: 'Line',
    description:
      'Shop fishing line — monofilament, fluorocarbon, braid, and fly line for fresh and saltwater fishing.',
    enumValue: 'line',
  },
  apparel: {
    slug: 'apparel',
    label: 'Apparel',
    description:
      'Find fishing apparel — sun shirts, waders, wading boots, hats, and performance gear for every angler.',
    enumValue: 'apparel',
  },
  electronics: {
    slug: 'electronics',
    label: 'Electronics',
    description:
      'Buy and sell fishing electronics — fish finders, depth finders, GPS units, and trolling motors.',
    enumValue: 'electronics',
  },
  watercraft: {
    slug: 'watercraft',
    label: 'Watercraft',
    description:
      'Shop fishing watercraft — kayaks, canoes, float tubes, jon boats, and inflatable fishing vessels.',
    enumValue: 'watercraft',
  },
  other: {
    slug: 'other',
    label: 'Other',
    description:
      'Browse miscellaneous fishing gear — accessories, tools, nets, coolers, and anything that does not fit another category.',
    enumValue: 'other',
  },
};

export const VALID_CATEGORY_SLUGS = new Set<ListingCategory>(
  Object.keys(CATEGORY_MAP) as ListingCategory[],
);

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORY_MAP[slug as ListingCategory];
}

export { CATEGORY_MAP };
