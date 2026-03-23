import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const raw: unknown = body?.term;

    if (typeof raw !== 'string') {
      return NextResponse.json({ error: 'term is required' }, { status: 400 });
    }

    const term = raw.trim().toLowerCase();

    if (term.length < 2) {
      return NextResponse.json({ error: 'term must be at least 2 characters' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('search_suggestions')
      .select('id, popularity')
      .eq('term', term)
      .single();

    if (existing) {
      await supabase
        .from('search_suggestions')
        .update({ popularity: existing.popularity + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('search_suggestions').insert({ term, popularity: 1 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/listings/search-suggestions] failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
