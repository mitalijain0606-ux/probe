import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AddUrlModal({ isOpen, onClose, onUrlAdded }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [checkInterval, setCheckInterval] = useState(5);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setLoading(true);
    try {
      await onUrlAdded({
        name: name.trim(),
        url: cleanUrl,
        checkInterval: parseInt(checkInterval, 10),
        alertEnabled,
      });
      setName('');
      setUrl('');
      setCheckInterval(5);
      setAlertEnabled(true);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Add Monitored Endpoint</h3>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Friendly Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Primary Payment Gateway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target URL</label>
            <input
              type="text"
              required
              placeholder="https://api.example.com/health"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Only public HTTP/HTTPS endpoints are accepted (internal & localhost targets blocked by SSRF filter).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Check Frequency</label>
              <select
                value={checkInterval}
                onChange={(e) => setCheckInterval(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value={1}>Every 1 minute</option>
                <option value={2}>Every 2 minutes</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>

            <div className="flex flex-col justify-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={(e) => setAlertEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
                />
                <span>Email alerts on DOWN</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-sky-600 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? 'Adding & Checking...' : 'Add Endpoint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
