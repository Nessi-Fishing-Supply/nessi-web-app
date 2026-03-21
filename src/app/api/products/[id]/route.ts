// @ts-nocheck
import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, price, images } = await req.json();

    const { error: updateError } = await supabase
      .from('products')
      .update({ title, description, price: parseFloat(price) })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (images && images.length > 0) {
      await supabase.from('product_images').delete().eq('product_id', id);

      const imageRows = images
        .filter((img: { url: string }) => img.url)
        .map((img: { url: string }) => ({
          image_url: img.url,
          product_id: id,
        }));

      if (imageRows.length > 0) {
        await supabase.from('product_images').insert(imageRows);
      }
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: images } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', id);

    if (images && images.length > 0) {
      const storagePaths = images
        .map((img) => {
          const url = new URL(img.image_url);
          const match = url.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        await supabase.storage.from('product-images').remove(storagePaths);
      }
    }

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
