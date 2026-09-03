import type { CheckErrorType } from './health-check.types.js';

const CODE_MAP: Record<string, CheckErrorType> = {
  ENOTFOUND: 'DNS_FAILURE',
  EAI_AGAIN: 'DNS_FAILURE',
  EAI_NODATA: 'DNS_FAILURE',
  ECONNREFUSED: 'CONNECTION_REFUSED',
  ECONNRESET: 'NETWORK_ERROR',
  EHOSTUNREACH: 'NETWORK_ERROR',
  ENETUNREACH: 'NETWORK_ERROR',
  EPIPE: 'NETWORK_ERROR',
  EPROTO: 'SSL_ERROR',
  ETIMEDOUT: 'TIMEOUT',
  UND_ERR_CONNECT_TIMEOUT: 'TIMEOUT',
  UND_ERR_HEADERS_TIMEOUT: 'TIMEOUT',
  UND_ERR_BODY_TIMEOUT: 'TIMEOUT',
  UND_ERR_SOCKET: 'NETWORK_ERROR',
  CERT_HAS_EXPIRED: 'SSL_ERROR',
  DEPTH_ZERO_SELF_SIGNED_CERT: 'SSL_ERROR',
  SELF_SIGNED_CERT_IN_CHAIN: 'SSL_ERROR',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'SSL_ERROR',
  ERR_TLS_CERT_ALTNAME_INVALID: 'SSL_ERROR',
};

interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  cause?: unknown;
}

function collectCodes(error: unknown, depth = 0): string[] {
  if (!error || typeof error !== 'object' || depth > 4) return [];
  const candidate = error as ErrorLike;
  const codes: string[] = [];
  if (typeof candidate.code === 'string') codes.push(candidate.code);
  if (typeof candidate.name === 'string') codes.push(candidate.name);
  return [...codes, ...collectCodes(candidate.cause, depth + 1)];
}

function collectMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export function classifyError(error: unknown): { errorType: CheckErrorType; message: string } {
  const message = collectMessage(error);
  const codes = collectCodes(error);

  if (codes.includes('AbortError') || codes.includes('TimeoutError')) {
    return { errorType: 'TIMEOUT', message: 'Request timed out' };
  }

  for (const code of codes) {
    const mapped = CODE_MAP[code];
    if (mapped) return { errorType: mapped, message };
  }

  const lowered = message.toLowerCase();
  if (lowered.includes('timeout') || lowered.includes('timed out')) {
    return { errorType: 'TIMEOUT', message };
  }
  if (lowered.includes('getaddrinfo') || lowered.includes('dns')) {
    return { errorType: 'DNS_FAILURE', message };
  }
  if (lowered.includes('certificate') || lowered.includes('ssl') || lowered.includes('tls')) {
    return { errorType: 'SSL_ERROR', message };
  }
  if (lowered.includes('redirect')) {
    return { errorType: 'NETWORK_ERROR', message };
  }
  if (lowered.includes('fetch failed')) {
    return { errorType: 'NETWORK_ERROR', message };
  }

  return { errorType: 'UNKNOWN', message };
}

export function isRetryable(errorType: CheckErrorType): boolean {
  return errorType === 'TIMEOUT' || errorType === 'NETWORK_ERROR' || errorType === 'CONNECTION_REFUSED';
}
