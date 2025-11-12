import React from 'react';

async function fetchResults() {
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`);
  const resp = await fetch(`${origin}/api/results`, { cache: 'no-store' });
  if (!resp.ok) return { submissions: [] as any[] };
  return resp.json();
}

export default async function ResultsPage() {
  const { submissions } = await fetchResults();
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Results</h1>
      <div className="overflow-x-auto bg-white border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 px-3">Submission</th>
              <th className="py-2 px-3">Applicant</th>
              <th className="py-2 px-3">Average</th>
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 px-3">{r.file_name}</td>
                <td className="py-2 px-3">{r.applicant_name || '-'}</td>
                <td className="py-2 px-3">{typeof r.final_average_score === 'number' ? r.final_average_score.toFixed(2) : '-'}</td>
                <td className="py-2 px-3">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2 px-3">
                  <a className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" href={`/results/${r.id}`}>Open</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


