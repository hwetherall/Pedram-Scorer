import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rubricIdToLabel } from '../../../../../lib/rubric';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function toCsv(rows: Array<Record<string, any>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => JSON.stringify(r[h] ?? '').replace(/^"|"$/g, '')).join(','));
  }
  return lines.join('\n');
}

export async function GET(request: Request, ctx: { params: Promise<{ submissionId: string }> }) {
  try {
    const { submissionId } = await ctx.params;
    if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const [{ data: grades, error: gradesErr }, { data: scores, error: scoresErr }] = await Promise.all([
      supabase.from('grades').select('model_name, score, feedback, raw_response').eq('submission_id', submissionId),
      supabase.from('rubric_scores').select('rubric_id, points_possible, score').eq('submission_id', submissionId)
    ]);
    if (gradesErr) throw gradesErr;
    if (scoresErr) throw scoresErr;

    const sums = new Map<string, { sum: number; count: number; points: number | null }>();
    (scores || []).forEach((r: any) => {
      const prev = sums.get(r.rubric_id) || { sum: 0, count: 0, points: r.points_possible ?? null };
      prev.sum += Number(r.score);
      prev.count += 1;
      if (prev.points == null && r.points_possible != null) prev.points = r.points_possible;
      sums.set(r.rubric_id, prev);
    });

    const rubric_averages = Array.from(sums.entries()).map(([rubric_id, { sum, count, points }]) => ({
      rubric_id,
      label: rubricIdToLabel.get(rubric_id) || rubric_id,
      points_possible: points,
      avg_score: sum / count,
      num_models: count,
    }));

    if (format === 'csv') {
      const csv = toCsv(rubric_averages);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="submission_${submissionId}_rubric.csv"`,
        },
      });
    }

    return NextResponse.json({
      results: grades || [],
      rubric_averages,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


