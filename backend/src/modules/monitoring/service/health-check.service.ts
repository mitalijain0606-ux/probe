import { env } from '../../../config/env.js';
import { logger } from '../../../logger/logger.js';
import { observe, incrementCounter } from '../../../logger/metrics.js';
import { assertSafeTarget } from '../../../utils/url-guard.js';
import { classifyError, isRetryable } from './error-classifier.js';
import type {
  CheckErrorType,
  HealthCheckOptions,
  HealthCheckResult,
} from './health-check.types.js';

const GUARD_ERROR_MAP: Record<string, CheckErrorType> = {
  INVALID_URL: 'INVALID_URL',
  UNSUPPORTED_PROTOCOL: 'INVALID_URL',
  DNS_FAILURE: 'DNS_FAILURE',
  BLOCKED_TARGET: 'BLOCKED_TARGET',
};

function truncate(message: string, max = 480): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function drainBody(response: Response): Promise<void> {
  if (!response.body) return;
  try {
    const reader = response.body.getReader();
    let read = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      read += value?.byteLength ?? 0;
      if (read >= env.CHECK_MAX_BODY_BYTES) {
        await reader.cancel();
        break;
      }
    }
  } catch {
    // Body drain failures are irrelevant to health status; the response line already arrived.
  }
}

async function performRequest(
  target: URL,
  timeoutMs: number,
  maxRedirects: number,
): Promise<{ statusCode: number; responseTimeMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);

  const startedAt = performance.now();
  try {
    const response = await fetch(target, {
      method: 'GET',
      redirect: maxRedirects > 0 ? 'follow' : 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': env.USER_AGENT,
        accept: '*/*',
        'accept-encoding': 'gzip, deflate',
      },
    });

    await drainBody(response);
    return {
      statusCode: response.status,
      responseTimeMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUrl(
  rawUrl: string,
  options: HealthCheckOptions = {},
): Promise<HealthCheckResult> {
  const timeoutMs = options.timeoutMs ?? env.REQUEST_TIMEOUT;
  const maxAttempts = options.maxAttempts ?? env.CHECK_MAX_ATTEMPTS;
  const retryBaseMs = options.retryBaseMs ?? env.CHECK_RETRY_BASE_MS;
  const maxRedirects = options.maxRedirects ?? env.CHECK_MAX_REDIRECTS;

  const guard = await assertSafeTarget(rawUrl);
  if (!guard.ok) {
    const errorType = GUARD_ERROR_MAP[guard.reason] ?? 'UNKNOWN';
    incrementCounter('healthcheck_result_total', { status: 'DOWN', errorType });
    return {
      url: rawUrl,
      status: 'DOWN',
      statusCode: null,
      responseTimeMs: null,
      errorType,
      errorMessage: truncate(guard.message),
      attempts: 1,
      checkedAt: new Date(),
    };
  }

  let attempt = 0;
  let lastError: { errorType: CheckErrorType; message: string } = {
    errorType: 'UNKNOWN',
    message: 'Check did not run',
  };

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const { statusCode, responseTimeMs } = await performRequest(guard.url, timeoutMs, maxRedirects);
      const isUp = statusCode >= 200 && statusCode <= 299;

      observe('healthcheck_response_time_ms', responseTimeMs, { status: isUp ? 'UP' : 'DOWN' });
      incrementCounter('healthcheck_result_total', {
        status: isUp ? 'UP' : 'DOWN',
        errorType: isUp ? 'none' : 'HTTP_ERROR',
      });

      return {
        url: guard.url.toString(),
        status: isUp ? 'UP' : 'DOWN',
        statusCode,
        responseTimeMs,
        errorType: isUp ? null : 'HTTP_ERROR',
        errorMessage: isUp ? null : `Endpoint responded with HTTP ${statusCode}`,
        attempts: attempt,
        checkedAt: new Date(),
      };
    } catch (error) {
      lastError = classifyError(error);
      logger.warn(
        {
          event: 'healthcheck.attempt_failed',
          url: guard.url.hostname,
          attempt,
          maxAttempts,
          errorType: lastError.errorType,
          message: lastError.message,
        },
        'health check attempt failed',
      );

      if (attempt >= maxAttempts || !isRetryable(lastError.errorType)) break;
      await delay(retryBaseMs * 2 ** (attempt - 1));
    }
  }

  incrementCounter('healthcheck_result_total', { status: 'DOWN', errorType: lastError.errorType });

  return {
    url: guard.url.toString(),
    status: 'DOWN',
    statusCode: null,
    responseTimeMs: null,
    errorType: lastError.errorType,
    errorMessage: truncate(lastError.message),
    attempts: attempt,
    checkedAt: new Date(),
  };
}
