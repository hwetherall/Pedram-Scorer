import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { extractPdfText } from '../../../lib/pdf-reader.js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

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

const rubric = [
  {
    "id": "A1",
    "type": "question",
    "text": "What sparks joy in your life? Moments of well-being, elation, success or good fortune in your life and work.",
    "points": 1.25
  },
  {
    "id": "A2",
    "type": "question",
    "text": "What are your greatest passions and/or goals in life?",
    "points": 1.25
  },
  {
    "id": "A3",
    "type": "question",
    "text": "Who is(are) your superhero(s)/role model(s)? Who inspires you to be your BEST? Perhaps a role-model you admire, a family member, public figure, or a fictitious character from a comic book. How would you describe him/her/them?",
    "points": 1.25
  },
  {
    "id": "A4",
    "type": "question",
    "text": "What values do you hold that is similar to him/her/them, and what do you aspire to be?",
    "points": 1.25
  },
  {
    "id": "A5",
    "type": "question",
    "text": "Reflect upon and share a 'wake-up' call experience that sparked growth.  Challenges and setbacks help us see more clearly a shift in mindset, perspective or behavior. ",
    "points": 1.25
  },
  {
    "id": "B1",
    "type": "question",
    "text": "What does your ideal day look like? ",
    "points": 1.25
  },
  {
    "id": "B2",
    "type": "question",
    "text": "What are you doing? How are you fulfilling your biggest dreams?",
    "points": 1.25
  },
  {
    "id": "B3",
    "type": "question",
    "text": "Where in the world are you living and working? Identify at least three places that you hope to spend time in the future .",
    "points": 1.25
  },
  {
    "id": "B4",
    "type": "question",
    "text": "What kind of people are you working with? How will you help them? How will they help you?",
    "points": 1.25
  },
  {
    "id": "B5",
    "type": "question",
    "text": "Why is this important to you and what motivated you to embark upon this next journey?  ",
    "points": 1.25
  },
  {
    "id": "C1",
    "type": "question",
    "text": "What is your story? ",
    "points": 1.25
  },
  {
    "id": "C2",
    "type": "question",
    "text": "Who is your target audience?",
    "points": 1.25
  },
  {
    "id": "C3",
    "type": "question",
    "text": "What is your value proposition? What impact will you have in your organization, community, or society?",
    "points": 1.25
  },
  {
    "id": "C4",
    "type": "question",
    "text": "What is your positioning statement and how will you communicate it? ",
    "points": 1.25
  },
  {
    "id": "C5",
    "type": "question",
    "text": "Why would your ‘customer’ choose you?",
    "points": 1.25
  },
  {
    "id": "C_BONUS",
    "type": "bonus",
    "text": "BONUS: Did you talk to a potential customer and conducted an informational interview?",
    "points": 1
  },
  {
    "id": "D1",
    "type": "question",
    "text": "What potential opportunities are you considering for your career? ",
    "points": 1.25
  },
  {
    "id": "D2",
    "type": "question",
    "text": "What new domain or market do you want to know better? Which networks do you need to explore? Name 2-3 people whom you would like to connect with to realize your vision.",
    "points": 1.25
  },
  {
    "id": "D3",
    "type": "question",
    "text": "Which skill do you want to improve? What 3 things will you commit to do to improve this skill?",
    "points": 1.25
  },
  {
    "id": "D4",
    "type": "question",
    "text": "How would each of these opportunities help you accomplish your long-term vision? ",
    "points": 1.25
  },
  {
    "id": "D5",
    "type": "question",
    "text": "What challenges will you have to conquer as you make your next career move, whether that means looking for a job, starting a new venture, or earning an additional academic degree?",
    "points": 1.25
  },
  {
    "id": "D_BONUS",
    "type": "bonus",
    "text": "BONUS: Did you name 2-3 people whom you would like to connect with to realize your vision/ or commit to 3 things to improve your skill/ aid your development",
    "points": 1
  },
  {
    "id": "E1",
    "type": "question",
    "text": "Effective use of one required book of your choice (from those books listed in the syllabus), as well as frameworks from any of the books, lectures or readings in GEM or ETL",
    "points": 1
  },
  {
    "id": "E2",
    "type": "question",
    "text": "Honors 10-page limit (A = within limit, B = 1-2 page over limit, C/D/F = 3 or more pages over limit)",
    "points": 0.75
  },
  {
    "id": "E3",
    "type": "question",
    "text": "Spelling, grammar, footnotes, bibliography, etc. ",
    "points": 0.75
  },
  {
    "id": "F1",
    "type": "bonus",
    "text": "Exceptionally creative format and use of exhibits   ",
    "points": 0.75
  },
  {
    "id": "F2",
    "type": "bonus",
    "text": "Effective use of humor  ",
    "points": 0.75
  },
  {
    "id": "G",
    "type": "bonus",
    "text": "Disucssion During Presentation Enter numeric # between 1-3",
    "points": 3
  }
];

function getSystemPrompt(rubric: any[]): string {
  const rubricJSON = JSON.stringify(rubric, null, 2);

  return `You are an expert teaching assistant. You will be given a student's submission and a detailed grading rubric.

Evaluate the submission against each item in the rubric. Provide a score and a brief justification for each item.

Your response MUST be a single JSON object with the following structure:
{
  "scores": [
    {
      "id": "A1",
      "score": <score_for_A1>,
      "justification": "<brief_justification_for_A1_score>"
    },
    // ... one for each rubric item
  ],
  "overall_feedback": "<your_overall_feedback_on_the_submission>",
  "total_score": <sum_of_all_scores>
}

Here is the rubric in JSON format. Use the 'id' for each item in your response. Only grade items that are of type 'question' or 'bonus'.
${rubricJSON}
`;
}

async function gradeWithModel(model: string, text: string, rubric: any): Promise<GradeResult> {
  const systemPrompt = getSystemPrompt(rubric);

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

// --- End Re-integrated Logic ---


export async function POST(request: Request) {
  try {
    console.log('Received grading request');

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', file.name, 'Type:', file.type);

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

    // --- Supabase Integration ---
    try {
      console.log('Saving to Supabase...');
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .insert({ file_name: file.name, final_average_score: average_score })
        .select()
        .single();

      if (submissionError) throw submissionError;

      const gradesToInsert = results.map((result: GradeResult) => ({
        submission_id: submissionData.id,
        model_name: result.model_name,
        score: 'score' in result ? result.score : null,
        feedback: 'feedback' in result ? result.feedback : ('error' in result ? result.error : null),
        raw_response: 'raw_response' in result ? result.raw_response : { error: 'error' in result ? result.error : 'Unknown error' },
      }));

      const { error: gradesError } = await supabase.from('grades').insert(gradesToInsert);
      if (gradesError) throw gradesError;

      console.log('Successfully saved to Supabase. Submission ID:', submissionData.id);

    } catch (dbError: any) {
      console.error("Supabase DB Error:", dbError);
    }
    // --- End Supabase Integration ---

    return NextResponse.json({ average_score, results });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to process the document.', details: error.message }, { status: 500 });
  }
}
