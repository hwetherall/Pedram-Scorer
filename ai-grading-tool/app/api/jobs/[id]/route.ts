import { NextResponse } from 'next/server';
import { getJob, loadJobFromDisk } from '../../../../lib/jobManager';
import { estimateEtaSeconds } from '../../../../lib/eta';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    let job = getJob(id);
    if (!job) job = await loadJobFromDisk(id) || undefined;
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const etaSeconds = estimateEtaSeconds(job.total, job.completed, job.parallelism, 60);
    return NextResponse.json({ ...job, etaSeconds });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


