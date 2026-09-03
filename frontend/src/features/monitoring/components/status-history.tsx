import { formatDateTime } from '@/lib/utils';
import type { CheckHistoryEntry } from '@/types/api';

export function StatusHistory({ data }: { data: CheckHistoryEntry[] }) {
  if (data.length === 0) {
    return <p className="flex h-16 items-center justify-center text-sm text-muted-foreground">No checks recorded yet</p>;
  }

  const recent = data.slice(-120);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-8 gap-[2px]">
        {recent.map((entry) => (
          <div
            key={entry.id}
            title={`${entry.status} · ${formatDateTime(entry.checkedAt)}${entry.errorMessage ? ` · ${entry.errorMessage}` : ''}`}
            className={`flex-1 rounded-sm ${entry.status === 'UP' ? 'bg-success' : 'bg-destructive'}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDateTime(recent[0]!.checkedAt)}</span>
        <span>{formatDateTime(recent[recent.length - 1]!.checkedAt)}</span>
      </div>
    </div>
  );
}
