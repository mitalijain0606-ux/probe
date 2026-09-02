const { validateUrlForSsrf, isPrivateOrReservedIp } = require('../src/utils/ssrfValidator');

describe('SSRF Protection Validator', () => {
  describe('isPrivateOrReservedIp', () => {
    test('identifies loopback 127.0.0.1 as reserved', () => {
      expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('127.1.2.3')).toBe(true);
    });

    test('identifies zero network 0.0.0.0 as reserved', () => {
      expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
    });

    test('identifies 10.0.0.0/8 private network', () => {
      expect(isPrivateOrReservedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('10.254.1.1')).toBe(true);
    });

    test('identifies 172.16.0.0/12 private network', () => {
      expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrReservedIp('172.32.0.1')).toBe(false); // Public
    });

    test('identifies 192.168.0.0/16 private network', () => {
      expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrReservedIp('192.168.100.200')).toBe(true);
    });

    test('identifies AWS/GCP cloud metadata IP 169.254.169.254', () => {
      expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrReservedIp('169.254.1.1')).toBe(true);
    });

    test('allows legitimate public IP addresses', () => {
      expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
      expect(isPrivateOrReservedIp('142.250.190.46')).toBe(false);
    });
  });

  describe('validateUrlForSsrf', () => {
    test('allows valid public HTTPS URL', () => {
      const result = validateUrlForSsrf('https://google.com');
      expect(result.valid).toBe(true);
      expect(result.parsedUrl.hostname).toBe('google.com');
    });

    test('allows valid public HTTP URL', () => {
      const result = validateUrlForSsrf('http://example.com/api/status');
      expect(result.valid).toBe(true);
    });

    test('rejects localhost', () => {
      const result = validateUrlForSsrf('http://localhost:3000/admin');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SSRF');
    });

    test('rejects 127.0.0.1 loopback', () => {
      const result = validateUrlForSsrf('http://127.0.0.1:8080');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SSRF');
    });

    test('rejects cloud metadata URL 169.254.169.254', () => {
      const result = validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cloud-metadata');
    });

    test('rejects private network URL 192.168.1.1', () => {
      const result = validateUrlForSsrf('http://192.168.1.1/dashboard');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    test('rejects non-HTTP protocols such as file:// and ftp://', () => {
      const fileResult = validateUrlForSsrf('file:///etc/passwd');
      expect(fileResult.valid).toBe(false);

      const ftpResult = validateUrlForSsrf('ftp://example.com/data');
      expect(ftpResult.valid).toBe(false);
    });

    test('rejects malformed string input', () => {
      expect(validateUrlForSsrf('').valid).toBe(false);
      expect(validateUrlForSsrf(null).valid).toBe(false);
      expect(validateUrlForSsrf('not-a-valid-url').valid).toBe(false);
    });
  });
});
