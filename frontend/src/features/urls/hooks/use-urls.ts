import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as urlsService from '@/services/urls.service';
import type { HistoryRange } from '@/types/api';

export function useUrls() {
  return useQuery({
    queryKey: ['urls'],
    queryFn: urlsService.listUrls,
    refetchInterval: 30000,
  });
}

export function useUrl(id: string | undefined) {
  return useQuery({
    queryKey: ['url', id],
    queryFn: () => urlsService.getUrl(id as string),
    enabled: Boolean(id),
    refetchInterval: 30000,
  });
}

export function useUrlHistory(id: string | undefined, range: HistoryRange) {
  return useQuery({
    queryKey: ['url-history', id, range],
    queryFn: () => urlsService.getHistory(id as string, range),
    enabled: Boolean(id),
  });
}

export function useCreateUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: urlsService.createUrl,
    onSuccess: () => {
      toast.success('URL added to monitoring');
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useBulkUploadUrls() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: urlsService.bulkUploadUrls,
    onSuccess: (result) => {
      toast.success(`${result.created} URL${result.created === 1 ? '' : 's'} added`, {
        description: result.errors.length ? `${result.errors.length} entries were invalid and skipped` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: urlsService.deleteUrl,
    onSuccess: () => {
      toast.success('URL removed');
      queryClient.invalidateQueries({ queryKey: ['urls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useTriggerCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: urlsService.triggerCheck,
    onSuccess: () => {
      toast.success('Check queued');
      queryClient.invalidateQueries({ queryKey: ['urls'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
