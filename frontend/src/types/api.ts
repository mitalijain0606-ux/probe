export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export type CheckStatus = 'UP' | 'DOWN';

export type ErrorType =
  | 'TIMEOUT'
  | 'DNS_FAILURE'
  | 'CONNECTION_REFUSED'
  | 'SSL_ERROR'
  | 'BLOCKED_TARGET'
  | 'INVALID_URL'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'
  | null;

export interface MonitoredUrl {
  id: string;
  url: string;
  label: string | null;
  isActive: boolean;
  intervalSec: number;
  createdAt: string;
  updatedAt: string;
  currentStatus: CheckStatus | null;
  currentStatusCode: number | null;
  currentResponseTimeMs: number | null;
  lastErrorType: ErrorType;
  lastCheckedAt: string | null;
  totalChecks: number;
  failures: number;
  uptimePct: number;
  averageResponseTimeMs: number | null;
}

export interface CheckHistoryEntry {
  id: string;
  status: CheckStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: ErrorType;
  errorMessage: string | null;
  checkedAt: string;
}

export interface DashboardSummary {
  totalUrls: number;
  up: number;
  down: number;
  unknown: number;
  uptimePct: number;
  failures: number;
  averageResponseTimeMs: number | null;
}

export interface AdminOverview {
  totalUsers: number;
  totalUrls: number;
  up: number;
  down: number;
  unknown: number;
  uptimePct: number;
  failures: number;
  averageResponseTimeMs: number | null;
}

export interface AdminMonitoredUrl extends MonitoredUrl {
  owner: { id: string; name: string; email: string };
}

export type HistoryRange = '1h' | '24h' | '7d' | '30d';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
