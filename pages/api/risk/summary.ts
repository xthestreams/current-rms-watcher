// API Route: /api/risk/summary
// Get risk assessment summary statistics

import { NextApiRequest, NextApiResponse } from 'next';
import { eventStore } from '@/lib/eventStorePostgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract date range parameters from query string
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    console.log('[RiskAPI] Date filter:', { startDate, endDate });

    const summary = await eventStore.getRiskSummary(startDate, endDate);

    console.log('[RiskAPI] Risk summary result:', summary);

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('[RiskAPI] Error fetching risk summary:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
