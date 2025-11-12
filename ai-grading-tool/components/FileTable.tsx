'use client';

import React from 'react';

type FileRow = {
  name: string;
  size?: number;
  status?: 'Queued' | 'Running' | 'Done' | 'Failed';
  error?: string | null;
};

export default function FileTable({ rows }: { rows: FileRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4">File</th>
            <th className="py-2 pr-4">Size</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r.name}-${idx}`} className="border-t border-gray-200">
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4">{r.size ? `${Math.round(r.size / 1024)} KB` : '-'}</td>
              <td className="py-2 pr-4">
                <span
                  className={{
                    Queued: 'text-gray-500',
                    Running: 'text-blue-600',
                    Done: 'text-green-600',
                    Failed: 'text-red-600',
                  }[r.status || 'Queued']}
                >
                  {r.status || 'Queued'}
                </span>
              </td>
              <td className="py-2">{r.error || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


