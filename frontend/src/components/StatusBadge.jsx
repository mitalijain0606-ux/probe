import React from 'react';

export default function StatusBadge({ status, statusCode, size = 'md' }) {
  const isUp = status === 'UP';
  const isDown = status === 'DOWN';

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs font-semibold';

  if (isUp) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ${sizeClasses}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        UP {statusCode ? `(${statusCode})` : ''}
      </span>
    );
  }

  if (isDown) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 ${sizeClasses}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        DOWN {statusCode ? `(${statusCode})` : ''}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 text-slate-400 ${sizeClasses}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      PENDING
    </span>
  );
}
