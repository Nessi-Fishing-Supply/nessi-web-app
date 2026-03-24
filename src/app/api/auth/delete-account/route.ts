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

interface StoragePaths {
  profileAssetPaths: string[];
  listingImagePaths: string[];
}

/**
 * Collect all storage paths that need to be cleaned up for a user.
 * Queries the DB for paths but does NOT delete anything.
 */
async function collectStoragePaths(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<StoragePaths> {
  const profileAssetPaths: string[] = [];
  const listingImagePaths: string[] = [];

  // Member avatar
  profileAssetPaths.push(`members/${userId}/avatar.webp`);

  // Member listing photos (stored under {user_id}/{listing_id}/{file}.webp)
  const { data: listingFolders } = await admin.storage.from('listing-images').list(userId);
  if (listingFolders && listingFolders.length > 0) {
    for (const item of listingFolders) {
      if (item.id === null) {
        // It's a folder (listing_id) — list its contents
        const { data: photos } = await admin.storage
          .from('listing-images')
          .list(`${userId}/${item.name}`);
        if (photos && photos.length > 0) {
          for (const f of photos) {
            listingImagePaths.push(`${userId}/${item.name}/${f.name}`);
          }
        }
      } else {
        // It's a file directly under {user_id}/
        listingImagePaths.push(`${userId}/${item.name}`);
      }
    }
  }

  // Shop-owned storage objects
  const { data: shops } = await admin
    .from('shops')
    .select('id, hero_banner_url')
    .eq('owner_id', userId);

  if (shops && shops.length > 0) {
    for (const shop of shops) {
      // Shop avatar
      profileAssetPaths.push(`shops/${shop.id}/avatar.webp`);

      // Hero banner
      if (shop.hero_banner_url) {
        const heroPath = parseStoragePath('profile-assets', shop.hero_banner_url);
        if (heroPath) {
          profileAssetPaths.push(heroPath);
        }
      }

      // Shop listing photos
      const { data: shopListings } = await admin
        .from('listings')
        .select('id')
        .eq('shop_id', shop.id);

      if (shopListings && shopListings.length > 0) {
        const listingIds = shopListings.map((l) => l.id);
        const { data: shopPhotos } = await admin
          .from('listing_photos')
          .select('image_url, thumbnail_url')
          .in('listing_id', listingIds);

        if (shopPhotos && shopPhotos.length > 0) {
          const imagePaths = shopPhotos
            .flatMap((photo) => [
              parseStoragePath('listing-images', photo.image_url),
              photo.thumbnail_url ? parseStoragePath('listing-images', photo.thumbnail_url) : null,
            ])
            .filter((path): path is string => path !== null);

          listingImagePaths.push(...imagePaths);
        }
      }
    }
  }

  return { profileAssetPaths, listingImagePaths };
}

/**
 * Remove all collected storage paths from their respective buckets.
 * Must use the Storage API — direct SQL DELETE on storage.objects
 * is blocked by Supabase ("Direct deletion from storage tables is not allowed").
 */
async function cleanupStorage(
  admin: ReturnType<typeof createAdminClient>,
  paths: StoragePaths,
): Promise<void> {
  if (paths.profileAssetPaths.length > 0) {
    await admin.storage.from('profile-assets').remove(paths.profileAssetPaths);
  }

  if (paths.listingImagePaths.length > 0) {
    await admin.storage.from('listing-images').remove(paths.listingImagePaths);
  }
}

export async function DELETE() {
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

    const admin = createAdminClient();

    // Block deletion if the user owns active shops
    const { data: activeShops } = await admin
      .from('shops')
      .select('id, shop_name')
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    if (activeShops && activeShops.length > 0) {
      return NextResponse.json(
        { error: 'OWNS_SHOPS', shops: activeShops },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Collect storage paths BEFORE any deletions (non-blocking)
    let storagePaths: StoragePaths = { profileAssetPaths: [], listingImagePaths: [] };
    try {
      storagePaths = await collectStoragePaths(admin, user.id);
    } catch (collectError) {
      console.error('Storage path collection error (non-blocking):', collectError);
    }

    // Soft-delete all member's listings before deleting the user
    try {
      await admin
        .from('listings')
        .update({ deleted_at: new Date().toISOString(), status: 'deleted' as const })
        .eq('seller_id', user.id)
        .is('deleted_at', null);
    } catch (listingError) {
      console.error('Listing cleanup error (non-blocking):', listingError);
    }

    // Release the member's slug before deleting the user (best-effort, belt-and-suspenders
    // alongside the handle_member_deletion() DB trigger)
    try {
      await admin.from('slugs').delete().eq('entity_type', 'member').eq('entity_id', user.id);
    } catch (slugError) {
      console.error('Slug cleanup error (non-blocking):', slugError);
    }

    // Critical operation: delete the auth user
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Clean up storage AFTER successful auth deletion (best-effort)
    try {
      await cleanupStorage(admin, storagePaths);
    } catch (storageError) {
      console.error('Post-deletion storage cleanup error (non-blocking):', storageError);
    }

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
