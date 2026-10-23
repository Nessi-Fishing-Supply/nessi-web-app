import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import {
  getAddressesServer,
  createAddressServer,
} from '@/features/addresses/services/address-server';
import { addressSchema } from '@/features/addresses/validations/address';
import type { AddressFormData } from '@/features/addresses/types/address';
import { NextResponse } from 'next/server';
import { ValidationError } from 'yup';

// Returns all saved addresses for the currently logged-in user.
export async function GET() {
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

    const addresses = await getAddressesServer(user.id);

    return NextResponse.json(addresses, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Saves a new shipping address to the user's account.
export async function POST(req: Request) {
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
    const validated = (await addressSchema.validate(body, {
      abortEarly: false,
    })) as AddressFormData;

    const address = await createAddressServer(user.id, validated);

    return NextResponse.json(address, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.errors.join(', ') },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }
    if (error instanceof Error && error.message.includes('Maximum of')) {
      return NextResponse.json(
        { error: error.message },
        { status: 422, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
