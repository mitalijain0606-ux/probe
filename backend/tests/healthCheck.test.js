const { pingUrl } = require('../src/services/healthCheckService');

describe('Health Check Engine - pingUrl', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('marks 200 OK as status UP with response time', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
    });

    const result = await pingUrl('https://example.com');
    expect(result.status).toBe('UP');
    expect(result.statusCode).toBe(200);
    expect(result.errorMessage).toBeNull();
    expect(result.responseTime).toBeGreaterThanOrEqual(0);
  });

  test('marks 204 No Content as status UP', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 204,
      statusText: 'No Content',
    });

    const result = await pingUrl('https://example.com/api/ping');
    expect(result.status).toBe('UP');
    expect(result.statusCode).toBe(204);
  });

  test('marks 404 Not Found as status DOWN with status code', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      statusText: 'Not Found',
    });

    const result = await pingUrl('https://example.com/missing');
    expect(result.status).toBe('DOWN');
    expect(result.statusCode).toBe(404);
    expect(result.errorMessage).toContain('404');
  });

  test('marks 500 Internal Server Error as status DOWN', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await pingUrl('https://example.com/api/error');
    expect(result.status).toBe('DOWN');
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toContain('500');
  });

  test('handles request timeout gracefully (marks DOWN without crashing)', async () => {
    global.fetch = jest.fn().mockRejectedValue({
      name: 'AbortError',
      message: 'The operation was aborted',
    });

    const result = await pingUrl('https://example.com/slow', 500);
    expect(result.status).toBe('DOWN');
    expect(result.statusCode).toBeNull();
    expect(result.errorMessage).toContain('timed out');
  });

  test('handles DNS failure ENOTFOUND gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue({
      cause: { code: 'ENOTFOUND' },
      message: 'getaddrinfo ENOTFOUND invalid-domain.fake',
    });

    const result = await pingUrl('https://invalid-domain.fake');
    expect(result.status).toBe('DOWN');
    expect(result.statusCode).toBeNull();
    expect(result.errorMessage).toContain('DNS lookup failed');
  });

  test('blocks SSRF targets immediately without network request', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    const result = await pingUrl('http://127.0.0.1:3000/internal');
    expect(result.status).toBe('DOWN');
    expect(result.errorMessage).toContain('SSRF');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
