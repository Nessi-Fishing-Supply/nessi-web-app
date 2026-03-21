import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', user.id)
      .eq('is_visible', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const activeListingsCount = count ?? 0;
    // TODO: Check active orders count when orders system exists
    const activeOrdersCount = 0;
    const canDisable = activeListingsCount === 0 && activeOrdersCount === 0;

    return NextResponse.json({
      canDisable,
      activeListingsCount,
      activeOrdersCount,
    });
  } catch (error) {
    console.error('Seller preconditions error:', error);
    return NextResponse.json({ error: 'Failed to check seller preconditions' }, { status: 500 });
  }
}
