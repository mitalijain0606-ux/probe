import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/status-badge';
import { DeleteUrlDialog } from '@/features/urls/components/delete-url-dialog';
import { useTriggerCheck, useUrl, useUrlHistory } from '@/features/urls/hooks/use-urls';
import { ResponseTimeChart } from '@/features/monitoring/components/response-time-chart';
import { StatusHistory } from '@/features/monitoring/components/status-history';
import { formatRelativeTime } from '@/lib/utils';
import type { HistoryRange } from '@/types/api';

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

export function UrlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<HistoryRange>('24h');

  const { data: url, isLoading } = useUrl(id);
  const { data: history, isLoading: historyLoading } = useUrlHistory(id, range);
  const triggerCheck = useTriggerCheck();

  if (isLoading || !url) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{url.label ?? url.url}</h1>
              <StatusBadge status={url.currentStatus} />
            </div>
            <a href={url.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:underline">
              {url.url}
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => triggerCheck.mutate(url.id)} disabled={triggerCheck.isPending}>
            <RefreshCw className="h-4 w-4" />
            Check now
          </Button>
          <DeleteUrlDialog id={url.id} url={url.url} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Current latency" value={url.currentResponseTimeMs !== null ? `${url.currentResponseTimeMs} ms` : '—'} />
        <StatTile label="HTTP status" value={url.currentStatusCode !== null ? String(url.currentStatusCode) : '—'} />
        <StatTile label="Uptime" value={`${url.uptimePct}%`} />
        <StatTile label="Total checks" value={String(url.totalChecks)} />
        <StatTile label="Failures" value={String(url.failures)} />
        <StatTile label="Avg response" value={url.averageResponseTimeMs !== null ? `${url.averageResponseTimeMs} ms` : '—'} />
      </div>

      <p className="text-xs text-muted-foreground">
        Last checked: {url.lastCheckedAt ? formatRelativeTime(url.lastCheckedAt) : 'Never'}
      </p>

      <Tabs value={range} onValueChange={(value) => setRange(value as HistoryRange)}>
        <TabsList>
          {RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Response time</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? <Skeleton className="h-64 w-full" /> : <ResponseTimeChart data={history ?? []} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? <Skeleton className="h-16 w-full" /> : <StatusHistory data={history ?? []} />}
        </CardContent>
      </Card>
    </div>
  );
}
