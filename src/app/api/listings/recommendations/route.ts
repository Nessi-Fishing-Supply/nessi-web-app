import { createClient } from '@/libs/supabase/server';
import { getRecommendationsServer } from '@/features/listings/services/recommendation-server';
import type { RecommendationContext } from '@/features/listings/types/recommendation';
import { NextResponse } from 'next/server';

const VALID_CONTEXTS: RecommendationContext[] = ['similar', 'seller', 'also_liked'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const context = searchParams.get('context');

    if (!context || !VALID_CONTEXTS.includes(context as RecommendationContext)) {
      return NextResponse.json(
        { error: 'Invalid or missing context. Must be one of: similar, seller, also_liked' },
        { status: 400 },
      );
    }

    if (context === 'similar') {
      const listingId = searchParams.get('listingId');
      const category = searchParams.get('category');
      const condition = searchParams.get('condition');

      if (!listingId || !category || !condition) {
        return NextResponse.json(
          { error: 'Missing required params for similar context: listingId, category, condition' },
          { status: 400 },
        );
      }

      const excludeListingId = searchParams.get('excludeListingId') ?? undefined;

      const listings = await getRecommendationsServer({
        context: 'similar',
        listingId,
        category,
        condition,
        excludeListingId,
      });

      return NextResponse.json({ listings, context });
    }

    if (context === 'seller') {
      const sellerId = searchParams.get('sellerId');

      if (!sellerId) {
        return NextResponse.json(
          { error: 'Missing required param for seller context: sellerId' },
          { status: 400 },
        );
      }

      const shopId = searchParams.get('shopId') ?? undefined;
      const excludeListingId = searchParams.get('excludeListingId') ?? undefined;

      const listings = await getRecommendationsServer({
        context: 'seller',
        sellerId,
        shopId,
        excludeListingId,
      });

      return NextResponse.json({ listings, context });
    }

    // also_liked
    const listingIdsParam = searchParams.get('listingIds');
    const listingIds = listingIdsParam
      ? listingIdsParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    const userId = searchParams.get('userId') ?? undefined;

    if (userId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const listings = await getRecommendationsServer({
      context: 'also_liked',
      listingIds,
      userId,
    });

    return NextResponse.json({ listings, context });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
