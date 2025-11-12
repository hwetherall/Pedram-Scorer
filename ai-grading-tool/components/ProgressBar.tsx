'use client';

import React from 'react';

type ProgressBarProps = {
  value: number; // 0..100
  label?: string;
};

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full">
      {label ? <div className="mb-1 text-sm text-gray-700">{label}</div> : null}
      <div className="w-full h-3 bg-gray-200 rounded">
        <div
          className="h-3 bg-blue-600 rounded"
          style={{ width: `${pct}%`, transition: 'width 300ms ease' }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>
      <div className="mt-1 text-xs text-gray-500">{pct}%</div>
    </div>
  );
}


