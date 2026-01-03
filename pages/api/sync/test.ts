// API Route: /api/sync/test
// Test Current RMS API connection and fetch without writing to database

import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentRMSClient, getDefaultDateRange } from '@/lib/currentRmsClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const logs: string[] = [];
  const addLog = (message: string) => {
    console.log(message);
    logs.push(message);
  };

  try {
    addLog('[Test] Starting API connection test');

    // Check environment variables
    addLog(`[Test] Checking environment variables...`);
    const hasSubdomain = !!process.env.CURRENT_RMS_SUBDOMAIN;
    const hasApiKey = !!process.env.CURRENT_RMS_API_KEY;
    const hasPostgres = !!process.env.POSTGRES_URL;

    addLog(`[Test] CURRENT_RMS_SUBDOMAIN: ${hasSubdomain ? '✓ Set' : '✗ Missing'}`);
    addLog(`[Test] CURRENT_RMS_API_KEY: ${hasApiKey ? '✓ Set' : '✗ Missing'}`);
    addLog(`[Test] POSTGRES_URL: ${hasPostgres ? '✓ Set' : '✗ Missing'}`);

    if (!hasSubdomain || !hasApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing environment variables',
        logs,
        config: {
          hasSubdomain,
          hasApiKey,
          hasPostgres
        }
      });
    }

    // Get date range
    const { startDate, endDate } = getDefaultDateRange();
    addLog(`[Test] Date range: ${startDate} to ${endDate}`);

    // Initialize client
    addLog('[Test] Initializing Current RMS client...');
    const client = getCurrentRMSClient();
    addLog('[Test] Client initialized');

    // Test fetching first page only
    addLog('[Test] Fetching first page of opportunities (100 max)...');
    const response = await client.getOpportunities(startDate, endDate, 1, 100);

    addLog(`[Test] Response received!`);
    addLog(`[Test] Opportunities in response: ${response.opportunities?.length || 0}`);
    addLog(`[Test] Meta object: ${JSON.stringify(response.meta)}`);

    // Parse pagination
    const totalRowCount = response.meta?.total_row_count || 0;
    const perPage = response.meta?.per_page || 100;
    const totalPages = totalRowCount > 0 ? Math.ceil(totalRowCount / perPage) : 1;

    addLog(`[Test] Pagination info:`);
    addLog(`[Test]   - Total records: ${totalRowCount}`);
    addLog(`[Test]   - Per page: ${perPage}`);
    addLog(`[Test]   - Total pages: ${totalPages}`);
    addLog(`[Test]   - Records fetched: ${response.opportunities?.length || 0}`);

    // Sample first 3 opportunities
    const sampleOpps = response.opportunities?.slice(0, 3).map(opp => ({
      id: opp.id,
      name: opp.name,
      status: opp.opportunity_status,
      starts_at: opp.starts_at,
      organisation_name: opp.organisation_name
    }));

    addLog(`[Test] Sample opportunities: ${JSON.stringify(sampleOpps, null, 2)}`);

    return res.status(200).json({
      success: true,
      logs,
      summary: {
        totalRecords: totalRowCount,
        perPage,
        totalPages,
        firstPageRecords: response.opportunities?.length || 0,
        estimatedFullSyncTime: `${Math.round(totalPages * 0.2)}s (at 200ms per page)`
      },
      sampleOpportunities: sampleOpps,
      rawMeta: response.meta
    });

  } catch (error) {
    addLog(`[Test] ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      addLog(`[Test] Stack: ${error.stack}`);
    }

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      logs
    });
  }
}
