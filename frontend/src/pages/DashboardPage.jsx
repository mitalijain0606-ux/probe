import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import SummaryCards from '../components/SummaryCards';
import UrlTable from '../components/UrlTable';
import AddUrlModal from '../components/AddUrlModal';
import JsonImportModal from '../components/JsonImportModal';
import { urlService } from '../services/urlService';
import { usePolling } from '../hooks/usePolling';

export default function DashboardPage() {
  const [urls, setUrls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [checkingIds, setCheckingIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [fetchedUrls, fetchedStats] = await Promise.all([
        urlService.getUrls(),
        urlService.getDashboardStats(),
      ]);
      setUrls(fetchedUrls);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic polling every 12 seconds
  const { isPolling, setIsPolling, refreshNow } = usePolling(() => loadData(false), 12000, true);

  // Manual check for single URL
  const handleCheckNow = async (id) => {
    setCheckingIds(prev => new Set(prev).add(id));
    try {
      const result = await urlService.manualCheck(id);
      showToast(`Checked ${result.status} (${result.responseTime}ms)`, result.status === 'UP' ? 'success' : 'error');
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Check failed', 'error');
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Delete URL
  const handleDelete = async (id) => {
    try {
      await urlService.deleteUrl(id);
      showToast('Endpoint removed from monitoring', 'success');
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete URL', 'error');
    }
  };

  // Callback when a single URL is added
  const handleUrlAdded = async (newUrlData) => {
    await urlService.createUrl(newUrlData);
    showToast('Endpoint added and initial check scheduled', 'success');
    await loadData();
  };

  // Callback when bulk import finishes
  const handleImportCompleted = async (urlArray) => {
    const result = await urlService.importUrls(urlArray);
    await loadData();
    return result;
  };

  // Filter URLs based on search query and status filter
  const filteredUrls = urls.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'UP') return matchesSearch && item.currentStatus === 'UP';
    if (statusFilter === 'DOWN') return matchesSearch && item.currentStatus === 'DOWN';
    if (statusFilter === 'PENDING') return matchesSearch && item.currentStatus === 'PENDING';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        isPolling={isPolling}
        setIsPolling={setIsPolling}
        refreshNow={() => loadData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Toast notifications */}
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
        {/* Page Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">System Observability</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time uptime, response latency, and health telemetry for your registered endpoints.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-850 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Upload className="h-3.5 w-3.5 text-sky-400" />
              <span>Import JSON</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Endpoint</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics */}
        <SummaryCards stats={stats} loading={loading} />

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter endpoints by name or URL..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-1 text-xs">
            {['ALL', 'UP', 'DOWN', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${statusFilter === status ? 'bg-slate-800 text-sky-400 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* URLs Table */}
        <UrlTable
          urls={filteredUrls}
          onCheckNow={handleCheckNow}
          onDelete={handleDelete}
          checkingIds={checkingIds}
        />
      </main>

      {/* Add URL Modal */}
      <AddUrlModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUrlAdded={handleUrlAdded}
      />

      {/* Import JSON Modal */}
      <JsonImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={handleImportCompleted}
      />
    </div>
  );
}
