import { requireShopPermission } from '@/libs/shop-permissions';
import { createAdminClient } from '@/libs/supabase/admin';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { scanText, logModerationFlag } from '@/libs/moderation';

// Update a shop's text fields (name, description) with content moderation
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: shopId } = await context.params;

  try {
    const result = await requireShopPermission(req, 'shop_settings', 'full', {
      expectedShopId: shopId,
    });
    if (result instanceof NextResponse) return result;

    const { user } = result;
    const body = await req.json();

    // Whitelist: only allow text fields that can be updated via this route
    const ALLOWED_FIELDS = ['shop_name', 'description'] as const;

    const filteredBody: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        filteredBody[key] = body[key];
      }
    }

    if (Object.keys(filteredBody).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Text moderation: scan text fields
    for (const field of ALLOWED_FIELDS) {
      const value = filteredBody[field];
      if (typeof value !== 'string' || value.trim().length === 0) continue;

      const scanResult = scanText(value, 'shop');

      if (scanResult.action === 'block') {
        void logModerationFlag({
          memberId: user.id,
          context: 'shop',
          action: 'block',
          originalContent: scanResult.originalContent,
          sourceId: shopId,
        });
        return NextResponse.json(
          {
            error: `The ${field === 'shop_name' ? 'shop name' : field} contains content that violates our community guidelines.`,
          },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }

      if (scanResult.action === 'redact') {
        filteredBody[field] = scanResult.filteredContent;
        void logModerationFlag({
          memberId: user.id,
          context: 'shop',
          action: 'redact',
          originalContent: scanResult.originalContent,
          filteredContent: scanResult.filteredContent,
          sourceId: shopId,
        });
      }
      // nudge actions are treated as 'pass' for shop profiles
    }

    // Use admin client for update — shop updates are authorized by requireShopPermission
    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from('shops')
      .update(filteredBody)
      .eq('id', shopId)
      .select()
      .single();

    if (error) {
      console.error('Shop profile update error:', error);
      return NextResponse.json(
        { error: 'Failed to update shop' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error updating shop profile:', error);
    return NextResponse.json(
      { error: 'Failed to update shop' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
