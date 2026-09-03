import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { env } from '../config/env.js';

export type GuardFailure =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'DNS_FAILURE'
  | 'BLOCKED_TARGET';

export type GuardResult =
  | { ok: true; url: URL; addresses: string[] }
  | { ok: false; reason: GuardFailure; message: string };

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
]);

function ipv4ToInt(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

const IPV4_BLOCKED_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

function isBlockedIpv4(address: string): boolean {
  const value = ipv4ToInt(address);
  if (value === null) return true;

  for (const [network, bits] of IPV4_BLOCKED_RANGES) {
    const base = ipv4ToInt(network);
    if (base === null) continue;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((value & mask) >>> 0 === (base & mask) >>> 0) return true;
  }
  return false;
}

function expandIpv6(address: string): string[] {
  const zoneless = address.split('%')[0] ?? address;
  const [head = '', tail = ''] = zoneless.split('::');
  const headGroups = head ? head.split(':').filter(Boolean) : [];
  const tailGroups = tail ? tail.split(':').filter(Boolean) : [];

  if (!zoneless.includes('::')) {
    return zoneless.split(':');
  }
  const missing = 8 - headGroups.length - tailGroups.length;
  return [...headGroups, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailGroups];
}

function isBlockedIpv6(address: string): boolean {
  const normalized = (address.split('%')[0] ?? address).toLowerCase();

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(normalized);
  if (mapped?.[1]) return isBlockedIpv4(mapped[1]);

  if (normalized === '::' || normalized === '::1') return true;

  const groups = expandIpv6(normalized);
  const first = Number.parseInt(groups[0] ?? '0', 16);

  // fc00::/7 unique local, fe80::/10 link local, ff00::/8 multicast
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xff00) === 0xff00) return true;

  return false;
}

export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    parsed.hash = '';
    if (parsed.pathname === '/' && !parsed.search) {
      parsed.pathname = '/';
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function parseTarget(raw: string): { ok: true; url: URL } | { ok: false; reason: GuardFailure; message: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'INVALID_URL', message: 'URL could not be parsed' };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return {
      ok: false,
      reason: 'UNSUPPORTED_PROTOCOL',
      message: `Protocol ${url.protocol} is not supported, use http or https`,
    };
  }

  if (!url.hostname) {
    return { ok: false, reason: 'INVALID_URL', message: 'URL is missing a hostname' };
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    return { ok: false, reason: 'BLOCKED_TARGET', message: 'Target hostname is not allowed' };
  }

  return { ok: true, url };
}

export async function assertSafeTarget(raw: string): Promise<GuardResult> {
  const parsed = parseTarget(raw);
  if (!parsed.ok) return parsed;

  const { url } = parsed;
  const hostname = url.hostname.replace(/^\[|\]$/g, '');

  if (env.ALLOW_PRIVATE_TARGETS) {
    return { ok: true, url, addresses: [] };
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      return { ok: false, reason: 'BLOCKED_TARGET', message: 'Target resolves to a restricted network range' };
    }
    return { ok: true, url, addresses: [hostname] };
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: 'DNS_FAILURE', message: `DNS lookup failed for ${hostname}` };
  }

  if (records.length === 0) {
    return { ok: false, reason: 'DNS_FAILURE', message: `No DNS records for ${hostname}` };
  }

  for (const record of records) {
    if (isBlockedAddress(record.address)) {
      return { ok: false, reason: 'BLOCKED_TARGET', message: 'Target resolves to a restricted network range' };
    }
  }

  return { ok: true, url, addresses: records.map((record) => record.address) };
}
