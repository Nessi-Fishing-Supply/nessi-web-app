import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { createReportServer } from '@/features/reports/services/report-server';
import { reportSchema } from '@/features/reports/validations/report';
import type { ReportFormData } from '@/features/reports/types/report';
import { NextResponse } from 'next/server';
import { ValidationError } from 'yup';

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
    const validated = (await reportSchema.validate(body, {
      abortEarly: false,
    })) as ReportFormData;

    const report = await createReportServer(user.id, validated);

    return NextResponse.json(report, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.errors.join(', ') },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }
    if (error instanceof Error && error.message.includes('already reported')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: AUTH_CACHE_HEADERS },
      );
    }
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
