import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getMemberBySlugServer } from '@/features/members/services/member-server';
import { getProductsByMemberServer } from '@/features/products/services/product-server';
import ProductCard from '@/features/products/components/product-card';
import Pill from '@/components/indicators/pill';
import styles from './member-profile.module.scss';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = await getMemberBySlugServer(slug);

  if (!member) {
    return { title: 'Member Not Found' };
  }

  const description = member.bio
    ? member.bio
    : `${member.display_name} is a member of Nessi, the fishing gear marketplace.`;

  return {
    title: member.display_name,
    description,
    openGraph: {
      title: member.display_name,
      description,
      ...(member.avatar_url && { images: [{ url: member.avatar_url }] }),
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await getMemberBySlugServer(slug);

  if (!member) {
    notFound();
  }

  const products = member.is_seller ? await getProductsByMemberServer(member.id) : [];

  const memberSince = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(member.created_at));

  const initials = member.display_name.charAt(0).toUpperCase();

  const hasPreferences =
    (member.primary_species && member.primary_species.length > 0) ||
    (member.primary_technique && member.primary_technique.length > 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatarContainer}>
          {member.avatar_url ? (
            <Image
              src={member.avatar_url}
              alt={`${member.display_name}'s avatar`}
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
        <h1 className={styles.displayName}>{member.display_name}</h1>
        <p className={styles.handle}>@{member.slug}</p>
        <p className={styles.memberSince}>Member since {memberSince}</p>
      </div>

      {hasPreferences && (
        <section className={styles.preferences}>
          <h2 className={styles.sectionHeading}>Fishing Preferences</h2>
          <div className={styles.pills}>
            {member.primary_species?.map((s) => (
              <Pill key={s} color="primary">
                {s}
              </Pill>
            ))}
            {member.primary_technique?.map((t) => (
              <Pill key={t} color="secondary">
                {t}
              </Pill>
            ))}
          </div>
          {member.home_state && <p className={styles.location}>Based in {member.home_state}</p>}
        </section>
      )}

      {member.is_seller && (
        <>
          <section className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{member.total_transactions ?? 0}</span>
              <span className={styles.statLabel}>Sales</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{member.review_count ?? 0}</span>
              <span className={styles.statLabel}>Reviews</span>
            </div>
            {member.response_time_hours != null && (
              <div className={styles.statItem}>
                <span className={styles.statValue}>{member.response_time_hours}h</span>
                <span className={styles.statLabel}>Response Time</span>
              </div>
            )}
          </section>

          <section className={styles.listings}>
            <h2 className={styles.sectionHeading}>Listings</h2>
            {products.length > 0 ? (
              <div className={styles.productGrid}>
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>No listings yet</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
