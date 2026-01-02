// API Route: /api/health
// Health check and metrics endpoint

import { NextApiRequest, NextApiResponse } from 'next';
import { eventStore } from '@/lib/eventStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metrics = eventStore.getMetrics();

    return res.status(200).json({
      success: true,
      status: 'healthy',
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving health metrics:', error);
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
