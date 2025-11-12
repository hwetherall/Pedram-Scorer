import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { extractPdfText } from '../../../lib/pdf-reader.js';
import { rubric, rubricIdToPoints, rubricIdToLabel } from '../../../lib/rubric';
import * as XLSX from 'xlsx';

function getOpenRouter(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OpenRouter API key is missing');
  }
  return new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: key });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are missing');
  }
  return createClient(url, key);
}

function getSystemPrompt(rubricArr: typeof rubric): string {
  const rubricJSON = JSON.stringify(rubricArr.filter(r => r.type !== 'section'), null, 2);
  return `You are an expert teaching assistant. Evaluate the submission using this rubric. Return strict JSON.
Schema:{scores:[{id,score,justification}],overall_feedback,total_score}
Rubric:\n${rubricJSON}`;
}

async function gradeWithModel(model: string, text: string, rubricArr: typeof rubric) {
  try {
    const openrouter = getOpenRouter();
    const resp = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: getSystemPrompt(rubricArr) },
        { role: 'user', content: `Submission:\n---\n${text}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });
    let content = resp.choices[0].message.content || '{}';
    content = content.replace(/```json|```/g, '').trim();
    const json = JSON.parse(content);
    if (!json.total_score || !json.overall_feedback) throw new Error('Invalid JSON');
    return { ok: true, payload: json } as const;
  } catch (e: any) {
    return { ok: false, error: e.message } as const;
  }
}

function normalizeRubricId(val: string): string | null {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (rubricIdToPoints.has(s)) return s;
  return null;
}

function parseLineScoresFromSheet(sheet: XLSX.Sheet): Array<{ rubric_id: string; score: number; points_possible?: number; justification?: string }> {
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true }) as any[][];
  const out: Array<{ rubric_id: string; score: number; points_possible?: number; justification?: string }> = [];
  for (const row of rows) {
    if (!row || row.length === 0) continue;
    // Try to find a rubric id and a numeric score in the row
    let rid: string | null = null;
    let score: number | null = null;
    let justification: string | undefined = undefined;
    for (const cell of row) {
      if (rid == null) rid = normalizeRubricId(String(cell || ''));
    }
    if (!rid) continue;
    // Search score as first numeric in row
    for (const cell of row) {
      const n = Number(cell);
      if (Number.isFinite(n)) { score = n; break; }
    }
    if (score == null) continue;
    // Optional justification: take the longest non-ID, non-numeric cell
    let bestJust = '';
    for (const cell of row) {
      const str = (cell ?? '').toString();
      if (normalizeRubricId(str)) continue;
      if (Number.isFinite(Number(str))) continue;
      if (str.length > bestJust.length) bestJust = str;
    }
    if (bestJust.trim()) justification = bestJust.trim();

    out.push({ rubric_id: rid, score, points_possible: rubricIdToPoints.get(rid) ?? undefined, justification });
  }
  return out;
}

async function parseLineScoresFromFile(file: File): Promise<Array<{ rubric_id: string; score: number; points_possible?: number; justification?: string }>> {
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const first = wb.SheetNames[0];
  const sheet = wb.Sheets[first];
  if (!sheet) return [];
  return parseLineScoresFromSheet(sheet);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const form = await request.formData();
    const file = form.get('file') as File;
    const finalScoreStr = form.get('final_score') as string;
    const training_set_name = (form.get('training_set_name') as string) || 'default';
    const notes = (form.get('notes') as string) || null;
    const lineScoresJson = (form.get('line_scores') as string) || '';
    const lineScoresFile = form.get('line_scores_file') as File | null;

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    const final_score = Number(finalScoreStr);
    if (!Number.isFinite(final_score)) return NextResponse.json({ error: 'Invalid final_score' }, { status: 400 });

    // Extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';
    if (file.type === 'application/pdf') {
      text = await extractPdfText(buffer);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer });
      text = value;
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    if (!text.trim()) return NextResponse.json({ error: 'Empty document' }, { status: 400 });

    // Create example
    const { data: ex, error: exErr } = await supabase
      .from('training_examples')
      .insert({ training_set_name, file_name: file.name, text, final_score, notes })
      .select('id')
      .single();
    if (exErr) throw exErr;

    // Compute embedding
    try {
      const openrouter = getOpenRouter();
      const emb = await openrouter.embeddings.create({ model: 'openai/text-embedding-3-large', input: text.slice(0, 10000) });
      const vec = emb.data?.[0]?.embedding as number[] | undefined;
      if (vec && Array.isArray(vec)) await supabase.from('training_examples').update({ embedding: vec as any }).eq('id', ex.id);
    } catch (e) { console.error('Embedding error:', (e as any).message); }

    // Optional line-by-line gold: file first, then JSON fallback
    let parsedLines: Array<{ rubric_id: string; score: number; points_possible?: number; justification?: string }> = [];
    if (lineScoresFile) {
      try { parsedLines = await parseLineScoresFromFile(lineScoresFile); } catch (e) { console.error('Parse XLSX/CSV error:', (e as any).message); }
    } else if (lineScoresJson) {
      try {
        const raw = JSON.parse(lineScoresJson);
        let arr: any[] = [];
        if (Array.isArray(raw)) arr = raw;
        else if (raw && Array.isArray(raw.scores)) arr = raw.scores;
        else if (raw && typeof raw === 'object') arr = [raw];
        const norm = arr.map((a: any) => {
          const rid = (a?.rubric_id ?? a?.id ?? '').toString().trim();
          const ridNorm = normalizeRubricId(rid);
          const scoreNum = Number(a?.score);
          const pts = a?.points_possible != null ? Number(a.points_possible) : (ridNorm ? rubricIdToPoints.get(ridNorm) ?? null : null);
          const just = (a?.justification ?? '').toString().trim() || undefined;
          return ridNorm && Number.isFinite(scoreNum) ? { rubric_id: ridNorm, score: scoreNum, points_possible: pts ?? undefined, justification: just } : null;
        }).filter(Boolean) as Array<{ rubric_id: string; score: number; points_possible?: number; justification?: string }>;
        parsedLines = norm;
      } catch (e) { console.error('Line scores JSON parse error:', (e as any).message); }
    }

    if (parsedLines.length) {
      const rows = parsedLines.map(a => ({
        example_id: ex.id,
        rubric_id: a.rubric_id,
        points_possible: a.points_possible ?? rubricIdToPoints.get(a.rubric_id) ?? null,
        score: a.score,
        justification: a.justification ?? null,
      }));
      if (rows.length) await supabase.from('training_line_scores').insert(rows);
    }

    // Grade with models
    const models = ['openai/gpt-5', 'x-ai/grok-4', 'google/gemini-2.5-pro', 'anthropic/claude-sonnet-4.5'];
    const results = await Promise.all(models.map(async (m) => {
      const r = await gradeWithModel(m, text, rubric);
      if (r.ok) return { model_name: m, ...r.payload };
      return { model_name: m, error: r.error };
    }));

    const successful = results.filter((r: any) => r && typeof r.total_score === 'number');
    if (!successful.length) return NextResponse.json({ error: 'All models failed' }, { status: 500 });

    const avg = successful.reduce((acc: number, r: any) => acc + r.total_score, 0) / successful.length;

    // Insert training submission + rubric_scores + grades
    const { data: sub, error: subErr } = await supabase
      .from('submissions')
      .insert({ file_name: file.name, final_average_score: avg, original_filename: file.name, text_chars_count: text.length, is_training: true, training_example_id: ex.id })
      .select('id')
      .single();
    if (subErr) throw subErr;

    // Build points map
    const pointsById = new Map<string, number>();
    rubric.forEach(item => { if (item.type !== 'section') pointsById.set(item.id, Number(item.points)); });

    // Insert rubric_scores
    const rows: any[] = [];
    for (const r of successful) {
      const scores = (r.scores || []) as Array<{ id: string; score: number; justification?: string }>;
      for (const s of scores) {
        if (!s?.id || typeof s.score !== 'number') continue;
        rows.push({ submission_id: sub.id, model_name: r.model_name, rubric_id: s.id, points_possible: pointsById.get(s.id) ?? null, score: s.score, justification: s.justification ?? null });
      }
    }
    if (rows.length) await supabase.from('rubric_scores').insert(rows);

    // Insert grades summary
    await supabase.from('grades').insert(results.map((r: any) => ({
      submission_id: sub.id,
      model_name: r.model_name,
      score: typeof r.total_score === 'number' ? r.total_score : null,
      feedback: r.overall_feedback || r.error || null,
      raw_response: r.total_score ? { scores: r.scores, overall_feedback: r.overall_feedback, total_score: r.total_score } : { error: r.error },
    })));

    // Auto-recalibrate model biases after each training example upload
    try {
      const { data: agg, error: aggErr } = await supabase
        .from('v_training_residuals_by_model_rubric')
        .select('model_name,rubric_id,avg_residual');
      if (aggErr) throw aggErr;
      if (Array.isArray(agg) && agg.length) {
        const rows = agg.map((r: any) => ({
          model_name: r.model_name,
          rubric_id: r.rubric_id,
          bias: (Number(r.avg_residual) * -1) || 0,
          scale: 1,
        }));
        const { error: upErr } = await supabase
          .from('model_calibrations')
          .upsert(rows, { onConflict: 'model_name,rubric_id' });
        if (upErr) throw upErr;
      }
    } catch (e: any) {
      console.error('Auto recalibration error:', e.message);
    }

    return NextResponse.json({ example_id: ex.id, submission_id: sub.id, parsed_line_scores_count: parsedLines.length });
  } catch (e: any) {
    console.error('TRAINING API ERROR:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
