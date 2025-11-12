import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { extractPdfText } from '../../../lib/pdf-reader.js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { rubric, rubricIdToLabel, rubricIdToPoints } from '../../../lib/rubric';

// --- Re-integrated AI and Supabase Logic ---

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

type GradeResult = {
  model_name: string;
  score: number;
  feedback: string;
  raw_response: Record<string, any>;
} | {
  model_name: string;
  error: string;
};

function getSystemPrompt(rubricArr: typeof rubric): string {
  // Exclude rubric item G from scoring; it will be used to extract discussion points instead
  const rubricForScoring = rubricArr.filter(item => item.type !== 'section' && item.id !== 'G');
  const rubricJSON = JSON.stringify(rubricForScoring, null, 2);

  return `You are an expert teaching assistant. You will be given a student's submission and a detailed grading rubric.

Evaluate the submission against each item in the rubric. Provide a score and a brief justification for each item.

Your response MUST be a single JSON object with the following structure:
{
  "scores": [
    {
      "id": "A1",
      "score": <score_for_A1>,
      "justification": "<brief_justification_for_A1_score>"
    }
  ],
  "overall_feedback": "<your_overall_feedback_on_the_submission>",
  "total_score": <sum_of_all_scores>,
  "discussion_points": ["<point_1>","<point_2>","<point_3>"]
}

STRICT RULES:
- Do NOT include rubric item with id "G" in "scores" or "total_score". It is NOT scored.
- Instead, extract EXACTLY three concise, specific discussion points from the submission that would be compelling to bring up during a presentation. These should be grounded in the submission's content (claims, insights, risks, recommendations, or data points), clear on what to discuss, and each under 25 words. Return them under the top-level key "discussion_points" as an array of three strings.

Here is the rubric in JSON format. Use the 'id' for each item in your response. Only grade items that are of type 'question' or 'bonus'. Item "G" has been intentionally omitted because it's non-scored.
${rubricJSON}
`;
}

async function gradeWithModel(model: string, text: string, rubricArr: typeof rubric): Promise<GradeResult> {
  const systemPrompt = getSystemPrompt(rubricArr);

  try {
    const response = await openrouter.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the student's submission:\n\n---\n\n${text}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    let content = response.choices[0].message.content || '{}';
    content = content.replace(/```json|```/g, '').trim();
    const jsonResponse = JSON.parse(content);

    if (!jsonResponse.total_score || !jsonResponse.overall_feedback) {
      throw new Error('Invalid JSON response from model');
    }

    return {
      model_name: model,
      score: Number(jsonResponse.total_score),
      feedback: jsonResponse.overall_feedback,
      raw_response: jsonResponse,
    };

  } catch (error: any) {
    console.error(`Error grading with model ${model}:`, error);
    return {
      model_name: model,
      error: `Failed to get a valid response from the model. Details: ${error.message}`
    };
  }
}

