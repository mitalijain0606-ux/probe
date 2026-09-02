import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white font-mono">404</h1>
      <h2 className="text-base font-semibold text-slate-200 mt-2">Page Not Found</h2>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        The route you requested does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}
