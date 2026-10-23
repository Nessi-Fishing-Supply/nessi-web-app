import type { IconType } from 'react-icons';
import {
  GiButterfly,
  GiFishingLure,
  GiFishingNet,
  GiFishingPole,
  GiSailboat,
  GiSpinningWheel,
} from 'react-icons/gi';
import { HiOutlineChip, HiOutlineShoppingBag, HiOutlineTag } from 'react-icons/hi';
import { TbToolsKitchen2 } from 'react-icons/tb';

import type { ListingCategory } from '@/features/listings/types/listing';

export type CategoryEntry = {
  value: ListingCategory;
  label: string;
  icon: IconType;
};

export const LISTING_CATEGORIES: CategoryEntry[] = [
  { value: 'rods', label: 'Rods', icon: GiFishingPole },
  { value: 'reels', label: 'Reels', icon: GiSpinningWheel },
  { value: 'lures', label: 'Lures', icon: GiFishingLure },
  { value: 'flies', label: 'Flies', icon: GiButterfly },
  { value: 'tackle', label: 'Tackle', icon: TbToolsKitchen2 },
  { value: 'line', label: 'Line', icon: GiFishingNet },
  { value: 'apparel', label: 'Apparel', icon: HiOutlineShoppingBag },
  { value: 'electronics', label: 'Electronics', icon: HiOutlineChip },
  { value: 'watercraft', label: 'Watercraft', icon: GiSailboat },
  { value: 'other', label: 'Other', icon: HiOutlineTag },
];

export function getCategoryLabel(value: ListingCategory): string {
  return LISTING_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getCategoryIcon(value: ListingCategory): IconType {
  return LISTING_CATEGORIES.find((c) => c.value === value)?.icon ?? HiOutlineTag;
}
