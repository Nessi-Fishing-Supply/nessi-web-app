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

    const { title, description, price, images } = await req.json();

    if (!title || !price) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({ title, description, price: parseFloat(price), member_id: user.id })
      .select('id')
      .single<{ id: string }>();

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      const imageRows = images
        .filter((img: { url: string }) => img.url)
        .map((img: { url: string }) => ({
          image_url: img.url,
          product_id: product.id,
        }));

      if (imageRows.length > 0) {
        await supabase.from('product_images').insert(imageRows);
      }
    }

    const { data: fullProduct } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', product.id)
      .single();

    return NextResponse.json(fullProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: products, error } = await supabase
      .from('products')
      .select('*, product_images(*)');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
