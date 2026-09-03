export type CheckStatusValue = 'UP' | 'DOWN';

export type CheckErrorType =
  | 'TIMEOUT'
  | 'DNS_FAILURE'
  | 'CONNECTION_REFUSED'
  | 'SSL_ERROR'
  | 'BLOCKED_TARGET'
  | 'INVALID_URL'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface HealthCheckResult {
  url: string;
  status: CheckStatusValue;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: CheckErrorType | null;
  errorMessage: string | null;
  attempts: number;
  checkedAt: Date;
}

export interface HealthCheckOptions {
  timeoutMs?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
  maxRedirects?: number;
}
