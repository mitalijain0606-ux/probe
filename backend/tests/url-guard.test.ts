import { describe, expect, it } from 'vitest';
import { isBlockedAddress, normalizeUrl, parseTarget } from '../src/utils/url-guard.js';

describe('normalizeUrl', () => {
  it('accepts valid http/https urls', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    expect(normalizeUrl('  http://example.com/path  ')).toBe('http://example.com/path');
  });

  it('rejects garbage input', () => {
    expect(normalizeUrl('not a url')).toBeNull();
    expect(normalizeUrl('')).toBeNull();
  });
});

describe('parseTarget', () => {
  it('rejects unsupported protocols', () => {
    const result = parseTarget('ftp://example.com');
    expect(result.ok).toBe(false);
  });

  it('rejects localhost hostnames', () => {
    const result = parseTarget('http://localhost:3000');
    expect(result.ok).toBe(false);
  });

  it('accepts a plain https hostname', () => {
    const result = parseTarget('https://example.com');
    expect(result.ok).toBe(true);
  });
});

describe('isBlockedAddress', () => {
  it('blocks loopback and private IPv4 ranges', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true);
    expect(isBlockedAddress('10.0.0.5')).toBe(true);
    expect(isBlockedAddress('192.168.1.1')).toBe(true);
    expect(isBlockedAddress('172.16.0.1')).toBe(true);
  });

  it('blocks link-local and cloud metadata address', () => {
    expect(isBlockedAddress('169.254.169.254')).toBe(true);
  });

  it('allows public IPv4 addresses', () => {
    expect(isBlockedAddress('8.8.8.8')).toBe(false);
    expect(isBlockedAddress('1.1.1.1')).toBe(false);
  });

  it('blocks IPv6 loopback and unique-local', () => {
    expect(isBlockedAddress('::1')).toBe(true);
    expect(isBlockedAddress('fc00::1')).toBe(true);
    expect(isBlockedAddress('fe80::1')).toBe(true);
  });
});
