import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateTime } from '@/lib/utils';
import type { CheckHistoryEntry } from '@/types/api';

export function ResponseTimeChart({ data }: { data: CheckHistoryEntry[] }) {
  const points = data
    .filter((entry) => entry.responseTimeMs !== null)
    .map((entry) => ({
      time: entry.checkedAt,
      responseTimeMs: entry.responseTimeMs,
    }));

  if (points.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data for this range</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <AreaChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="time"
          tickFormatter={(value: string) => formatDateTime(value)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          unit="ms"
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(value: string) => formatDateTime(value)}
          formatter={(value: number) => [`${value} ms`, 'Response time']}
        />
        <Area
          type="monotone"
          dataKey="responseTimeMs"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#responseTimeGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
