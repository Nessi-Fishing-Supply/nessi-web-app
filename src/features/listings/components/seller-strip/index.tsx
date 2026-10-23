'use client';

import Link from 'next/link';
import Image from 'next/image';
import { HiOutlineShoppingBag } from 'react-icons/hi';
import type { SellerIdentity } from '@/features/listings/types/listing';
import { formatMemberName, getMemberInitials } from '@/features/members/utils/format-name';
import styles from './seller-strip.module.scss';

interface SellerStripProps {
  seller: SellerIdentity;
}

function isNewSeller(createdAt: string): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(createdAt) > thirtyDaysAgo;
}

function getShopInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

export default function SellerStrip({ seller }: SellerStripProps) {
  const isShop = seller.type === 'shop';
  const displayName = isShop
    ? seller.shop_name
    : formatMemberName(seller.first_name, seller.last_name);
  const initials = isShop
    ? getShopInitials(seller.shop_name)
    : getMemberInitials(seller.first_name, seller.last_name);
  const href = isShop ? `/shop/${seller.slug}` : `/member/${seller.slug}`;
  const linkLabel = isShop ? 'View shop' : 'View profile';
  const newSeller = isNewSeller(seller.created_at);

  return (
    <div className={styles.strip}>
      <div className={styles.info}>
        <div className={styles.avatar}>
          {seller.avatar_url ? (
            <Image
              src={seller.avatar_url}
              alt={displayName}
              width={40}
              height={40}
              sizes="40px"
              style={{ objectFit: 'cover' }}
              className={styles.avatarImage}
            />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true">
              {initials}
            </span>
          )}
        </div>
        <span className={styles.name}>{displayName}</span>
        {isShop && (
          <span className={styles.shopBadge} aria-label="Shop">
            <HiOutlineShoppingBag aria-hidden="true" />
            Shop
          </span>
        )}
        {newSeller && !isShop && (
          <span className={styles.newBadge} aria-label="New seller">
            New seller
          </span>
        )}
      </div>
      <Link href={href} className={styles.viewLink}>
        {linkLabel}
      </Link>
    </div>
  );
}
