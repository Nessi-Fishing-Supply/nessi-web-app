import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
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
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: AUTH_CACHE_HEADERS },
    );
  }

  const admin = createAdminClient();

  const { data: shop } = await admin
    .from('shops')
    .select('id, owner_id, hero_banner_url')
    .eq('id', shopId)
    .is('deleted_at', null)
    .single();

  if (!shop) {
    return NextResponse.json(
      { error: 'Shop not found' },
      { status: 404, headers: AUTH_CACHE_HEADERS },
    );
  }

  if (shop.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: AUTH_CACHE_HEADERS });
  }

  // Storage cleanup — best-effort, non-blocking
  try {
    // Shop avatar and hero banner
    const shopPaths = [`shops/${shopId}/avatar.webp`];

    if (shop.hero_banner_url) {
      const heroPath = parseStoragePath('profile-assets', shop.hero_banner_url);
      if (heroPath) {
        shopPaths.push(heroPath);
      }
    }

    await admin.storage.from('profile-assets').remove(shopPaths);

    // Shop listing photos
    const { data: shopListings } = await admin.from('listings').select('id').eq('shop_id', shopId);

    if (shopListings && shopListings.length > 0) {
      const listingIds = shopListings.map((l) => l.id);
      const { data: listingPhotos } = await admin
        .from('listing_photos')
        .select('image_url, thumbnail_url')
        .in('listing_id', listingIds);

      if (listingPhotos && listingPhotos.length > 0) {
        const imagePaths = listingPhotos
          .flatMap((photo) => [
            parseStoragePath('listing-images', photo.image_url),
            photo.thumbnail_url ? parseStoragePath('listing-images', photo.thumbnail_url) : null,
          ])
          .filter((path): path is string => path !== null);

        if (imagePaths.length > 0) {
          await admin.storage.from('listing-images').remove(imagePaths);
        }
      }
    }
  } catch (storageError) {
    console.error('Shop storage cleanup error (non-blocking):', storageError);
  }

  // Soft-delete all listings associated with this shop
  try {
    await admin
      .from('listings')
      .update({ deleted_at: new Date().toISOString(), status: 'deleted' as const })
      .eq('shop_id', shopId)
      .is('deleted_at', null);
  } catch (listingError) {
    console.error('Shop listing cleanup error (non-blocking):', listingError);
  }

  const { error: deleteError } = await admin
    .from('shops')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', shopId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }

  // Release the shop's slug so it can be reused
  try {
    await admin.from('slugs').delete().eq('entity_type', 'shop').eq('entity_id', shopId);
  } catch (slugError) {
    console.error('Shop slug cleanup error (non-blocking):', slugError);
  }

  return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
}
