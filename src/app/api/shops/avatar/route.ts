import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { requireShopPermission } from '@/libs/shop-permissions';
import sharp from 'sharp';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Uploads and sets a new avatar image for a shop's profile.
export async function POST(req: Request) {
  try {
    const result = await requireShopPermission(req, 'shop_settings', 'full');
    if (result instanceof NextResponse) return result;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const shopId = formData.get('shopId') as string;

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (shopId !== result.shopId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (!file.type.startsWith('image/') || !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 5MB limit' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const admin = createAdminClient();
    const fileName = `shops/${shopId}/avatar.webp`;

    const { error: uploadError } = await admin.storage
      .from('profile-assets')
      .upload(fileName, resized, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('profile-assets').getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
