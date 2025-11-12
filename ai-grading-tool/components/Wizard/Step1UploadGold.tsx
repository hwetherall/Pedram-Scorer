'use client';

import React, { useState } from 'react';
import UploadDropzone from '../UploadDropzone';

export default function Step1UploadGold() {
  const [docFile, setDocFile] = useState<File | null>(null);
  const [lineScoresFile, setLineScoresFile] = useState<File | null>(null);
  const [lineScoresJson, setLineScoresJson] = useState<string>('');
  const [finalScore, setFinalScore] = useState<string>('');
  const [trainingSet, setTrainingSet] = useState<string>('default');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const onSubmit = async () => {
    setSubmitting(true);
    setError('');
    setResult('');
    try {
      if (!docFile) {
        setError('Please upload a gold example document (PDF or DOCX).');
        return;
      }
      if (!finalScore || !Number.isFinite(Number(finalScore))) {
        setError('Please provide a numeric final score.');
        return;
      }
      const fd = new FormData();
      fd.append('file', docFile);
      fd.append('final_score', finalScore);
      fd.append('training_set_name', trainingSet);
      if (notes.trim()) fd.append('notes', notes.trim());
      if (lineScoresFile) fd.append('line_scores_file', lineScoresFile);
      else if (lineScoresJson.trim()) fd.append('line_scores', lineScoresJson.trim());
      const resp = await fetch('/api/training', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Upload failed');
      setResult(`Added example ${json.example_id}, training submission ${json.submission_id}, parsed lines: ${json.parsed_line_scores_count}`);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-700">Upload a gold example and its scores to calibrate grading.</p>
      <div>
        <div className="mb-2 font-medium">1) Gold document (PDF or DOCX)</div>
        <UploadDropzone
          multiple={false}
          accept=".pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onFiles={(f) => setDocFile(f[0] || null)}
          label={docFile ? `Selected: ${docFile.name}` : undefined}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Training set name</label>
          <input className="w-full border rounded px-3 py-2" value={trainingSet} onChange={(e) => setTrainingSet(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Final score</label>
          <input className="w-full border rounded px-3 py-2" placeholder="e.g. 27.55" value={finalScore} onChange={(e) => setFinalScore(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
        <textarea className="w-full border rounded px-3 py-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div>
        <div className="mb-2 font-medium">2) Line-by-line scores (optional)</div>
        <UploadDropzone multiple={false} accept=".xlsx,.csv" onFiles={(f) => setLineScoresFile(f[0] || null)} label={lineScoresFile ? `Selected: ${lineScoresFile.name}` : undefined} />
        <div className="my-2 text-sm text-gray-500">— or paste JSON of scores —</div>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={5}
          placeholder='Example: [{"rubric_id":"A1","score":5,"justification":"..."}]'
          value={lineScoresJson}
          onChange={(e) => setLineScoresJson(e.target.value)}
        />
      </div>
      <div className="pt-2">
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Uploading…' : 'Upload Gold Example'}
        </button>
      </div>
      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
      {result ? <div className="text-green-700 text-sm">{result}</div> : null}
    </div>
  );
}


