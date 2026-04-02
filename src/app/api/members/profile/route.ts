import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import { scanText, logModerationFlag } from '@/libs/moderation';

// Update the authenticated member's profile text fields with content moderation
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

    const body = await req.json();

    // Whitelist: only allow fields that members can update via this route
    const ALLOWED_FIELDS = [
      'bio',
      'first_name',
      'last_name',
      'home_state',
      'primary_species',
      'primary_technique',
      'years_fishing',
      'is_seller',
    ] as const;

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
    const textFields = ['bio', 'first_name', 'last_name'] as const;
    for (const field of textFields) {
      const value = filteredBody[field];
      if (typeof value !== 'string' || value.trim().length === 0) continue;

      const scanResult = scanText(value, 'member');

      if (scanResult.action === 'block') {
        void logModerationFlag({
          memberId: user.id,
          context: 'member',
          action: 'block',
          originalContent: scanResult.originalContent,
          sourceId: user.id,
        });
        return NextResponse.json(
          { error: `The ${field} contains content that violates our community guidelines.` },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }

      if (scanResult.action === 'redact') {
        filteredBody[field] = scanResult.filteredContent;
        void logModerationFlag({
          memberId: user.id,
          context: 'member',
          action: 'redact',
          originalContent: scanResult.originalContent,
          filteredContent: scanResult.filteredContent,
          sourceId: user.id,
        });
      }
      // nudge actions are treated as 'pass' for member profiles
    }

    const { data: updated, error } = await supabase
      .from('members')
      .update(filteredBody)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Member profile update error:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500, headers: AUTH_CACHE_HEADERS },
      );
    }

    return NextResponse.json(updated, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error updating member profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
