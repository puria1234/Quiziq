import type { NextApiRequest } from 'next';

function normalizeIp(ipAddress: string) {
  const trimmed = ipAddress.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') {
    return '';
  }

  if (trimmed.startsWith('::ffff:')) {
    return trimmed.slice(7);
  }

  if (trimmed.startsWith('[')) {
    const closingBracketIndex = trimmed.indexOf(']');
    if (closingBracketIndex > 1) {
      return trimmed.slice(1, closingBracketIndex);
    }
  }

  // Handle IPv4 values that include a forwarded port (e.g. "203.0.113.8:52144").
  const colonCount = (trimmed.match(/:/g) || []).length;
  if (colonCount === 1 && trimmed.includes('.')) {
    const [ipv4] = trimmed.split(':');
    return ipv4 ?? '';
  }

  return trimmed;
}

export function getClientIp(req: NextApiRequest): string | null {
  const forwardedForHeader = req.headers['x-forwarded-for'];
  const forwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader;

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const firstForwardedIp = forwardedFor.split(',')[0];
    if (firstForwardedIp) {
      const normalized = normalizeIp(firstForwardedIp);
      if (normalized) {
        return normalized;
      }
    }
  }

  const realIpHeader = req.headers['x-real-ip'];
  const realIp = Array.isArray(realIpHeader) ? realIpHeader[0] : realIpHeader;
  if (typeof realIp === 'string' && realIp.trim()) {
    const normalized = normalizeIp(realIp);
    if (normalized) {
      return normalized;
    }
  }

  if (req.socket?.remoteAddress) {
    const normalized = normalizeIp(req.socket.remoteAddress);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}
