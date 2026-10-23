import { NextResponse } from 'next/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { sendEmail } from '@/features/email/services/send-email';
import { priceDrop } from '@/features/email/templates/price-drop';

// Process price drop notifications and email watchers about reduced prices
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: notifications, error: notifError } = await admin
    .from('price_drop_notifications')
    .select('id, listing_id, old_price_cents, new_price_cents, listings(title)')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (notifError) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  let processed = 0;
  let emailsSent = 0;

  for (const notification of notifications ?? []) {
    const listing = notification.listings as { title: string } | null;
    const listingTitle = listing?.title ?? 'Listing';

    const { data: watchers, error: watchersError } = await admin
      .from('watchers')
      .select('id, user_id, last_notified_price_cents')
      .eq('listing_id', notification.listing_id)
      .or(
        `last_notified_price_cents.is.null,last_notified_price_cents.gt.${notification.new_price_cents}`,
      );

    if (watchersError) {
      continue;
    }

    for (const watcher of watchers ?? []) {
      try {
        const {
          data: { user },
          error: userError,
        } = await admin.auth.admin.getUserById(watcher.user_id);

        if (userError || !user?.email) continue;

        const { subject, html } = priceDrop({
          listingTitle,
          oldPriceCents: notification.old_price_cents,
          newPriceCents: notification.new_price_cents,
          listingId: notification.listing_id,
        });

        await sendEmail({ to: user.email, subject, html });
        emailsSent++;

        await admin
          .from('watchers')
          .update({ last_notified_price_cents: notification.new_price_cents })
          .eq('id', watcher.id);
      } catch {
        // One failure should not block other watchers
      }
    }

    await admin
      .from('price_drop_notifications')
      .update({ processed: true })
      .eq('id', notification.id);

    processed++;
  }

  return NextResponse.json({ processed, emails_sent: emailsSent });
}
