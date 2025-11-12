import { promises as fs } from 'fs';
import path from 'path';
import { BatchJob, SubmissionTask } from './types';

// Use a writable base directory. On Vercel serverless, only /tmp is writable.
// In local/dev, default to the project directory.
const WRITABLE_BASE =
  process.env.WRITABLE_BASE_DIR
  || process.env.TMPDIR
  || (process.env.VERCEL ? '/tmp' : process.cwd());

const DATA_DIR = path.join(WRITABLE_BASE, 'ai-grading-tool', '.data');
const JOBS_DIR = path.join(DATA_DIR, 'jobs');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDirsSync() {
  [DATA_DIR, JOBS_DIR, UPLOADS_DIR].forEach((dir) => {
    try { require('fs').mkdirSync(dir, { recursive: true }); } catch {}
  });
}

ensureDirsSync();

const jobs = new Map<string, BatchJob>();

function createId(prefix = 'job'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

export function getJob(jobId: string): BatchJob | undefined {
  return jobs.get(jobId);
}

export async function loadJobFromDisk(jobId: string): Promise<BatchJob | null> {
  try {
    const p = path.join(JOBS_DIR, `${jobId}.json`);
    const raw = await fs.readFile(p, 'utf-8');
    const job = JSON.parse(raw) as BatchJob;
    jobs.set(jobId, job);
    return job;
  } catch {
    return null;
  }
}

async function persistJob(job: BatchJob): Promise<void> {
  await fs.mkdir(JOBS_DIR, { recursive: true });
  await fs.writeFile(path.join(JOBS_DIR, `${job.id}.json`), JSON.stringify(job, null, 2), 'utf-8');
}

export async function createJob(fileMetas: Array<{ name: string; size?: number }>, parallelism = 4): Promise<BatchJob> {
  const jobId = createId('batch');
  const now = Date.now();
  const items: SubmissionTask[] = fileMetas.map((f, idx) => ({
    id: `${jobId}_${idx}`,
    fileName: f.name,
    size: f.size,
    status: 'Queued',
    error: null,
  }));
  const job: BatchJob = {
    id: jobId,
    total: items.length,
    completed: 0,
    failed: 0,
    createdAt: now,
    parallelism,
    items,
  };
  jobs.set(jobId, job);
  await persistJob(job);
  return job;
}

export async function saveUpload(jobId: string, file: File): Promise<string> {
  const jobDir = path.join(UPLOADS_DIR, jobId);
  await fs.mkdir(jobDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w\.-]+/g, '_');
  const p = path.join(jobDir, safeName);
  await fs.writeFile(p, buffer);
  return p;
}

export async function updateTaskStatus(jobId: string, taskId: string, updates: Partial<SubmissionTask>): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  const idx = job.items.findIndex((i) => i.id === taskId);
  if (idx === -1) return;
  const task = job.items[idx];
  job.items[idx] = { ...task, ...updates };
  if (updates.status === 'Done') job.completed += 1;
  if (updates.status === 'Failed') job.failed += 1;
  await persistJob(job);
}

export async function markJobStarted(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  job.startedAt = Date.now();
  await persistJob(job);
}

export async function markJobFinished(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  job.finishedAt = Date.now();
  await persistJob(job);
}


