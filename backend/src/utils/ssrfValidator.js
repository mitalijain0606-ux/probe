const { URL } = require('url');

/**
 * Validates whether an IPv4 address is in a private, loopback, or reserved range.
 * @param {string} ip - IPv4 string
 * @returns {boolean} true if IP is private/reserved
 */
function isPrivateOrReservedIp(ip) {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return false;

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private RFC 1918)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private RFC 1918)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  return false;
}

/**
 * Validates a target URL against SSRF attacks.
 * @param {string} rawUrl - Target URL to inspect
 * @returns {{ valid: boolean, error?: string, parsedUrl?: URL }}
 */
function validateUrlForSsrf(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { valid: false, error: 'Invalid URL format. Please include protocol (e.g., https://example.com)' };
  }

  // Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// protocols are supported' };
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Block localhost and standard internal names
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, error: 'Requests to localhost or internal network names are blocked for security (SSRF protection)' };
  }

  // If hostname is an IPv4 literal, verify it is not private/metadata
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { valid: false, error: `Requests to private or cloud-metadata IP addresses (${hostname}) are blocked (SSRF protection)` };
    }
  }

  return { valid: true, parsedUrl: parsed };
}

module.exports = {
  validateUrlForSsrf,
  isPrivateOrReservedIp,
};
