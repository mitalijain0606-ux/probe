import { http } from './http';
import type { AdminMonitoredUrl, AdminOverview, ApiSuccess } from '@/types/api';

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data } = await http.get<ApiSuccess<AdminOverview>>('/dashboard/admin/overview');
  return data.data;
}

export async function listAllUrls(): Promise<AdminMonitoredUrl[]> {
  const { data } = await http.get<ApiSuccess<AdminMonitoredUrl[]>>('/urls/admin/all');
  return data.data;
}
