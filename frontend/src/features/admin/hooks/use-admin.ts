import { useQuery } from '@tanstack/react-query';
import { getAdminOverview, listAllUrls } from '@/services/admin.service';

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin-overview'],
    queryFn: getAdminOverview,
    refetchInterval: 30000,
  });
}

export function useAdminAllUrls() {
  return useQuery({
    queryKey: ['admin-all-urls'],
    queryFn: listAllUrls,
    refetchInterval: 30000,
  });
}
