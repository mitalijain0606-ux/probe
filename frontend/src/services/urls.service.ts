import { http } from './http';
import type { ApiSuccess, CheckHistoryEntry, HistoryRange, MonitoredUrl } from '@/types/api';

export async function listUrls(): Promise<MonitoredUrl[]> {
  const { data } = await http.get<ApiSuccess<MonitoredUrl[]>>('/urls');
  return data.data;
}

export async function getUrl(id: string): Promise<MonitoredUrl> {
  const { data } = await http.get<ApiSuccess<MonitoredUrl>>(`/urls/${id}`);
  return data.data;
}

export async function createUrl(input: { url: string; label?: string }): Promise<MonitoredUrl> {
  const { data } = await http.post<ApiSuccess<MonitoredUrl>>('/urls', input);
  return data.data;
}

export interface BulkUploadResult {
  created: number;
  skipped: number;
  errors: Array<{ url: string; message: string }>;
}

export async function bulkUploadUrls(urls: string[]): Promise<BulkUploadResult> {
  const { data } = await http.post<ApiSuccess<BulkUploadResult>>('/urls/bulk', { urls });
  return data.data;
}

export async function deleteUrl(id: string): Promise<void> {
  await http.delete(`/urls/${id}`);
}

export async function triggerCheck(id: string): Promise<{ jobId: string }> {
  const { data } = await http.post<ApiSuccess<{ jobId: string }>>(`/urls/${id}/check`);
  return data.data;
}

export async function getHistory(id: string, range: HistoryRange): Promise<CheckHistoryEntry[]> {
  const { data } = await http.get<ApiSuccess<CheckHistoryEntry[]>>(`/urls/${id}/history`, {
    params: { range },
  });
  return data.data;
}
