import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST() {
  try {
    // Delete in dependency-safe order (children first)
    const steps: Array<{ table: string; filter?: (q: any) => any }> = [
      { table: 'rubric_scores' },
      { table: 'grades' },
      { table: 'submissions' },
      { table: 'training_line_scores' },
      { table: 'training_examples' },
      { table: 'model_calibrations' },
      { table: 'applicants' },
    ];

    const results: Array<{ table: string; ok: boolean; error?: string }> = [];

    for (const s of steps) {
      try {
        let query = supabase.from(s.table).delete();
        if (s.filter) query = s.filter(query);
        const { error } = await query;
        if (error) {
          results.push({ table: s.table, ok: false, error: error.message });
          // continue trying to delete remaining tables
        } else {
          results.push({ table: s.table, ok: true });
        }
      } catch (e: any) {
        results.push({ table: s.table, ok: false, error: e.message });
      }
    }

    const anyError = results.some(r => !r.ok);
    return NextResponse.json({ ok: !anyError, results }, { status: anyError ? 207 : 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


