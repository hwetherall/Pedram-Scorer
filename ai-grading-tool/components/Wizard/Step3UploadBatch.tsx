'use client';

import React, { useEffect, useMemo, useState } from 'react';
import UploadDropzone from '../UploadDropzone';
import FileTable from '../FileTable';
import ProgressBar from '../ProgressBar';

type JobStatus = {
  id: string;
  total: number;
  completed: number;
  failed: number;
  items: Array<{ id: string; fileName: string; status: 'Queued' | 'Running' | 'Done' | 'Failed'; error?: string | null }>;
  etaSeconds: number;
};

export default function Step3UploadBatch() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endAtMs, setEndAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const rows = useMemo(() => {
    if (status) {
      return status.items.map((i) => ({ name: i.fileName, status: i.status, error: i.error || null }));
    }
    return files.map((f) => ({ name: f.name, size: f.size, status: 'Queued' as const }));
  }, [files, status]);

  useEffect(() => {
    if (!jobId) return;
    const t = setInterval(async () => {
      try {
        const resp = await fetch(`/api/jobs/${jobId}`);
        if (!resp.ok) return;
        const json = await resp.json();
        setStatus(json);
        if (json && typeof json.etaSeconds === 'number' && (json.completed + json.failed) < json.total) {
          // Rebase end time using server ETA while job is in progress
          setEndAtMs(Date.now() + Math.max(0, Number(json.etaSeconds)) * 1000);
        }
        if (json.completed + json.failed >= json.total) {
          clearInterval(t);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(t);
  }, [jobId]);

  // Smooth timer to animate progress between polls
  useEffect(() => {
    if (!jobId) return;
    const tick = setInterval(() => setNowMs(Date.now()), 300);
    return () => clearInterval(tick);
  }, [jobId]);

  const onStart = async () => {
    setStarting(true);
    setError('');
    try {
      if (!files.length) throw new Error('Please add files first.');
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      const resp = await fetch('/api/score/batch', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to start batch');
      setJobId(json.jobId);
      setStatus(null);
      const now = Date.now();
      setStartedAtMs(now);
      // Default to 60s end if server ETA not yet known
      setEndAtMs(now + 60_000);
    } catch (e: any) {
      setError(e?.message || 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  const actualPct = status ? Math.round(((status.completed + status.failed) / status.total) * 100) : 0;
  // Optimistic progress based on timer (cap at 99 until complete)
  let optimisticPct = 0;
  if (startedAtMs && endAtMs) {
    const denom = Math.max(1, endAtMs - startedAtMs);
    const ratio = Math.max(0, Math.min(1, (nowMs - startedAtMs) / denom));
    optimisticPct = Math.min(99, Math.round(ratio * 100));
  }
  const jobDone = !!status && (status.completed + status.failed >= status.total);
  const pct = jobDone ? 100 : Math.max(actualPct, optimisticPct);
  const eta = status ? status.etaSeconds : (endAtMs && nowMs ? Math.max(0, Math.round((endAtMs - nowMs) / 1000)) : 0);

  return (
    <div className="space-y-4">
      <p className="text-gray-700">Upload multiple submissions and start scoring. ETA assumes 60s/submission with parallelism of 4.</p>
      <UploadDropzone multiple accept=".pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onFiles={(f) => setFiles((prev) => [...prev, ...f])} />
      {rows.length ? <FileTable rows={rows} /> : null}
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400" onClick={onStart} disabled={starting || !files.length}>
          {starting ? 'Starting…' : 'Start Scoring'}
        </button>
        {status ? <div className="text-sm text-gray-600">ETA: ~{eta}s</div> : null}
      </div>
      {status ? <ProgressBar value={pct} label={`Progress: ${status.completed + status.failed}/${status.total}`} /> : null}
      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
    </div>
  );
}


