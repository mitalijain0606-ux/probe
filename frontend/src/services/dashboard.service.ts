import { http } from './http';
import type { ApiSuccess, DashboardSummary } from '@/types/api';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await http.get<ApiSuccess<DashboardSummary>>('/dashboard/summary');
  return data.data;
}
