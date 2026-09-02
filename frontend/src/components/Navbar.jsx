import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, LogOut, RefreshCw, Pause, Play, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar({ isPolling, setIsPolling, refreshNow, isRefreshing }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:border-sky-500/40 transition-colors">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">HealthWatch</span>
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-sky-400 border border-sky-500/20">
                OBSERVABILITY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Reliability & Uptime Monitor</p>
          </div>
        </Link>

        {/* Action Controls & User info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Polling Indicator & Toggle */}
          {setIsPolling && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-xs">
              <span className="flex h-2 w-2 relative">
                {isPolling && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isPolling ? 'bg-emerald-500' : 'bg-slate-500'}`} />
              </span>
              <span className="hidden sm:inline text-slate-300 font-medium">
                {isPolling ? 'Auto-polling (12s)' : 'Polling paused'}
              </span>
              <button
                onClick={() => setIsPolling(!isPolling)}
                className="text-slate-400 hover:text-slate-200 transition-colors ml-1 p-0.5"
                title={isPolling ? 'Pause polling' : 'Resume polling'}
              >
                {isPolling ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
            </div>
          )}

          {/* Refresh button */}
          {refreshNow && (
            <button
              onClick={refreshNow}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              title="Trigger instant refresh"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {/* User Email & Sign Out */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-medium text-slate-200">{user.email}</span>
                <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                  <ShieldCheck className="h-3 w-3" /> Authenticated
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/60 p-1.5 text-xs text-slate-400 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
