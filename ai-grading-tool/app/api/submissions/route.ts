import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('submissions')
      .select('id,file_name,created_at,final_average_score,applicants(full_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const list = (data || []).map((row: any) => ({
      id: row.id,
      file_name: row.file_name,
      created_at: row.created_at,
      final_average_score: row.final_average_score,
      applicant_name: row.applicants?.full_name || null,
    }));

    return NextResponse.json({ submissions: list });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
