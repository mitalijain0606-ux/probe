import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw, Trash2, Bell, BellOff, ArrowRight, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatRelativeTime } from '../utils/formatters';

export default function UrlTable({ urls, onCheckNow, onDelete, checkingIds }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to stop monitoring "${name}"? Check history will be deleted.`)) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (!urls || urls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-base font-medium text-white">No URLs monitored yet</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-400">
          Get started by adding your first HTTP/HTTPS endpoint or import a list of URLs using the JSON upload.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 pl-4 pr-3 sm:pl-6">Endpoint</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="px-3 py-3.5">Latency</th>
              <th className="px-3 py-3.5">Uptime</th>
              <th className="px-3 py-3.5">Schedule</th>
              <th className="px-3 py-3.5">Last Checked</th>
              <th className="px-3 py-3.5">Alerts</th>
              <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {urls.map((item) => {
              const isChecking = checkingIds && checkingIds.has(item.id);
              const isDeleting = deletingId === item.id;

              return (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                  {/* Name & URL */}
                  <td className="py-4 pl-4 pr-3 sm:pl-6">
                    <div className="flex flex-col">
                      <Link
                        to={`/urls/${item.id}`}
                        className="font-semibold text-slate-100 hover:text-sky-400 transition-colors flex items-center gap-1.5"
                      >
                        {item.name}
                        <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400" />
                      </Link>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-slate-300 mt-0.5 truncate max-w-xs sm:max-w-md"
                      >
                        {item.url}
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </a>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <StatusBadge status={item.currentStatus} statusCode={item.statusCode} />
                    {item.errorMessage && (
                      <p className="text-[10px] text-rose-400 mt-1 truncate max-w-[180px]" title={item.errorMessage}>
                        {item.errorMessage}
                      </p>
                    )}
                  </td>

                  {/* Response Time */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    {item.responseTime !== null ? (
                      <span className="font-mono font-medium text-slate-200">
                        {item.responseTime} <span className="text-[10px] text-slate-500">ms</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Uptime % */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-semibold ${item.uptimePercentage >= 99 ? 'text-emerald-400' : item.uptimePercentage >= 90 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {item.uptimePercentage}%
                      </span>
                    </div>
                  </td>

                  {/* Check Interval */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-400">
                    every {item.checkInterval}m
                  </td>

                  {/* Last Checked */}
                  <td className="px-3 py-4 whitespace-nowrap text-slate-400">
                    {formatRelativeTime(item.lastCheckedAt)}
                  </td>

                  {/* Alert Status */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    {item.alertEnabled ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]" title="Email notifications enabled on outage">
                        <Bell className="h-3.5 w-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]" title="Alerts disabled">
                        <BellOff className="h-3.5 w-3.5" />
                        <span>Muted</span>
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-4 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {/* Manual Check Now */}
                      <button
                        onClick={() => onCheckNow(item.id)}
                        disabled={isChecking}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-300 transition-colors disabled:opacity-50"
                        title="Trigger manual health check"
                      >
                        <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin text-sky-400' : ''}`} />
                        <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
                      </button>

                      {/* View Details */}
                      <Link
                        to={`/urls/${item.id}`}
                        className="rounded-lg border border-slate-800 bg-slate-800/60 p-1.5 text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
                        title="View analytics and history"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={isDeleting}
                        className="rounded-lg border border-slate-800 bg-slate-800/60 p-1.5 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition-colors disabled:opacity-50"
                        title="Delete URL"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
