import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View count error:', error);
    return NextResponse.json({ error: 'Failed to increment view count' }, { status: 500 });
  }
}
