// API Route: /api/audit
// Audit trail retrieval for tracking changes

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
    const entityType = req.query.entityType as string;
    const entityId = req.query.entityId as string;

    if (!entityType || !entityId) {
      return res.status(400).json({
        error: 'entityType and entityId required',
        example: '/api/audit?entityType=opportunity&entityId=12345'
      });
    }

    const auditTrail = await eventStore.getAuditTrail(entityType, entityId);

    return res.status(200).json({
      success: true,
      entityType,
      entityId,
      count: auditTrail.length,
      auditTrail
    });

  } catch (error) {
    console.error('Error retrieving audit trail:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
