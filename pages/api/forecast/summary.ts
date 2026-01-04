// API Route: /api/forecast/summary
// Get aggregated forecast data with filtering

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import {
  enrichOpportunityWithForecast,
  calculateForecastSummary,
  calculateForecastByOwner,
  calculateForecastByCustomer,
  calculateForecastByProbabilityBand,
  calculateForecastTimeSeries
} from '@/lib/forecastCalculation';
import { ForecastMetadata } from '@/types/forecast';

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

    // Parse query parameters
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const owner = typeof req.query.owner === 'string' ? req.query.owner : undefined;
    const customer = typeof req.query.customer === 'string' ? req.query.customer : undefined;
    const includeExcluded = req.query.includeExcluded === 'true';

    // Build the query for opportunities with forecast metadata
    let opportunitiesResult;

    try {
      // Query opportunities with LEFT JOIN to forecast_metadata
      if (startDate && endDate) {
        opportunitiesResult = await sql`
          SELECT
            o.id,
            o.name,
            o.subject,
            o.organisation_name,
            o.owner_name,
            o.starts_at,
            o.ends_at,
            o.opportunity_status,
            o.charge_total,
            o.provisional_cost_total,
            o.predicted_cost_total,
            o.actual_cost_total,
            fm.probability,
            fm.is_commit,
            fm.revenue_override,
            fm.profit_override,
            fm.is_excluded,
            fm.exclusion_reason,
            fm.notes,
            fm.last_reviewed_at,
            fm.reviewed_by
          FROM opportunities o
          LEFT JOIN forecast_metadata fm ON o.id = fm.opportunity_id
          WHERE o.starts_at >= ${startDate}::date
            AND o.starts_at <= ${endDate}::date
          ORDER BY o.starts_at ASC
        `;
      } else if (startDate) {
        opportunitiesResult = await sql`
          SELECT
            o.id,
            o.name,
            o.subject,
            o.organisation_name,
            o.owner_name,
            o.starts_at,
            o.ends_at,
            o.opportunity_status,
            o.charge_total,
            o.provisional_cost_total,
            o.predicted_cost_total,
            o.actual_cost_total,
            fm.probability,
            fm.is_commit,
            fm.revenue_override,
            fm.profit_override,
            fm.is_excluded,
            fm.exclusion_reason,
            fm.notes,
            fm.last_reviewed_at,
            fm.reviewed_by
          FROM opportunities o
          LEFT JOIN forecast_metadata fm ON o.id = fm.opportunity_id
          WHERE o.starts_at >= ${startDate}::date
          ORDER BY o.starts_at ASC
        `;
      } else {
        // Default: future opportunities (starts_at >= today - 30 days)
        opportunitiesResult = await sql`
          SELECT
            o.id,
            o.name,
            o.subject,
            o.organisation_name,
            o.owner_name,
            o.starts_at,
            o.ends_at,
            o.opportunity_status,
            o.charge_total,
            o.provisional_cost_total,
            o.predicted_cost_total,
            o.actual_cost_total,
            fm.probability,
            fm.is_commit,
            fm.revenue_override,
            fm.profit_override,
            fm.is_excluded,
            fm.exclusion_reason,
            fm.notes,
            fm.last_reviewed_at,
            fm.reviewed_by
          FROM opportunities o
          LEFT JOIN forecast_metadata fm ON o.id = fm.opportunity_id
          WHERE o.starts_at >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY o.starts_at ASC
        `;
      }
    } catch (dbError: any) {
      // Handle case where forecast_metadata table doesn't exist
      if (dbError?.code === '42P01') {
        console.log('[ForecastAPI] forecast_metadata table does not exist');
        // Fall back to query without forecast data
        if (startDate && endDate) {
          opportunitiesResult = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, ends_at, opportunity_status, charge_total,
              provisional_cost_total, predicted_cost_total, actual_cost_total,
              NULL as probability, NULL as is_commit, NULL as revenue_override,
              NULL as profit_override, NULL as is_excluded, NULL as exclusion_reason,
              NULL as notes, NULL as last_reviewed_at, NULL as reviewed_by
            FROM opportunities
            WHERE starts_at >= ${startDate}::date AND starts_at <= ${endDate}::date
            ORDER BY starts_at ASC
          `;
        } else {
          opportunitiesResult = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, ends_at, opportunity_status, charge_total,
              provisional_cost_total, predicted_cost_total, actual_cost_total,
              NULL as probability, NULL as is_commit, NULL as revenue_override,
              NULL as profit_override, NULL as is_excluded, NULL as exclusion_reason,
              NULL as notes, NULL as last_reviewed_at, NULL as reviewed_by
            FROM opportunities
            WHERE starts_at >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY starts_at ASC
          `;
        }
      } else {
        throw dbError;
      }
    }

    // Transform and enrich opportunities
    let opportunities = opportunitiesResult.rows.map(row => {
      const typedRow = row as {
        id: number;
        name: string;
        subject?: string;
        organisation_name?: string;
        owner_name?: string;
        starts_at?: string;
        ends_at?: string;
        opportunity_status?: string;
        charge_total?: string | number | null;
        provisional_cost_total?: string | number | null;
        predicted_cost_total?: string | number | null;
        actual_cost_total?: string | number | null;
        probability?: number | null;
        is_commit?: boolean | null;
        revenue_override?: number | null;
        profit_override?: number | null;
        is_excluded?: boolean | null;
        exclusion_reason?: string | null;
        notes?: string | null;
        last_reviewed_at?: string | null;
        reviewed_by?: string | null;
      };

      const forecast: ForecastMetadata | null = typedRow.probability !== null && typedRow.probability !== undefined ? {
        opportunity_id: typedRow.id,
        probability: typedRow.probability,
        is_commit: typedRow.is_commit ?? false,
        revenue_override: typedRow.revenue_override ?? null,
        profit_override: typedRow.profit_override ?? null,
        is_excluded: typedRow.is_excluded ?? false,
        exclusion_reason: typedRow.exclusion_reason ?? null,
        notes: typedRow.notes ?? null,
        last_reviewed_at: typedRow.last_reviewed_at ?? null,
        reviewed_by: typedRow.reviewed_by ?? null
      } : null;

      return enrichOpportunityWithForecast(typedRow, forecast);
    });

    // Apply additional filters
    if (owner) {
      opportunities = opportunities.filter(o => o.owner_name === owner);
    }
    if (customer) {
      opportunities = opportunities.filter(o => o.organisation_name === customer);
    }
    if (!includeExcluded) {
      opportunities = opportunities.filter(o => !o.forecast?.is_excluded);
    }

    // Calculate aggregations
    const summary = calculateForecastSummary(opportunities);
    const byOwner = calculateForecastByOwner(opportunities);
    const byCustomer = calculateForecastByCustomer(opportunities);
    const byProbabilityBand = calculateForecastByProbabilityBand(opportunities);

    // Calculate time series - determine if we should group by week or month
    // Use week if date range is <= 89 days, otherwise use month
    let dateRangeDays = 90; // default to monthly
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      dateRangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    const groupByWeek = dateRangeDays <= 89;
    const timeSeries = calculateForecastTimeSeries(opportunities, groupByWeek);

    // Get unique owners and customers for filter dropdowns
    const owners = [...new Set(opportunities.map(o => o.owner_name).filter(Boolean))].sort();
    const customers = [...new Set(opportunities.map(o => o.organisation_name).filter(Boolean))].sort();

    return res.status(200).json({
      success: true,
      data: {
        summary,
        byOwner,
        byCustomer,
        byProbabilityBand,
        timeSeries,
        groupByWeek,
        opportunities,
        filters: {
          owners,
          customers
        }
      },
      count: opportunities.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ForecastAPI] Error fetching forecast summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
