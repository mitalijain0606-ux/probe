import { AlertTriangle, CircleCheck, CircleHelp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CheckStatus } from '@/types/api';

export function StatusBadge({ status }: { status: CheckStatus | null }) {
  if (status === 'UP') {
    return (
      <Badge variant="success">
        <CircleCheck className="h-3 w-3" />
        Up
      </Badge>
    );
  }
  if (status === 'DOWN') {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3" />
        Down
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <CircleHelp className="h-3 w-3" />
      Pending
    </Badge>
  );
}
