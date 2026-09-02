import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatDate } from '../utils/formatters';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.status === 'UP';

    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl text-xs backdrop-blur-sm">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`h-2 w-2 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="font-semibold text-white">
            {data.status} {data.statusCode ? `(${data.statusCode})` : ''}
          </span>
        </div>
        <p className="text-slate-300 font-mono">
          Response Time: <strong className="text-sky-400">{data.responseTime} ms</strong>
        </p>
        {data.errorMessage && (
          <p className="text-rose-400 mt-1 max-w-[200px] truncate">{data.errorMessage}</p>
        )}
        <p className="text-[10px] text-slate-500 mt-1">{formatDate(data.checkedAt)}</p>
      </div>
    );
  }
  return null;
}

export default function ResponseTimeChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-500">
        No latency data recorded yet.
      </div>
    );
  }

  // Reverse so chronological order flows left-to-right
  const chartData = [...history].reverse().map(item => ({
    ...item,
    timeLabel: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(item.checkedAt)),
  }));

  return (
    <div className="space-y-4">
      {/* Response time area chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="responseTime"
              stroke="#38bdf8"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Visual UP/DOWN Timeline Strip */}
      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <span>Recent Status Timeline ({chartData.length} checks)</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500 inline-block" /> UP</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500 inline-block" /> DOWN</span>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto py-1">
          {chartData.map((chk, i) => (
            <div
              key={chk.id || i}
              title={`${chk.timeLabel} - ${chk.status} (${chk.responseTime}ms)`}
              className={`h-5 w-2 flex-shrink-0 rounded-sm transition-transform hover:scale-125 cursor-pointer ${chk.status === 'UP' ? 'bg-emerald-500/80 hover:bg-emerald-400' : 'bg-rose-500/90 hover:bg-rose-400'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
