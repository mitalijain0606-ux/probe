import { Card, CardContent } from '@/components/ui/card';
import { LiveIndicator } from '@/components/live-indicator';
import { SummaryCards } from '@/features/dashboard/components/summary-cards';
import { useDashboardSummary } from '@/features/dashboard/hooks/use-dashboard';
import { AddUrlDialog } from '@/features/urls/components/add-url-dialog';
import { BulkUploadDialog } from '@/features/urls/components/bulk-upload-dialog';
import { UrlTable } from '@/features/urls/components/url-table';
import { useUrls } from '@/features/urls/hooks/use-urls';

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: urls, isLoading: urlsLoading, dataUpdatedAt } = useUrls();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor the health and performance of your URLs</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator lastUpdated={dataUpdatedAt} />
          <div className="flex gap-2">
            <BulkUploadDialog />
            <AddUrlDialog />
          </div>
        </div>
      </div>

      <SummaryCards summary={summary} isLoading={summaryLoading} />

      <Card>
        <CardContent className="p-0">
          <UrlTable urls={urls} isLoading={urlsLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
