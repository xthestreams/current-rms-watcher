// API Route: /api/reconciliation
// Data reconciliation queries for identifying sync gaps

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
    const queryType = req.query.type as string;

    switch (queryType) {
      case 'unaugmented':
        // Find opportunities that have events but no augmented data
        const unaugmented = await eventStore.getUnaugmentedOpportunities();
        return res.status(200).json({
          success: true,
          type: 'unaugmented_opportunities',
          count: unaugmented.length,
          opportunityIds: unaugmented
        });

      case 'missing-integration':
        // Find opportunities missing a specific integration
        const systemName = req.query.system as string;
        if (!systemName) {
          return res.status(400).json({ error: 'system parameter required' });
        }
        const missing = await eventStore.getOpportunitiesMissingIntegration(systemName);
        return res.status(200).json({
          success: true,
          type: 'missing_integration',
          system: systemName,
          count: missing.length,
          opportunityIds: missing
        });

      case 'stale-integrations':
        // Find integrations that are stale or failed
        const system = req.query.system as string | undefined;
        const stale = await eventStore.getStaleIntegrations(system);
        return res.status(200).json({
          success: true,
          type: 'stale_integrations',
          system: system || 'all',
          count: stale.length,
          integrations: stale
        });

      case 'all':
        // Run all reconciliation queries
        const [unaugmentedAll, staleAll] = await Promise.all([
          eventStore.getUnaugmentedOpportunities(),
          eventStore.getStaleIntegrations()
        ]);

        return res.status(200).json({
          success: true,
          type: 'all_reconciliation',
          results: {
            unaugmented: {
              count: unaugmentedAll.length,
              opportunityIds: unaugmentedAll
            },
            staleIntegrations: {
              count: staleAll.length,
              integrations: staleAll
            }
          }
        });

      default:
        return res.status(400).json({
          error: 'Invalid query type',
          validTypes: ['unaugmented', 'missing-integration', 'stale-integrations', 'all']
        });
    }
  } catch (error) {
    console.error('Error running reconciliation query:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
