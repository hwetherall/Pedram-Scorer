'use client';

import React, { useState } from 'react';

export default function Step2Calibrate() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const onCalibrate = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const resp = await fetch('/api/training/recalibrate', { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Failed to recalibrate');
      setMessage(`Calibration updated for ${json.updated} model/rubric pairs.`);
    } catch (e: any) {
      setError(e?.message || 'Calibration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700">Recompute model calibration using uploaded gold examples.</p>
      <button className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400" onClick={onCalibrate} disabled={loading}>
        {loading ? 'Calibrating…' : 'Calibrate'}
      </button>
      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
      {message ? <div className="text-green-700 text-sm">{message}</div> : null}
    </div>
  );
}


