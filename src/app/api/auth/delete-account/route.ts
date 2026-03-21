import { createClient } from '@/libs/supabase/server';
import { createAdminClient } from '@/libs/supabase/admin';
import { NextResponse } from 'next/server';

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

    // Clean up storage before deleting the user (best-effort)
    try {
      await cleanupUserStorage(admin, user.id);
    } catch (storageError) {
      console.error('Storage cleanup error (non-blocking):', storageError);
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
