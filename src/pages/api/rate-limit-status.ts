import type { NextApiRequest, NextApiResponse } from 'next';
import { getRateLimitStatus } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const status = await getRateLimitStatus(userId);
    return res.status(200).json(status);
  } catch (error) {
    console.error('Rate limit status error:', error);
    return res.status(500).json({ error: 'Failed to get rate limit status' });
  }
}
