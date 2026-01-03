// API Route: /api/sync/initial
// Perform initial full sync of opportunities from Current RMS

import { NextApiRequest, NextApiResponse } from 'next';
import { opportunitySync } from '@/lib/opportunitySync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API] Starting initial opportunity sync');

    const result = await opportunitySync.initialSync();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Initial sync completed successfully',
        syncId: result.syncId,
        recordsSynced: result.recordsSynced,
        recordsFailed: result.recordsFailed,
        duration: result.completedAt
          ? Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000)
          : null,
        logs: result.logs,
        firstFailure: result.firstFailure
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Initial sync failed',
        error: result.error,
        recordsSynced: result.recordsSynced,
        recordsFailed: result.recordsFailed,
        logs: result.logs,
        firstFailure: result.firstFailure
      });
    }
  } catch (error) {
    console.error('[API] Error during initial sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
