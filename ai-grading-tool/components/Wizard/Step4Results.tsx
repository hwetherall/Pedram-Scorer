'use client';

import React, { useEffect, useState } from 'react';

export default function Step4Results() {
  const [rows, setRows] = useState<Array<{ id: string; file_name: string; created_at: string; final_average_score: number; letter_grade?: string | null; applicant_name?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await fetch('/api/results');
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Failed to load results');
        setRows(json.submissions || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    try {
      const resp = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Delete failed');
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700">Latest results. Click to open details, copy rubric JSON, or export CSV.</p>
      {loading ? <div className="text-gray-500 text-sm">Loading…</div> : null}
      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-4">Submission</th>
              <th className="py-2 pr-4">Applicant</th>
              <th className="py-2 pr-4">Average</th>
              <th className="py-2 pr-4">Grade</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-200">
                <td className="py-2 pr-4">{r.file_name}</td>
                <td className="py-2 pr-4">{r.applicant_name || '-'}</td>
                <td className="py-2 pr-4">{typeof r.final_average_score === 'number' ? r.final_average_score.toFixed(2) : '-'}</td>
                <td className="py-2 pr-4">{r.letter_grade || '-'}</td>
                <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <a className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" href={`/results/${r.id}`} target="_blank">Open</a>
                    <button
                      className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                      onClick={async () => {
                        const resp = await fetch(`/api/results/${r.id}`);
                        const json = await resp.json();
                        await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
                      }}
                    >
                      Copy JSON
                    </button>
                    <a className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" href={`/api/results/${r.id}/export?format=csv`} target="_blank">Export CSV</a>
                    <button
                      className="px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
                      onClick={() => onDelete(r.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


