import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST() {
  try {
    const { data, error } = await supabase
      .from('v_training_residuals_by_model_rubric')
      .select('model_name, rubric_id, avg_residual');
    if (error) throw error;

    const rows = (data || []).map((r: any) => ({
      model_name: r.model_name,
      rubric_id: r.rubric_id,
      bias: (Number(r.avg_residual) * -1) || 0,
      scale: 1,
    }));

    if (!rows.length) return NextResponse.json({ updated: 0 });

    const { error: upErr } = await supabase
      .from('model_calibrations')
      .upsert(rows, { onConflict: 'model_name,rubric_id' });
    if (upErr) throw upErr;

    return NextResponse.json({ updated: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
