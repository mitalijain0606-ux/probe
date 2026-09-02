import React, { useState, useRef } from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const SAMPLE_JSON = `[
  { "name": "Google", "url": "https://www.google.com", "checkInterval": 5 },
  { "name": "GitHub", "url": "https://www.github.com", "checkInterval": 5 },
  { "name": "Wikipedia Missing Page (404 Test)", "url": "https://en.wikipedia.org/saecs/Saweascasce", "checkInterval": 5 }
]`;

export default function JsonImportModal({ isOpen, onClose, onImportCompleted }) {
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target?.result || '');
      setError(null);
      setResult(null);
    };
    reader.onerror = () => {
      setError('Failed to read file from disk');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setError(null);
    setResult(null);

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setError('Invalid JSON syntax. Please verify commas, brackets, and quotes.');
      return;
    }

    if (!Array.isArray(parsed)) {
      setError('JSON root must be an array of URL objects or URL strings.');
      return;
    }

    setLoading(true);
    try {
      const response = await onImportCompleted(parsed);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Import URLs from JSON</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Import Completed Successfully</span>
            </div>
            <p className="mt-1 text-slate-300">
              Added <strong>{result.importedCount}</strong> endpoints. ({result.failedCount} skipped / invalid)
            </p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2 border-t border-emerald-500/20 pt-2 text-[11px] text-rose-300">
                <span className="font-semibold">Items with errors:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err.url || `Item ${err.index + 1}`}: {err.error}</li>
                  ))}
                  {result.errors.length > 3 && (
                    <li>...and {result.errors.length - 3} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* File select drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-center cursor-pointer hover:border-sky-500 hover:bg-slate-950 transition-colors"
          >
            <Upload className="h-6 w-6 text-slate-400 mb-1" />
            <span className="text-xs font-medium text-slate-300">Choose a .json file or click to browse</span>
            <span className="text-[11px] text-slate-500 mt-0.5">Accepts JSON array of URL objects</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,application/json"
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-400">Or paste JSON content directly:</label>
            <button
              type="button"
              onClick={() => { setJsonText(SAMPLE_JSON); setError(null); setResult(null); }}
              className="text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors underline"
            >
              Load sample template
            </button>
          </div>

          <textarea
            rows={7}
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); setError(null); }}
            placeholder={`[\n  { "name": "Google", "url": "https://www.google.com" }\n]`}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || !jsonText.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{loading ? 'Validating & Importing...' : 'Import URLs'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
