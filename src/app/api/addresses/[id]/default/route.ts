import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { updateAddressServer } from '@/features/addresses/services/address-server';

export async function PATCH(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: AUTH_CACHE_HEADERS },
      );
    }

    const address = await updateAddressServer(user.id, id, { is_default: true });
    return NextResponse.json(address, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error setting default address:', error);
    return NextResponse.json(
      { error: 'Failed to set default address' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
