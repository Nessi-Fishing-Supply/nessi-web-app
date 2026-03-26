import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { getExistingReportServer } from '@/features/reports/services/report-server';
import { REPORT_TARGET_TYPES } from '@/features/reports/constants/reasons';
import type { ReportTargetType } from '@/features/reports/types/report';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: 'targetType and targetId are required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const validTargetTypes = REPORT_TARGET_TYPES.map((t) => t.value);
    if (!validTargetTypes.includes(targetType as ReportTargetType)) {
      return NextResponse.json(
        { error: 'Invalid targetType' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    const existing = await getExistingReportServer(
      user.id,
      targetType as ReportTargetType,
      targetId,
    );

    return NextResponse.json({ exists: !!existing }, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    console.error('Error checking report:', error);
    return NextResponse.json(
      { error: 'Failed to check report' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
