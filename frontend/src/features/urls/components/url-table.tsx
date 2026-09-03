import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { DeleteUrlDialog } from '@/features/urls/components/delete-url-dialog';
import { useTriggerCheck } from '@/features/urls/hooks/use-urls';
import { formatRelativeTime, truncateUrl } from '@/lib/utils';
import type { MonitoredUrl } from '@/types/api';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium">No monitored URLs yet.</p>
      <p className="text-sm text-muted-foreground">Add your first URL to start monitoring.</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function UrlTable({ urls, isLoading }: { urls: MonitoredUrl[] | undefined; isLoading: boolean }) {
  const triggerCheck = useTriggerCheck();

  if (isLoading) return <TableSkeleton />;
  if (!urls || urls.length === 0) return <EmptyState />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>URL</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>HTTP</TableHead>
          <TableHead>Response time</TableHead>
          <TableHead>Uptime</TableHead>
          <TableHead>Last checked</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {urls.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Link to={`/urls/${item.id}`} className="font-medium hover:underline">
                {item.label ?? truncateUrl(item.url)}
              </Link>
              {item.label && <p className="text-xs text-muted-foreground">{truncateUrl(item.url)}</p>}
            </TableCell>
            <TableCell>
              <StatusBadge status={item.currentStatus} />
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {item.currentStatusCode ?? '—'}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {item.currentResponseTimeMs !== null ? `${item.currentResponseTimeMs} ms` : '—'}
            </TableCell>
            <TableCell className="font-mono text-xs">{item.uptimePct}%</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {item.lastCheckedAt ? formatRelativeTime(item.lastCheckedAt) : 'Never'}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Check now"
                  disabled={triggerCheck.isPending}
                  onClick={() => triggerCheck.mutate(item.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <DeleteUrlDialog id={item.id} url={item.url} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
