import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

function parseStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = '/storage/v1/object/public/listing-images/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return url.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

// Removes a previously uploaded listing photo from storage.
export async function DELETE(req: Request) {
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

    const { imageUrl, thumbnailUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Verify ownership: storage path format is {user_id}/{listing_id}/{uuid}.webp
    const ownershipPath = parseStoragePath(imageUrl);
    if (ownershipPath) {
      const pathUserId = ownershipPath.split('/')[0];
      if (pathUserId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    const paths: string[] = [];

    const imagePath = parseStoragePath(imageUrl);
    if (imagePath) paths.push(imagePath);

    if (thumbnailUrl) {
      const thumbPath = parseStoragePath(thumbnailUrl);
      if (thumbPath) paths.push(thumbPath);
    }

    if (paths.length > 0) {
      const { error } = await supabase.storage.from('listing-images').remove(paths);
      if (error) {
        console.warn('Storage deletion warning:', error.message);
        // Don't fail — the photo may already be deleted
      }
    }

    return NextResponse.json({ success: true }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
