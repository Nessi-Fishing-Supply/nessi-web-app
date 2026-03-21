// @ts-nocheck
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { is_seller } = body;

    if (typeof is_seller !== 'boolean') {
      return NextResponse.json({ error: 'is_seller must be a boolean' }, { status: 400 });
    }

    // When disabling seller mode, hide all member-owned products first
    if (!is_seller) {
      const { error: productsError } = await supabase
        .from('products')
        .update({ is_visible: false })
        .eq('member_id', user.id);

      if (productsError) {
        return NextResponse.json({ error: productsError.message }, { status: 500 });
      }
    }

    // Update the member's is_seller flag
    const { data: updated, error: memberError } = await supabase
      .from('members')
      .update({ is_seller })
      .eq('id', user.id)
      .select()
      .single();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Toggle seller error:', error);
    return NextResponse.json({ error: 'Failed to toggle seller status' }, { status: 500 });
  }
}
