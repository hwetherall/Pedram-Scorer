import React from 'react';
import CopyButtons from '../../../components/CopyButtons';

async function fetchDetail(id: string) {
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`);
  const resp = await fetch(`${origin}/api/results/${id}`, { cache: 'no-store' });
  if (!resp.ok) return null as any;
  return resp.json();
}

export default async function ResultDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const data = await fetchDetail(submissionId);
  if (!data) return <div className="max-w-4xl mx-auto p-6">Not found</div>;
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Submission {submissionId}</h1>
      <div className="bg-white border rounded p-4">
        <h2 className="font-medium mb-2">Summary</h2>
        <div className="text-sm text-gray-700">Average score: {typeof data.average_score === 'number' ? data.average_score.toFixed(2) : '-'}</div>
        <div className="text-sm text-gray-700">Weighted total: {typeof data.weighted_total === 'number' ? data.weighted_total.toFixed(2) : '-'}</div>
        <div className="text-sm text-gray-700">Letter grade: <span className="font-semibold">{data.letter_grade || '-'}</span></div>
        <div className="mt-2 flex gap-2">
          <a className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200" href={`/api/results/${submissionId}`} target="_blank">Open JSON</a>
          <a className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200" href={`/api/results/${submissionId}/export?format=csv`} target="_blank">Export CSV</a>
          <CopyButtons submissionId={submissionId} />
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <h2 className="font-medium mb-2">Rubric Averages</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Rubric</th>
                <th className="py-2 pr-4">Points</th>
                <th className="py-2 pr-4">Avg Score</th>
                <th className="py-2">Models</th>
              </tr>
            </thead>
            <tbody>
              {(data.rubric_averages || []).map((r: any) => (
                <tr key={r.rubric_id} className="border-t">
                  <td className="py-2 pr-4">{r.rubric_id} — {r.label}</td>
                  <td className="py-2 pr-4">{r.points_possible ?? '-'}</td>
                  <td className="py-2 pr-4">{typeof r.avg_score === 'number' ? r.avg_score.toFixed(2) : '-'}</td>
                  <td className="py-2">{r.num_models}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <h2 className="font-medium mb-2">Per-Model</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {(data.results || []).map((g: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="py-2 pr-4">{g.model_name}</td>
                  <td className="py-2 pr-4">{typeof g.score === 'number' ? g.score.toFixed(2) : '-'}</td>
                  <td className="py-2 pr-4 whitespace-pre-wrap">{g.feedback || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// end of file


