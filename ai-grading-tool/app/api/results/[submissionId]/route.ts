import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rubric, rubricIdToLabel } from '../../../../lib/rubric';
import { letterFromTotal } from '../../../../lib/gradeMap';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(_req: Request, ctx: { params: Promise<{ submissionId: string }> }) {
  try {
    const { submissionId } = await ctx.params;
    if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });

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

    // Build rubric order from canonical rubric definition
    const idOrder = new Map<string, number>();
    let orderIdx = 0;
    rubric.forEach((item) => {
      if (item.type !== 'section') {
        idOrder.set(item.id, orderIdx++);
      }
    });

    let rubric_averages = Array.from(sums.entries()).map(([rubric_id, { sum, count, points }]) => ({
      rubric_id,
      label: rubricIdToLabel.get(rubric_id) || rubric_id,
      points_possible: points,
      avg_score: sum / count,
      num_models: count,
    }));
    rubric_averages = rubric_averages.sort((a, b) => {
      const ai = idOrder.get(a.rubric_id) ?? Number.MAX_SAFE_INTEGER;
      const bi = idOrder.get(b.rubric_id) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
    const weighted_total = rubric_averages.reduce((acc, r) => acc + r.avg_score, 0);
    const avgModels = (grades || []).filter((g: any) => typeof g.score === 'number');
    const average_score = avgModels.length ? avgModels.reduce((acc: number, g: any) => acc + g.score, 0) / avgModels.length : 0;
    const grade = await letterFromTotal(weighted_total);

    return NextResponse.json({ average_score, weighted_total, letter_grade: grade?.letter || null, rubric_averages, results: grades || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


