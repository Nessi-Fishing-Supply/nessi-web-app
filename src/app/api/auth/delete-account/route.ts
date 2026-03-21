import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { NextResponse } from 'next/server';

function parseStoragePath(bucketName: string, publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length) || null;
}

/**
 * Clean up storage objects for a user before account deletion.
 * Must use the Storage API — direct SQL DELETE on storage.objects
 * is blocked by Supabase ("Direct deletion from storage tables is not allowed").
 */
async function cleanupUserStorage(admin: ReturnType<typeof createAdminClient>, userId: string) {
  // Delete avatar
  await admin.storage.from('avatars').remove([`${userId}.webp`]);

  // Delete all product images (stored under {user_id}/ folder)
  const { data: productImages } = await admin.storage.from('product-images').list(userId);
  if (productImages && productImages.length > 0) {
    const paths = productImages.map((file) => `${userId}/${file.name}`);
    await admin.storage.from('product-images').remove(paths);
  }

  // Delete shop-owned storage objects (best-effort per shop)
  try {
    const { data: shops } = await admin
      .from('shops')
      .select('id, hero_banner_url')
      .eq('owner_id', userId);

    if (shops && shops.length > 0) {
      for (const shop of shops) {
        // Shop avatar
        await admin.storage.from('avatars').remove([`shop-${shop.id}.webp`]);

        // Hero banner
        if (shop.hero_banner_url) {
          const heroPath = parseStoragePath('avatars', shop.hero_banner_url);
          if (heroPath) {
            await admin.storage.from('avatars').remove([heroPath]);
          }
        }

        // Shop product images
        const { data: shopProducts } = await admin
          .from('products')
          .select('id')
          .eq('shop_id', shop.id);

        if (shopProducts && shopProducts.length > 0) {
          const productIds = shopProducts.map((p) => p.id);
          const { data: shopProductImages } = await admin
            .from('product_images')
            .select('image_url')
            .in('product_id', productIds);

          if (shopProductImages && shopProductImages.length > 0) {
            const imagePaths = shopProductImages
              .map((img) => parseStoragePath('product-images', img.image_url))
              .filter((path): path is string => path !== null);

            if (imagePaths.length > 0) {
              await admin.storage.from('product-images').remove(imagePaths);
            }
          }
        }
      }
    }
  } catch (shopCleanupError) {
    console.error('Shop storage cleanup error (non-blocking):', shopCleanupError);
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Block deletion if the user owns active shops
    const { data: activeShops } = await admin
      .from('shops')
      .select('id, shop_name')
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    if (activeShops && activeShops.length > 0) {
      return NextResponse.json({ error: 'OWNS_SHOPS', shops: activeShops }, { status: 409 });
    }

    // Clean up storage before deleting the user (best-effort)
    try {
      await cleanupUserStorage(admin, user.id);
    } catch (storageError) {
      console.error('Storage cleanup error (non-blocking):', storageError);
    }

    // Release the member's slug before deleting the user (best-effort, belt-and-suspenders
    // alongside the handle_member_deletion() DB trigger)
    try {
      await admin.from('slugs').delete().eq('entity_type', 'member').eq('entity_id', user.id);
    } catch (slugError) {
      console.error('Slug cleanup error (non-blocking):', slugError);
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
