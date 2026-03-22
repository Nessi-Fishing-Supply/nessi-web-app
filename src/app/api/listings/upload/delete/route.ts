import { createClient } from '@/libs/supabase/server';
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

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl, thumbnailUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
