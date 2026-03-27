import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getMemberBySlugServer } from '@/features/members/services/member-server';
import { formatMemberName, getMemberInitials } from '@/features/members/utils/format-name';
import { getListingsByMemberServer } from '@/features/listings/services/listing-server';
import { createClient } from '@/libs/supabase/server';
import { ReportTrigger } from '@/features/reports';
import ListingCard from '@/features/listings/components/listing-card';
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

  const memberName = formatMemberName(member.first_name, member.last_name);
  const description = member.bio
    ? member.bio
    : `${memberName} is a member of Nessi, the fishing gear marketplace.`;

  return {
    title: memberName,
    description,
    openGraph: {
      title: memberName,
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isOwnProfile = currentUserId === member.id;

  const listings = member.is_seller ? await getListingsByMemberServer(member.id) : [];

  const memberSince = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(member.created_at));

  const initials = getMemberInitials(member.first_name, member.last_name);

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
              alt={`${formatMemberName(member.first_name, member.last_name)}'s avatar`}
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
        <h1 className={styles.displayName}>
          {formatMemberName(member.first_name, member.last_name)}
        </h1>
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
        </>
      )}

      <ReportTrigger
        currentUserId={currentUserId}
        isOwnEntity={isOwnProfile}
        targetType="member"
        targetId={member.id}
      />
    </div>
  );
}
