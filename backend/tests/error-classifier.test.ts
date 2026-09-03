import { describe, expect, it } from 'vitest';
import { classifyError, isRetryable } from '../src/modules/monitoring/service/error-classifier.js';

describe('classifyError', () => {
  it('classifies DNS resolution failures', () => {
    const error = Object.assign(new Error('getaddrinfo ENOTFOUND example.invalid'), { code: 'ENOTFOUND' });
    expect(classifyError(error).errorType).toBe('DNS_FAILURE');
  });

  it('classifies connection refused', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9999'), { code: 'ECONNREFUSED' });
    expect(classifyError(error).errorType).toBe('CONNECTION_REFUSED');
  });

  it('classifies abort/timeout errors', () => {
    const error = new DOMException('Request timed out', 'TimeoutError');
    expect(classifyError(error).errorType).toBe('TIMEOUT');
  });

  it('classifies TLS certificate errors', () => {
    const error = Object.assign(new Error('certificate has expired'), { code: 'CERT_HAS_EXPIRED' });
    expect(classifyError(error).errorType).toBe('SSL_ERROR');
  });

  it('falls back to UNKNOWN for unrecognized errors', () => {
    const error = new Error('something bizarre happened');
    expect(classifyError(error).errorType).toBe('UNKNOWN');
  });

  it('marks timeouts and network errors as retryable, unknown as not', () => {
    expect(isRetryable('TIMEOUT')).toBe(true);
    expect(isRetryable('CONNECTION_REFUSED')).toBe(true);
    expect(isRetryable('UNKNOWN')).toBe(false);
    expect(isRetryable('BLOCKED_TARGET')).toBe(false);
  });
});
