import { createClient } from '@/libs/supabase/server';
import type { Report, ReportFormData, ReportTargetType } from '@/features/reports/types/report';

export async function createReportServer(userId: string, data: ReportFormData): Promise<Report> {
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: userId,
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already reported this item');
    }
    throw new Error(`Failed to create report: ${error.message}`);
  }

  return report as Report;
}

export async function getExistingReportServer(
  userId: string,
  targetType: ReportTargetType,
  targetId: string,
): Promise<Report | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reporter_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check existing report: ${error.message}`);
  }

  return (data as Report) ?? null;
}
