import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { NextResponse } from 'next/server';

function parseStoragePath(bucketName: string, publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length) || null;
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: shop } = await admin
    .from('shops')
    .select('id, owner_id, hero_banner_url')
    .eq('id', shopId)
    .is('deleted_at', null)
    .single();

  if (!shop) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
  }

  if (shop.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Storage cleanup — best-effort, non-blocking
  try {
    // Shop avatar
    await admin.storage.from('avatars').remove([`shop-${shopId}.webp`]);

    // Hero banner
    if (shop.hero_banner_url) {
      const heroPath = parseStoragePath('avatars', shop.hero_banner_url);
      if (heroPath) {
        await admin.storage.from('avatars').remove([heroPath]);
      }
    }

    // Shop product images
    const { data: shopProducts } = await admin.from('products').select('id').eq('shop_id', shopId);

    if (shopProducts && shopProducts.length > 0) {
      const productIds = shopProducts.map((p) => p.id);
      const { data: productImages } = await admin
        .from('product_images')
        .select('image_url')
        .in('product_id', productIds);

      if (productImages && productImages.length > 0) {
        const imagePaths = productImages
          .map((img) => parseStoragePath('product-images', img.image_url))
          .filter((path): path is string => path !== null);

        if (imagePaths.length > 0) {
          await admin.storage.from('product-images').remove(imagePaths);
        }
      }
    }
  } catch (storageError) {
    console.error('Shop storage cleanup error (non-blocking):', storageError);
  }

  const { error: deleteError } = await admin
    .from('shops')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', shopId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
