'use client';

import { useState } from 'react';
import { UploadCloud, FileText, Bot, Loader2, AlertTriangle } from 'lucide-react';

type GradeResult = {
  model_name: string;
  score: number;
  feedback: string;
  raw_response?: any;
};

type GradingResponse = {
  average_score: number;
  results: GradeResult[];
};

type ExtractedTextResponse = {
  extractedText: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResponse | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null); // State for extracted text

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
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold font-serif text-primary">Model Breakdown</h3>
              <p className="text-sm text-muted-foreground">Scores and feedback from individual AI models</p>
            </div>
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
          </div>
        )}
      </div>
    </main>
  );
}
