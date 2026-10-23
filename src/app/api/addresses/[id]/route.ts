import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import {
  updateAddressServer,
  deleteAddressServer,
} from '@/features/addresses/services/address-server';
import { addressSchema } from '@/features/addresses/validations/address';

// Updates an existing address on the user's account.
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
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

    const body = await req.json();
    const validatedData = await addressSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const { line2, ...rest } = validatedData;
    const updated = await updateAddressServer(user.id, id, {
      ...rest,
      line2: line2 ?? undefined,
    });

    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Address not found')) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Removes a saved address from the user's account.
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
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

    await deleteAddressServer(user.id, id);

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof Error && error.message === 'Address not found') {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
