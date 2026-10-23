import { createClient } from '@/libs/supabase/server';
import { LISTING_CATEGORIES } from '@/features/listings/constants/category';
import { NextResponse } from 'next/server';

export type AutocompleteSuggestion = {
  term: string;
  type: 'suggestion' | 'listing' | 'category';
};

// Returns quick search suggestions combining popular terms, listings, and categories.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get('q');

    if (!rawQ || rawQ.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const q = rawQ.trim();
    const supabase = await createClient();

    const [suggestionsResult, listingsResult] = await Promise.all([
      supabase
        .from('search_suggestions')
        .select('term')
        .ilike('term', `%${q}%`)
        .order('popularity', { ascending: false })
        .limit(4),
      supabase
        .from('listings')
        .select('title')
        .ilike('title', `%${q}%`)
        .eq('status', 'active')
        .is('deleted_at', null)
        .limit(3),
    ]);

    const suggestionItems: AutocompleteSuggestion[] = (suggestionsResult.data ?? []).map((row) => ({
      term: row.term,
      type: 'suggestion' as const,
    }));

    const listingItems: AutocompleteSuggestion[] = (listingsResult.data ?? []).map((row) => ({
      term: row.title,
      type: 'listing' as const,
    }));

    const lowerQ = q.toLowerCase();
    const categoryItems: AutocompleteSuggestion[] = LISTING_CATEGORIES.filter((entry) =>
      entry.label.toLowerCase().includes(lowerQ),
    )
      .slice(0, 2)
      .map((entry) => ({ term: entry.label, type: 'category' as const }));

    const seen = new Set<string>();
    const combined: AutocompleteSuggestion[] = [];

    for (const item of [...suggestionItems, ...listingItems, ...categoryItems]) {
      const key = item.term.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
        if (combined.length === 8) break;
      }
    }

    return NextResponse.json(combined);
  } catch (error) {
    console.error('Error fetching autocomplete suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
