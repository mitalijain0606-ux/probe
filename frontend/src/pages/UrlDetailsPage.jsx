import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Trash2,
  Bell,
  BellOff,
  Clock,
  Percent,
  AlertTriangle,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import ResponseTimeChart from '../components/ResponseTimeChart';
import { urlService } from '../services/urlService';
import { formatDate } from '../utils/formatters';

export default function UrlDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [urlData, setUrlData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadUrlDetails = useCallback(async () => {
    try {
      const [details, recentHistory] = await Promise.all([
        urlService.getUrlById(id),
        urlService.getUrlHistory(id, 60),
      ]);
      setUrlData(details);
      setHistory(recentHistory);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUrlDetails();
  }, [loadUrlDetails]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const checkResult = await urlService.manualCheck(id);
      showToast(`Ping completed: ${checkResult.status} (${checkResult.responseTime}ms)`, checkResult.status === 'UP' ? 'success' : 'error');
      await loadUrlDetails();
    } catch (err) {
      showToast(err.response?.data?.message || 'Check failed', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to stop monitoring "${urlData?.name}"?`)) {
      try {
        await urlService.deleteUrl(id);
        navigate('/');
      } catch (err) {
        showToast(err.response?.data?.message || 'Delete failed', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400 flex items-center gap-2 text-xs">
            <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
            <span>Loading telemetry data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!urlData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
          <h2 className="text-lg font-semibold text-white">Endpoint Not Found</h2>
          <p className="text-xs text-slate-400 mt-1">This monitored URL does not exist or has been deleted.</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      {/* Toast message */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-md text-xs">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span className="font-medium text-slate-200">{toast.message}</span>
        </div>
      )}

      <main className="mx-auto max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6 w-full">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
              title="Return to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white">{urlData.name}</h1>
                <StatusBadge status={urlData.currentStatus} statusCode={urlData.statusCode} size="sm" />
              </div>
              <a
                href={urlData.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:underline mt-0.5"
              >
                <span>{urlData.url}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
            </button>

            <button
              onClick={handleDelete}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              title="Delete URL"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Uptime %</span>
              <Percent className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-white">
              {urlData.uptimePercentage}%
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Calculated over {urlData.totalChecks} checks</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Avg Latency</span>
              <Clock className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-white">
              {urlData.avgResponseTime} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Average roundtrip time</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Outages / Failures</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-white">
              {urlData.failureCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Checks marked as DOWN</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Monitoring Settings</span>
              {urlData.alertEnabled ? <Bell className="h-4 w-4 text-emerald-400" /> : <BellOff className="h-4 w-4 text-slate-500" />}
            </div>
            <div className="mt-2 text-xs font-medium text-white space-y-1">
              <div>Frequency: <span className="font-mono text-sky-400">every {urlData.checkInterval}m</span></div>
              <div>Alerts: <span className={urlData.alertEnabled ? 'text-emerald-400' : 'text-slate-500'}>{urlData.alertEnabled ? 'Enabled' : 'Muted'}</span></div>
            </div>
          </div>
        </div>

        {/* Latency History Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Response Time Telemetry (ms)</h2>
            </div>
            <span className="text-xs text-slate-500">Last {history.length} checks</span>
          </div>

          <ResponseTimeChart history={history} />
        </div>

        {/* Check History Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm overflow-hidden">
          <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Health Check Logs</h2>
            <span className="text-xs text-slate-400 font-mono">Showing {history.length} events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 pl-5 pr-3">Timestamp</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">HTTP Code</th>
                  <th className="px-3 py-3">Latency</th>
                  <th className="py-3 pl-3 pr-5">Error / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No check records found yet. Click "Check Now" to record the first ping.
                    </td>
                  </tr>
                ) : (
                  history.map((chk) => (
                    <tr key={chk.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 pl-5 pr-3 font-mono text-slate-400 whitespace-nowrap">
                        {formatDate(chk.checkedAt)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={chk.status} size="sm" />
                      </td>
                      <td className="px-3 py-3 font-mono whitespace-nowrap">
                        {chk.statusCode ? (
                          <span className={chk.statusCode >= 200 && chk.statusCode < 300 ? 'text-emerald-400' : 'text-rose-400'}>
                            {chk.statusCode}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono whitespace-nowrap">
                        {chk.responseTime} ms
                      </td>
                      <td className="py-3 pl-3 pr-5 text-slate-400">
                        {chk.errorMessage ? (
                          <span className="text-rose-400 font-mono text-[11px]">{chk.errorMessage}</span>
                        ) : (
                          <span className="text-slate-500">Success</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
