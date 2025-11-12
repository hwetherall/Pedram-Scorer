'use client';

import React from 'react';

export default function CopyButtons({ submissionId }: { submissionId: string }) {
  const copyJson = async () => {
    try {
      const resp = await fetch(`/api/results/${submissionId}`, { cache: 'no-store' });
      const json = await resp.json();
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      alert('Copied JSON to clipboard');
    } catch (e) {}
  };

  const copyCsv = async () => {
    try {
      const resp = await fetch(`/api/results/${submissionId}/export?format=csv`, { cache: 'no-store' });
      const text = await resp.text();
      await navigator.clipboard.writeText(text);
      alert('Copied CSV to clipboard');
    } catch (e) {}
  };

  return (
    <div className="flex gap-2">
      <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200" onClick={copyJson}>Copy JSON</button>
      <button className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200" onClick={copyCsv}>Copy CSV</button>
    </div>
  );
}


