'use client';

import { useEffect, useState } from 'react';
import { UploadCloud, FileText, Bot, Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type GradeResult = {
  model_name: string;
  score: number;
  feedback: string;
  raw_response?: any;
};

type RubricAverage = {
  rubric_id: string;
  label: string;
  points_possible: number | null;
  avg_score: number;
  num_models: number;
};

type GradingResponse = {
  average_score: number;
  weighted_total?: number;
  rubric_averages?: RubricAverage[];
  results: GradeResult[];
  extracted_applicant_name?: string; // Added for prefilling
  discussion_points?: string[];
};

type ExtractedTextResponse = {
  extractedText: string;
};

function TrainingUploader({ onUploaded }: { onUploaded: () => void }) {
  const [tFile, setTFile] = useState<File | null>(null);
  const [tFinal, setTFinal] = useState<string>('');
  const [tNotes, setTNotes] = useState<string>('');
  const [tLines, setTLines] = useState<string>('');
  const [tLineFile, setTLineFile] = useState<File | null>(null);
  const [tJsonHint, setTJsonHint] = useState<string>('');
  useEffect(()=>{
    if (!tLines.trim()) { setTJsonHint(''); return; }
    try {
      const raw = JSON.parse(tLines);
      let arr: any[] = [];
      if (Array.isArray(raw)) arr = raw;
      else if (raw && Array.isArray(raw.scores)) arr = raw.scores;
      else if (raw && typeof raw === 'object') arr = [raw];
      const count = arr.length || 0;
      setTJsonHint(count ? `Detected ${count} item(s).` : 'No items detected. Expect an array, {scores:[...]}, or single item.');
    } catch {
      setTJsonHint('Invalid JSON. Expect an array, {scores:[...]}, or a single object.');
    }
  }, [tLines]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resultInfo, setResultInfo] = useState<{ example_id?: string; submission_id?: string; parsed?: number } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tFile || !tFinal) { setMsg('File and final score are required'); return; }
    setBusy(true); setMsg('Uploading & processing… This can take ~30–90s for grading.');
    setResultInfo(null);
    const fd = new FormData();
    fd.append('file', tFile);
    fd.append('final_score', tFinal);
    if (tNotes.trim()) fd.append('notes', tNotes.trim());
    if (tLines.trim()) fd.append('line_scores', tLines.trim());
    if (tLineFile) fd.append('line_scores_file', tLineFile);
    try {
      const r = await fetch('/api/training', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setMsg('Training complete.');
      setResultInfo({ example_id: j.example_id, submission_id: j.submission_id, parsed: j.parsed_line_scores_count });
      setTFile(null); setTFinal(''); setTNotes(''); setTLines(''); setTLineFile(null);
      onUploaded();
    } catch (e: any) {
      setMsg(e.message);
    } finally { setBusy(false); }
  };

  const recalibrate = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/training/recalibrate', { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Recalibrate failed');
      setMsg(`Calibrations updated: ${j.updated}`);
    } catch (e: any) {
      setMsg(e.message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6 bg-card p-6 border border-border rounded-md">
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">What happens when you upload a gold example:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>We extract text from the document.</li>
          <li>We generate an embedding and store it for retrieval.</li>
          <li>We grade the document with the configured models and save all rubric lines.</li>
          <li>If you provide line scores (CSV/XLSX or JSON), we save them as ground truth.</li>
        </ul>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">Gold Document</label>
          <label className="mt-1 flex justify-center items-center px-6 pt-8 pb-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-all">
            <div className="text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{tFile ? tFile.name : 'Click to choose PDF/DOCX'}</p>
            </div>
            <input type="file" accept=".pdf,.docx" onChange={(e)=>setTFile(e.target.files?.[0] || null)} className="sr-only" />
          </label>
          <p className="text-xs text-muted-foreground mt-1">We extract text and grade it automatically.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">Final Score (required)</label>
          <input type="number" step="0.01" value={tFinal} onChange={(e)=>setTFinal(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">Notes (optional)</label>
          <input type="text" value={tNotes} onChange={(e)=>setTNotes(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">Line Scores File (CSV/XLSX, optional)</label>
          <label className="mt-1 flex justify-center items-center px-6 pt-8 pb-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-all">
            <div className="text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">{tLineFile ? tLineFile.name : 'Click to choose CSV/XLSX (optional)'}</p>
            </div>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e)=>setTLineFile(e.target.files?.[0] || null)} className="sr-only" />
          </label>
          <p className="text-xs text-muted-foreground mt-1">We auto‑detect rubric IDs and scores per row. Headers optional.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">Line Scores JSON (optional)</label>
          <textarea value={tLines} onChange={(e)=>setTLines(e.target.value)} rows={6} placeholder='[{"rubric_id":"A1","score":1.25}]' className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Use either file upload or JSON. We’ll store rubric gold per item.</p>
          {tJsonHint && <p className="text-xs mt-1 {tJsonHint.startsWith('Invalid') ? 'text-destructive' : 'text-muted-foreground'}">{tJsonHint}</p>}
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <button type="submit" disabled={busy || !tFile || !tFinal} className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">Upload Gold & Grade</button>
        <button type="button" onClick={recalibrate} disabled={busy} className="px-4 py-2 rounded-md border border-border">Recalibrate</button>
        {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
        {msg && <span className="ml-2 text-sm text-muted-foreground">{msg}</span>}
      </div>
      {resultInfo && (
        <div className="mt-3 text-sm text-foreground flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> Example: {resultInfo.example_id}</span>
          <span className="inline-flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> Submission: {resultInfo.submission_id}</span>
          <span className="inline-flex items-center gap-1">Parsed line scores: {typeof resultInfo.parsed === 'number' ? resultInfo.parsed : 0}</span>
        </div>
      )}
    </form>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResponse | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null); // State for extracted text
  const [applicantName, setApplicantName] = useState<string>('');
  const [showModels, setShowModels] = useState<boolean>(false); // collapsed by default

  type SubmissionItem = { id: string; file_name: string; created_at: string; final_average_score: number | null; applicant_name: string | null };
  const [history, setHistory] = useState<SubmissionItem[]>([]);
  const loadHistory = async () => {
    try {
      const r = await fetch('/api/submissions');
      if (!r.ok) return;
      const j = await r.json();
      setHistory(j.submissions || []);
    } catch {}
  };
  useEffect(() => { loadHistory(); }, []);

  const deleteSubmission = async (id: string) => {
    if (!confirm('Delete this submission?')) return;
    try {
      const r = await fetch(`/api/submissions/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      await loadHistory();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const viewSubmission = async (id: string) => {
    try {
      const r = await fetch(`/api/submissions/${id}`);
      if (!r.ok) throw new Error('Failed to load submission');
      const j = await r.json();
      setResult(j);
      setShowModels(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const buildCsv = (rows: RubricAverage[]) => {
    const header = ['rubric_id','label','points_possible','avg_score','num_models'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const cells = [
        r.rubric_id,
        '"' + (r.label || '').replace(/"/g, '""') + '"',
        typeof r.points_possible === 'number' ? r.points_possible.toFixed(2) : '',
        r.avg_score.toFixed(2),
        String(r.num_models)
      ];
      lines.push(cells.join(','));
    }
    return lines.join('\n');
  };

  const downloadCsv = () => {
    if (!result?.rubric_averages) return;
    const csv = buildCsv(result.rubric_averages);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rubric_averages.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCsv = async () => {
    if (!result?.rubric_averages) return;
    const csv = buildCsv(result.rubric_averages);
    try { await navigator.clipboard.writeText(csv); alert('Copied CSV to clipboard'); } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
      setExtractedText(null); // Reset text on new file selection
    }
  };

  const handleTextExtract = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setExtractedText(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong during text extraction');
      }

      const data: ExtractedTextResponse = await response.json();
      setExtractedText(data.extractedText);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setExtractedText(null);

    const formData = new FormData();
    formData.append('file', file);
    if (applicantName.trim()) {
      formData.append('applicant_name', applicantName.trim());
    }

    try {
      // Point back to the final /api/grade endpoint
      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      const data: GradingResponse = await response.json();
      setResult(data); // Set the grading result state

      // Prefill applicant if we got an extracted name and user didn't type one
      if (!applicantName && (data as any).extracted_applicant_name) {
        setApplicantName((data as any).extracted_applicant_name as string);
      }

      // Refresh history after successful submission
      loadHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <header className="text-center space-y-6 mb-12">
          <div className="flex justify-center items-center">
            <img 
              src="/stanford-logo.png" 
              alt="Stanford University" 
              className="h-20 w-auto"
            />
          </div>
          <div className="border-t-2 border-primary pt-6">
            <h1 className="text-3xl sm:text-4xl font-bold font-serif text-primary">
              AI-Powered Grading Tool
            </h1>
            <p className="mt-3 text-base text-muted-foreground font-sans">
              Stanford University Internal Tool
            </p>
          </div>
        </header>

        <div className="bg-card p-8 rounded-lg shadow-md border border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Applicant (optional)
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label htmlFor="file-upload" className="block text-sm font-semibold text-foreground mb-3">
                Upload Document
              </label>
              <label
                htmlFor="file-upload"
                className="mt-1 flex flex-col justify-center items-center px-6 pt-8 pb-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-secondary/50 transition-all"
              >
                <div className="space-y-3 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="flex flex-wrap justify-center gap-1 text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Upload a file</span>
                    <span>or drag and drop</span>
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, DOCX up to 10MB</p>
                </div>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.docx" />
              </label>
              {file && (
                <div className="mt-4 flex items-center justify-center text-sm text-foreground bg-secondary/50 px-4 py-2 rounded-md">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  <span>Selected file: <strong className="font-semibold">{file.name}</strong></span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Grading...
                </>
              ) : 'Grade Document'}
            </button>
            
            {/* --- Remove the extra button --- */}
          </form>
        </div>

        {/* --- Display for Extracted Text --- */}
        {extractedText && (
          <div className="mt-6 p-4 bg-card border border-border rounded-md">
            <h3 className="font-bold text-lg mb-2 text-foreground">Extracted Text:</h3>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground bg-background p-4 rounded-md max-h-96 overflow-y-auto">
              {extractedText}
            </pre>
          </div>
        )}
        {/* --- End New Display --- */}

        {error && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <div>
              <p className="font-bold">Error:</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Re-enable the original results display */}
        {result && (
          <div className="mt-10 space-y-10">
            <div className="bg-card border-2 border-primary/30 rounded-lg text-center p-10 shadow-lg">
              <h2 className="text-xl font-semibold font-serif text-muted-foreground uppercase tracking-wide">Final Average Score</h2>
              <p className="text-7xl font-bold text-primary mt-4 font-serif">
                {result.average_score.toFixed(2)}
              </p>
              {typeof result.weighted_total === 'number' && (
                <p className="mt-2 text-sm text-muted-foreground">Weighted rubric total: {result.weighted_total.toFixed(2)}</p>
              )}
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold font-serif text-primary">Model Breakdown</h3>
              <button
                type="button"
                onClick={() => setShowModels(s => !s)}
                className="mt-2 inline-flex items-center px-3 py-1 text-sm rounded-md border border-border bg-secondary hover:bg-secondary/80 text-foreground"
              >
                {showModels ? 'Hide' : 'Show'} details
              </button>
              <p className="text-sm text-muted-foreground">Scores and feedback from individual AI models</p>
            </div>

            {/* Discussion points (non-scored, rubric G) */}
            {Array.isArray(result.discussion_points) && result.discussion_points.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold font-serif text-primary mb-3">Discussion Points for Presentation</h3>
                <ul className="list-disc pl-6 space-y-2 text-sm text-foreground">
                  {result.discussion_points.slice(0,3).map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {showModels && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.results.map((res, index) => (
                  <div key={index} className="bg-card p-6 rounded-lg shadow-md border border-border hover:shadow-lg transition-shadow">
                    <div className="flex items-center mb-4 pb-4 border-b border-border">
                      <Bot className="h-7 w-7 mr-3 text-primary" />
                      <h4 className="text-lg font-bold font-serif text-foreground">{res.model_name}</h4>
                    </div>
                    <div className="space-y-3">
                      {'score' in res && typeof res.score === 'number' ? (
                        <p className="text-4xl font-bold text-primary my-2 font-serif">{res.score.toFixed(2)}</p>
                      ) : (
                        <p className="text-4xl font-bold text-destructive my-2 font-serif">Error</p>
                      )}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {'feedback' in res ? res.feedback : ('error' in res ? res.error : 'Unknown error')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.rubric_averages && result.rubric_averages.length > 0 && (
              <div className="mt-10">
                <h3 className="text-2xl font-bold font-serif text-primary mb-4 text-center">Rubric Averages</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-card border border-border rounded-md">
                    <thead>
                      <tr className="bg-secondary/40">
                        <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border">ID</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border">Name</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-foreground border-b border-border">Points</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-foreground border-b border-border">Avg Score</th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-foreground border-b border-border">Models</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rubric_averages.map((row) => (
                        <tr key={row.rubric_id} className="hover:bg-secondary/20">
                          <td className="px-3 py-2 text-sm text-foreground border-b border-border">{row.rubric_id}</td>
                          <td className="px-3 py-2 text-sm text-foreground border-b border-border">{row.label}</td>
                          <td className="px-3 py-2 text-sm text-foreground border-b border-border text-right">{typeof row.points_possible === 'number' ? row.points_possible.toFixed(2) : '-'}</td>
                          <td className="px-3 py-2 text-sm text-foreground border-b border-border text-right">{row.avg_score.toFixed(2)}</td>
                          <td className="px-3 py-2 text-sm text-foreground border-b border-border text-right">{row.num_models}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2 justify-end">
                  <button onClick={downloadCsv} className="px-3 py-2 text-sm rounded-md border border-border bg-secondary hover:bg-secondary/80">Download CSV</button>
                  <button onClick={copyCsv} className="px-3 py-2 text-sm rounded-md border border-border bg-secondary hover:bg-secondary/80">Copy CSV</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold font-serif text-primary mb-4">Previous Submissions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-card border border-border rounded-md">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border">Created</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border">Applicant</th>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border">File</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground border-b border-border">Final Avg</th>
                  <th className="px-3 py-2 text-right text-sm font-semibold text-foreground border-b border-border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/20">
                    <td className="px-3 py-2 text-sm text-foreground border-b border-border">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm text-foreground border-b border-border">{s.applicant_name || '-'}</td>
                    <td className="px-3 py-2 text-sm text-foreground border-b border-border">{s.file_name}</td>
                    <td className="px-3 py-2 text-sm text-foreground border-b border-border text-right">{typeof s.final_average_score === 'number' ? s.final_average_score.toFixed(2) : '-'}</td>
                    <td className="px-3 py-2 text-sm text-foreground border-b border-border text-right flex gap-2 justify-end">
                      <button onClick={() => viewSubmission(s.id)} className="px-2 py-1 text-sm rounded-md border border-border hover:bg-secondary/20">View</button>
                      <button onClick={() => deleteSubmission(s.id)} className="px-2 py-1 text-sm rounded-md border border-destructive text-destructive hover:bg-destructive/10">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Training Section */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold font-serif text-primary mb-4">Training (Gold Examples)</h3>
          <TrainingUploader onUploaded={loadHistory} />
        </div>
      </div>
    </main>
  );
}
