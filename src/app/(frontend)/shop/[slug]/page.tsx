import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getShopBySlugServer } from '@/features/shops/services/shop-server';
import { getListingsByShopServer } from '@/features/listings/services/listing-server';
import { createClient } from '@/libs/supabase/server';
import { ReportTrigger } from '@/features/reports';
import ListingCard from '@/features/listings/components/listing-card';
import styles from './shop-page.module.scss';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlugServer(slug);

  if (!shop) {
    return { title: 'Shop Not Found' };
  }

  const description = shop.description
    ? shop.description
    : `${shop.shop_name} on Nessi — browse fishing gear and tackle.`;

  return {
    title: shop.shop_name,
    description,
    openGraph: {
      title: shop.shop_name,
      description,
      ...((shop.hero_banner_url || shop.avatar_url) && {
        images: [{ url: shop.hero_banner_url ?? shop.avatar_url! }],
      }),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShopBySlugServer(slug);

  if (!shop) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isOwnShop = currentUserId === shop.owner_id;

  const listings = await getListingsByShopServer(shop.id);

  const shopSince = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(shop.created_at));

  const initials = shop.shop_name.charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      {shop.hero_banner_url && (
        <div className={styles.heroBanner}>
          <Image
            src={shop.hero_banner_url}
            alt={`${shop.shop_name} banner`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1000px"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.avatarContainer}>
          {shop.avatar_url ? (
            <Image
              src={shop.avatar_url}
              alt={`${shop.shop_name} logo`}
              fill
              sizes="120px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {initials}
            </div>
          )}
        </div>
        <div className={styles.headerInfo}>
          <h1 className={styles.shopName}>{shop.shop_name}</h1>
          <p className={styles.handle}>@{shop.slug}</p>
          <p className={styles.shopSince}>Shop since {shopSince}</p>
          {shop.description && <p className={styles.description}>{shop.description}</p>}
        </div>
      </div>

      <section className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{shop.total_transactions ?? 0}</span>
          <span className={styles.statLabel}>Sales</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{shop.review_count ?? 0}</span>
          <span className={styles.statLabel}>Reviews</span>
        </div>
      </section>

      <section className={styles.listings}>
        <h2 className={styles.sectionHeading}>Listings</h2>
        {listings.length > 0 ? (
          <div className={styles.listingGrid}>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>No listings yet</p>
        )}
      </section>

      <ReportTrigger
        currentUserId={currentUserId}
        isOwnEntity={isOwnShop}
        targetType="shop"
        targetId={shop.id}
      />
    </div>
  );
}
