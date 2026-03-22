import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DIMENSION = 2000;
const THUMB_SIZE = 400;
const WEBP_QUALITY = 80;
const THUMB_QUALITY = 70;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const listingId = formData.get('listingId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!listingId) {
      return NextResponse.json({ error: 'No listing ID provided' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPEG, PNG, WebP, HEIC' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 400 });
    }

    const sharp = (await import('sharp')).default;
    const buffer = Buffer.from(await file.arrayBuffer());

    const fullImage = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const thumbnail = await sharp(buffer)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    const uuid = crypto.randomUUID();
    const fullPath = `listings/${listingId}/${uuid}.webp`;
    const thumbPath = `listings/${listingId}/thumbs/${uuid}.webp`;

    const { error: fullError } = await supabase.storage
      .from('listing-images')
      .upload(fullPath, fullImage, { contentType: 'image/webp', upsert: false });

    if (fullError) {
      return NextResponse.json({ error: fullError.message }, { status: 500 });
    }

    const { error: thumbError } = await supabase.storage
      .from('listing-images')
      .upload(thumbPath, thumbnail, { contentType: 'image/webp', upsert: false });

    if (thumbError) {
      await supabase.storage.from('listing-images').remove([fullPath]);
      return NextResponse.json({ error: thumbError.message }, { status: 500 });
    }

    const {
      data: { publicUrl: url },
    } = supabase.storage.from('listing-images').getPublicUrl(fullPath);

    const {
      data: { publicUrl: thumbnailUrl },
    } = supabase.storage.from('listing-images').getPublicUrl(thumbPath);

    return NextResponse.json({ url, thumbnailUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
