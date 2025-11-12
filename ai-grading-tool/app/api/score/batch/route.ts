import { NextResponse } from 'next/server';
import { createJob, getJob, markJobFinished, markJobStarted, saveUpload, updateTaskStatus } from '../../../../lib/jobManager';
import { estimateEtaSeconds } from '../../../../lib/eta';
import { POST as gradePOST } from '../../grade/route';

async function postToGrade(baseUrl: string, file: File, applicantName?: string | null): Promise<{ ok: boolean; submissionId?: string; error?: string }> {
  // Prefer calling the local handler directly to avoid network and environment mismatches.
  const directAttempt = async () => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (applicantName) fd.append('applicant_name', applicantName);
      const req = new Request(`${baseUrl}/api/grade`, { method: 'POST', body: fd });
      const res = await gradePOST(req);
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${txt}` };
      }
      const json = await res.json();
      const submissionId = (json?.submission_id || json?.submissionId || null) ? String(json.submission_id || json.submissionId) : undefined;
      return { ok: true, submissionId };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Unknown error' };
    }
  };

  // Fallback to network fetch if direct call fails (should be rare).
  const networkAttempt = async () => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (applicantName) fd.append('applicant_name', applicantName);
      const resp = await fetch(`${baseUrl}/api/grade`, { method: 'POST', body: fd });
      if (!resp.ok) {
        const txt = await resp.text();
        return { ok: false, error: `HTTP ${resp.status}: ${txt}` };
      }
      const json = await resp.json();
      const submissionId = (json?.submission_id || json?.submissionId || null) ? String(json.submission_id || json.submissionId) : undefined;
      return { ok: true, submissionId };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Unknown error' };
    }
  };

  const first = await directAttempt();
  if (first.ok) return first;
  return await networkAttempt();
}

export async function POST(request: Request) {
  try {
    // Always use an absolute base URL; Node fetch requires absolute URLs
    const baseUrl = new URL(request.url).origin;

    const form = await request.formData();
    const files: File[] = [];
    for (const [key, val] of form.entries()) {
      if (key === 'files' && val instanceof File) files.push(val);
    }
    if (!files.length) return NextResponse.json({ error: 'No files provided (use field "files")' }, { status: 400 });

    // Limits
    if (files.length > 200) return NextResponse.json({ error: 'Too many files (max 200)' }, { status: 400 });
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) return NextResponse.json({ error: `File too large: ${f.name}` }, { status: 400 });
    }

    const job = await createJob(files.map(f => ({ name: f.name, size: f.size })), 4);

    // Persist uploads to disk to ensure durability, but still use in-memory File objects for grading
    await Promise.all(files.map((f) => saveUpload(job.id, f)));

    // Fire-and-forget processing
    (async () => {
      try {
        await markJobStarted(job.id);
        const parallelism = job.parallelism || 4;
        const queue = files.map((file, idx) => ({ file, idx }));
        const workers: Promise<void>[] = [];

        const runWorker = async () => {
          while (queue.length) {
            const { file, idx } = queue.shift()!;
            const taskId = `${job.id}_${idx}`;
            await updateTaskStatus(job.id, taskId, { status: 'Running' });
            const res = await postToGrade(baseUrl, file);
            if (res.ok) {
              await updateTaskStatus(job.id, taskId, { status: 'Done', submissionId: res.submissionId || null });
            } else {
              await updateTaskStatus(job.id, taskId, { status: 'Failed', error: res.error || 'Failed' });
            }
          }
        };

        for (let i = 0; i < parallelism; i++) {
          workers.push(runWorker());
        }
        await Promise.all(workers);
      } catch (e) {
        // swallow
      } finally {
        await markJobFinished(job.id);
      }
    })();

    // Return job reference and rough ETA
    const etaSeconds = estimateEtaSeconds(job.total, job.completed, job.parallelism, 60);
    return NextResponse.json({ jobId: job.id, etaSeconds });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


