'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { SellerProfile } from '@/features/listings/types/listing';
import { formatMemberName, getMemberInitials } from '@/features/members/utils/format-name';
import styles from './seller-strip.module.scss';

interface SellerStripProps {
  seller: SellerProfile;
}

function isNewSeller(createdAt: string): boolean {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(createdAt) > thirtyDaysAgo;
}

export default function SellerStrip({ seller }: SellerStripProps) {
  const displayName = formatMemberName(seller.first_name, seller.last_name);
  const initials = getMemberInitials(seller.first_name, seller.last_name);
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
        {newSeller && (
          <span className={styles.newBadge} aria-label="New seller">
            New seller
          </span>
        )}
      </div>
      <Link href={`/member/${seller.slug}`} className={styles.viewShop}>
        View shop
      </Link>
    </div>
  );
}
