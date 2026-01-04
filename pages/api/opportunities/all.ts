// API Route: /api/opportunities/all
// Fetch all opportunities from the database

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Query all opportunities with future start dates
    const result = await sql`
      SELECT
        id,
        name,
        subject,
        organisation_name,
        owner_name,
        starts_at,
        ends_at,
        updated_at_rms as updated_at,
        opportunity_status,
        charge_total,
        data
      FROM opportunities
      WHERE starts_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY starts_at ASC
    `;

    return res.status(200).json({
      success: true,
      opportunities: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[API] Error fetching opportunities:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
