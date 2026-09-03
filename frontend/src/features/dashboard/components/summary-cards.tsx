import { ArrowDownRight, ArrowUpRight, Gauge, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/types/api';

function SummaryCard({
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

export function SummaryCards({ summary, isLoading }: { summary: DashboardSummary | undefined; isLoading: boolean }) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SummaryCard title="Total URLs" value={String(summary.totalUrls)} icon={<Globe className="h-4 w-4" />} />
      <SummaryCard
        title="Up"
        value={String(summary.up)}
        icon={<ArrowUpRight className="h-4 w-4" />}
        accent="success"
      />
      <SummaryCard
        title="Down"
        value={String(summary.down)}
        icon={<ArrowDownRight className="h-4 w-4" />}
        accent="destructive"
      />
      <SummaryCard title="Uptime" value={`${summary.uptimePct}%`} icon={<Gauge className="h-4 w-4" />} />
    </div>
  );
}
