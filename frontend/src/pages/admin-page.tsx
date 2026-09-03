import { ArrowDownRight, ArrowUpRight, Gauge, Globe, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { useAdminOverview, useAdminAllUrls } from '@/features/admin/hooks/use-admin';
import { formatRelativeTime, truncateUrl } from '@/lib/utils';
import type { AdminOverview } from '@/types/api';

function OverviewCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent?: 'success' | 'destructive';
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle>{title}</CardTitle>
        <div
          className={
            accent === 'success'
              ? 'text-success'
              : accent === 'destructive'
                ? 'text-destructive'
                : 'text-muted-foreground'
          }
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function OverviewCards({ overview, isLoading }: { overview: AdminOverview | undefined; isLoading: boolean }) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <OverviewCard title="Total users" value={String(overview.totalUsers)} icon={<Users className="h-4 w-4" />} />
      <OverviewCard title="Total URLs" value={String(overview.totalUrls)} icon={<Globe className="h-4 w-4" />} />
      <OverviewCard
        title="Up"
        value={String(overview.up)}
        icon={<ArrowUpRight className="h-4 w-4" />}
        accent="success"
      />
      <OverviewCard
        title="Down"
        value={String(overview.down)}
        icon={<ArrowDownRight className="h-4 w-4" />}
        accent="destructive"
      />
      <OverviewCard title="Uptime" value={`${overview.uptimePct}%`} icon={<Gauge className="h-4 w-4" />} />
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-sm font-medium">No monitored URLs across the platform yet.</p>
      <p className="text-sm text-muted-foreground">URLs will appear here once users start adding them.</p>
    </div>
  );
}

export function AdminPage() {
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();
  const { data: urls, isLoading: urlsLoading } = useAdminAllUrls();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Platform-wide monitoring across every account</p>
      </div>

      <OverviewCards overview={overview} isLoading={overviewLoading} />

      <Card>
        <CardContent className="p-0">
          {urlsLoading ? (
            <TableSkeleton />
          ) : !urls || urls.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Response time</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Last checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urls.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.label ?? truncateUrl(item.url)}</p>
                      {item.label && <p className="text-xs text-muted-foreground">{truncateUrl(item.url)}</p>}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{item.owner.name}</p>
                      <p className="text-xs text-muted-foreground">{item.owner.email}</p>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
