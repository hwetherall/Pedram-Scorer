import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rubricIdToLabel } from '../../../../lib/rubric';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(url, key);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabase();
    const { id } = await ctx.params; // params is a Promise in Next 16
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabase();
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const [{ data: grades, error: gradesErr }, { data: scores, error: scoresErr }] = await Promise.all([
      supabase.from('grades').select('model_name, score, feedback, raw_response').eq('submission_id', id),
      supabase.from('rubric_scores').select('rubric_id, points_possible, score').eq('submission_id', id)
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

    const weighted_total = rubric_averages.reduce((acc, r) => acc + r.avg_score, 0);
    const avgFromModels = (grades || []).filter((g: any) => typeof g.score === 'number');
    const average_score = avgFromModels.length
      ? avgFromModels.reduce((acc: number, g: any) => acc + g.score, 0) / avgFromModels.length
      : 0;

    return NextResponse.json({
      average_score,
      weighted_total,
      rubric_averages,
      results: grades || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
