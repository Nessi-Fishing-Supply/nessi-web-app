import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DIMENSION = 2000;
const THUMB_SIZE = 400;
const WEBP_QUALITY = 80;
const THUMB_QUALITY = 70;

// Uploads a photo for a listing, resizes it, and saves both full and thumbnail versions.
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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const listingId = formData.get('listingId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!listingId) {
      return NextResponse.json(
        { error: 'No listing ID provided' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { data: listing } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();

    if (!listing || listing.seller_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPEG, PNG, WebP, HEIC' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 20MB limit' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
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
    const fullPath = `${user.id}/${listingId}/${uuid}.webp`;
    const thumbPath = `${user.id}/${listingId}/thumbs/${uuid}.webp`;

    const { error: fullError } = await supabase.storage
      .from('listing-images')
      .upload(fullPath, fullImage, { contentType: 'image/webp', upsert: false });

    if (fullError) {
      console.error('Storage upload error (full):', fullError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const { error: thumbError } = await supabase.storage
      .from('listing-images')
      .upload(thumbPath, thumbnail, { contentType: 'image/webp', upsert: false });

    if (thumbError) {
      console.error('Storage upload error (thumb):', thumbError);
      await supabase.storage.from('listing-images').remove([fullPath]);
      return NextResponse.json(
        { error: 'Failed to upload thumbnail' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const {
      data: { publicUrl: url },
    } = supabase.storage.from('listing-images').getPublicUrl(fullPath);

    const {
      data: { publicUrl: thumbnailUrl },
    } = supabase.storage.from('listing-images').getPublicUrl(thumbPath);

    // Count existing photos to determine position
    const { count } = await supabase
      .from('listing_photos')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId);

    const position = count ?? 0;

    // Insert listing_photos row
    const { data: photo, error: photoError } = await supabase
      .from('listing_photos')
      .insert({
        listing_id: listingId,
        image_url: url,
        thumbnail_url: thumbnailUrl,
        position,
      })
      .select()
      .single();

    if (photoError) {
      console.error('Photo DB insert error:', photoError);
      // Cleanup storage on DB insert failure
      await supabase.storage.from('listing-images').remove([fullPath, thumbPath]);
      return NextResponse.json(
        { error: 'Failed to save photo record' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Update cover_photo_url if this is the first photo
    if (position === 0) {
      await supabase.from('listings').update({ cover_photo_url: thumbnailUrl }).eq('id', listingId);
    }

    return NextResponse.json({ photo, url, thumbnailUrl }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
