import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

// Records a listing view and updates the user's recently-viewed history.
export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Only increment view count for authenticated users to prevent bot inflation
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('id, view_count')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    await supabase
      .from('listings')
      .update({ view_count: (listing.view_count || 0) + 1 })
      .eq('id', id);

    // Upsert into recently_viewed — non-blocking (failure logged, not surfaced)
    supabase
      .from('recently_viewed')
      .upsert(
        { user_id: user.id, listing_id: id, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,listing_id' },
      )
      .then(({ error: upsertError }) => {
        if (upsertError) {
          console.error('Recently viewed upsert error:', upsertError);
        }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View count error:', error);
    return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 });
  }
}
