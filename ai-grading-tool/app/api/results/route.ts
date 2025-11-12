import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { letterFromTotal } from '../../../lib/gradeMap';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('id,file_name,created_at,final_average_score,applicants(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const submissions = await Promise.all(
      (data || []).map(async (row: any) => {
        const grade = await letterFromTotal(Number(row.final_average_score));
        return {
          id: row.id,
          file_name: row.file_name,
          created_at: row.created_at,
          final_average_score: row.final_average_score,
          letter_grade: grade?.letter || null,
          applicant_name: row.applicants?.full_name || null,
        };
      })
    );
    return NextResponse.json({ submissions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


