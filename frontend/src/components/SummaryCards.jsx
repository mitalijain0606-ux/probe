import React from 'react';
import { Globe, ArrowUpCircle, ArrowDownCircle, Percent, Clock, AlertTriangle } from 'lucide-react';

export default function SummaryCards({ stats, loading }) {
  const cards = [
    {
      title: 'Monitored URLs',
      value: stats?.totalUrls ?? 0,
      icon: Globe,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      subtext: `${stats?.urlsPending ?? 0} awaiting check`,
    },
    {
      title: 'Endpoints UP',
      value: stats?.urlsUp ?? 0,
      icon: ArrowUpCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      subtext: 'Healthy & responding',
    },
    {
      title: 'Endpoints DOWN',
      value: stats?.urlsDown ?? 0,
      icon: ArrowDownCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      subtext: stats?.urlsDown > 0 ? 'Action required' : 'All clear',
    },
    {
      title: 'Overall Uptime',
      value: `${stats?.overallUptime ?? 100}%`,
      icon: Percent,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      subtext: 'Check-based uptime',
    },
    {
      title: 'Avg Response Time',
      value: `${stats?.avgResponseTime ?? 0} ms`,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      subtext: 'Across all active checks',
    },
    {
      title: 'Total Failures',
      value: stats?.totalFailures ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      subtext: 'Cumulative outage events',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 sm:p-4 hover:border-slate-700/80 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400 truncate">{card.title}</span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${card.bgColor} ${card.borderColor} ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                {loading ? '...' : card.value}
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