async function extractApplicantName(text: string): Promise<string | null> {
  try {
    const prompt = `Extract the student's full name from the following text. Return JSON only.
If unsure, return {"full_name": null}.
Schema: {"full_name": string|null}
Text:\n---\n${text.slice(0, 8000)}\n---`;

    const resp = await openrouter.chat.completions.create({
      model: 'openai/gpt-5',
      messages: [
        { role: 'system', content: 'You extract person names. Output strict JSON only with keys: full_name.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    let content = resp.choices[0].message.content || '{}';
    content = content.replace(/```json|```/g, '').trim();
    const data = JSON.parse(content) as { full_name?: string | null };
    const name = (data.full_name || '').trim();
    return name ? name : null;
  } catch (e) {
    console.error('Name extraction error:', (e as any).message);
    return null;
  }
}

// --- End Re-integrated Logic ---


export async function POST(request: Request) {
  try {
    console.log('Received grading request');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    let applicantName = (formData.get('applicant_name') as string | null)?.trim() || null;

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', file.name, 'Type:', file.type, 'Applicant:', applicantName || 'Unassigned');

    const buffer = Buffer.from(await file.arrayBuffer());
    let textContent = '';

    if (file.type === 'application/pdf') {
      textContent = await extractPdfText(buffer);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer });
      textContent = value;
    } else {
      console.log('Unsupported file type');
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    console.log('Text extracted. Length:', textContent.length);

    if (!textContent.trim()) {
      console.log('No text extracted');
      return NextResponse.json({ error: 'Could not extract text from the document.' }, { status: 400 });
    }

    // AI-based applicant name extraction when not provided
    let extracted_applicant_name: string | null = null;
    if (!applicantName) {
      extracted_applicant_name = await extractApplicantName(textContent);
      if (extracted_applicant_name) {
        console.log('Extracted applicant name:', extracted_applicant_name);
        applicantName = extracted_applicant_name;
      } else {
        console.log('No applicant name extracted');
      }
    }

    // --- Upsert/Fetch applicant if provided ---
    let applicantId: string | null = null;
    if (applicantName) {
      try {
        const { data: existing, error: selErr } = await supabase
          .from('applicants')
          .select('id')
          .eq('full_name', applicantName)
          .limit(1)
          .maybeSingle();
        if (selErr) throw selErr;
        if (existing?.id) {
          applicantId = existing.id;
        } else {
          const { data: created, error: insErr } = await supabase
            .from('applicants')
            .insert({ full_name: applicantName })
            .select('id')
            .single();
          if (insErr) throw insErr;
          applicantId = created.id;
        }
      } catch (apErr: any) {
        console.error('Applicant upsert error:', apErr.message);
      }
    }

    // --- Start Grading Process ---
    const models = ['openai/gpt-5', 'x-ai/grok-4', 'google/gemini-2.5-pro', 'anthropic/claude-sonnet-4.5'] as const;

    console.log('Starting grading with models:', models);
    
    const gradingPromises = models.map(async (model: string) => {
      const result = await gradeWithModel(model, textContent, rubric);
      console.log(`Grading completed for ${model}:`, 'score' in result ? result.score : result.error);
      return result;
    });
    const results = await Promise.all(gradingPromises);
    
    const successfulResults = results.filter((r): r is { model_name: string; score: number; feedback: string; raw_response: Record<string, any> } => 'score' in r && typeof r.score === 'number');

    if (successfulResults.length === 0) {
      console.log('All models failed');
      return NextResponse.json({ error: 'All models failed to provide a grade.', details: results }, { status: 500 });
    }
    
    const totalScore = successfulResults.reduce((acc: number, result: { score: number }) => acc + result.score, 0);
    const average_score = totalScore / successfulResults.length;

    console.log('Average score calculated:', average_score);

    // Aggregate non-scored discussion points (rubric G) from model outputs
    const discussionPointsCandidates: string[] = [];
    for (const r of successfulResults) {
      const pts = (r.raw_response && Array.isArray((r.raw_response as any).discussion_points))
        ? (r.raw_response as any).discussion_points as unknown[]
        : [];
      for (const p of pts) {
        if (typeof p === 'string' && p.trim()) discussionPointsCandidates.push(p.trim());
      }
    }
    const uniqueDiscussionPoints = Array.from(new Set(discussionPointsCandidates));
    const discussion_points = uniqueDiscussionPoints.slice(0, 3);

    // --- Supabase Integration ---
    try {
      console.log('Saving to Supabase...');
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .insert({ 
          file_name: file.name, 
          final_average_score: average_score,
          applicant_id: applicantId,
          original_filename: file.name,
          text_chars_count: textContent.length
        })
        .select('id')
        .single();

      if (submissionError) throw submissionError;
      const submissionId = submissionData.id;

      // Build points map for rubric
      const pointsById = new Map<string, number>();
      rubric.forEach(item => {
        if (item.type !== 'section') pointsById.set(item.id, Number(item.points));
      });

      // Prepare rubric_scores inserts
      const rubricRows: any[] = [];
      for (const res of successfulResults) {
        const scoresArr = (res.raw_response?.scores as Array<{ id: string; score: number; justification?: string }>) || [];
        for (const s of scoresArr) {
          if (!s?.id || typeof s.score !== 'number') continue;
          rubricRows.push({
            submission_id: submissionId,
            model_name: res.model_name,
            rubric_id: s.id,
            points_possible: pointsById.get(s.id) ?? null,
            score: s.score,
            justification: s.justification ?? null,
          });
        }
      }

      if (rubricRows.length > 0) {
        const { error: rsErr } = await supabase.from('rubric_scores').insert(rubricRows);
        if (rsErr) throw rsErr;
      }

      // Save per-model summary rows (existing logic)
      const gradesToInsert = results.map((result: GradeResult) => ({
        submission_id: submissionId,
        model_name: result.model_name,
        score: 'score' in result ? result.score : null,
        feedback: 'feedback' in result ? result.feedback : ('error' in result ? result.error : null),
        raw_response: 'raw_response' in result ? result.raw_response : { error: 'error' in result ? result.error : 'Unknown error' },
      }));

      const { error: gradesError } = await supabase.from('grades').insert(gradesToInsert);
      if (gradesError) throw gradesError;

      console.log('Successfully saved to Supabase. Submission ID:', submissionId);

      // Compute rubric-level averages for immediate response as well
      const rubricMeta = new Map<string, { label: string; points?: number | null }>();
      rubric.forEach(item => {
        if (item.type !== 'section') rubricMeta.set(item.id, { label: item.text, points: Number(item.points) });
      });

      const sums = new Map<string, { sum: number; count: number }>();
      for (const res of successfulResults) {
        const scoresArr = (res.raw_response?.scores as Array<{ id: string; score: number }>) || [];
        for (const s of scoresArr) {
          if (!s?.id || typeof s.score !== 'number') continue;
          const prev = sums.get(s.id) || { sum: 0, count: 0 };
          prev.sum += Number(s.score);
          prev.count += 1;
          sums.set(s.id, prev);
        }
      }

      const rubric_averages = Array.from(sums.entries()).map(([rubric_id, { sum, count }]) => {
        const meta = rubricMeta.get(rubric_id);
        return {
          rubric_id,
          label: meta?.label || rubric_id,
          points_possible: meta?.points ?? null,
          avg_score: sum / count,
          num_models: count,
        };
      });

      const weighted_total = rubric_averages.reduce((acc, r) => acc + r.avg_score, 0);

      return NextResponse.json({ average_score, weighted_total, rubric_averages, results, extracted_applicant_name, discussion_points });

    } catch (dbError: any) {
      console.error("Supabase DB Error:", dbError);
    }
    // --- End Supabase Integration ---

    return NextResponse.json({ average_score, results, discussion_points });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to process the document.', details: error.message }, { status: 500 });
  }
}
