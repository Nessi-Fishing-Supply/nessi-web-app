import Image from 'next/image';
import Link from 'next/link';

import styles from './message-node.module.scss';

interface ListingNodeProps {
  metadata: {
    listing_id?: string;
    title?: string;
    price_cents?: number;
    image_url?: string;
    status?: string;
  } | null;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function ListingNode({ metadata }: ListingNodeProps) {
  if (!metadata || !metadata.listing_id) {
    return (
      <div className={styles.listingNodeWrap}>
        <div className={styles.listingNodeUnavailable}>Listing unavailable</div>
      </div>
    );
  }

  const { listing_id, title, price_cents, image_url } = metadata;

  return (
    <div className={styles.listingNodeWrap}>
      <Link href={`/listing/${listing_id}`} className={styles.listingNode}>
        <div className={styles.listingNodeThumb}>
          {image_url ? (
            <Image
              src={image_url}
              alt={title ?? 'Listing'}
              fill
              sizes="60px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className={styles.listingNodeThumbEmpty} aria-hidden="true" />
          )}
        </div>
        <div className={styles.listingNodeInfo}>
          {title && <p className={styles.listingNodeTitle}>{title}</p>}
          {price_cents !== undefined && (
            <p className={styles.listingNodePrice}>{formatPrice(price_cents)}</p>
          )}
        </div>
      </Link>
    </div>
  );
}
