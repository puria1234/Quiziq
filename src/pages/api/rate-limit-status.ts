import type { NextApiRequest, NextApiResponse } from 'next';
import { getClientIp } from '@/lib/clientIp';
import { getRateLimitStatus } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = getClientIp(req);
  if (!clientIp) {
    return res.status(400).json({ error: 'Unable to determine client IP for rate limiting' });
  }

  try {
    const status = await getRateLimitStatus(clientIp);
    return res.status(200).json(status);
  } catch (error) {
    console.error('Rate limit status error:', error);
    return res.status(500).json({ error: 'Failed to get rate limit status' });
  }
}
