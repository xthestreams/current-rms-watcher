// Sales Forecast Type Definitions

export interface ForecastMetadata {
  opportunity_id: number;
  probability: number;              // 0-100
  is_commit: boolean;               // true = commit, false = upside
  revenue_override: number | null;  // Manual revenue override
  profit_override: number | null;   // Manual profit override
  is_excluded: boolean;             // Suppress from forecast totals
  exclusion_reason: string | null;  // Why excluded
  notes: string | null;             // Management commentary
  last_reviewed_at: string | null;  // ISO timestamp
  reviewed_by: string | null;       // User who last modified
  created_at?: string;
  updated_at?: string;
}

export interface OpportunityWithForecast {
  // Core opportunity fields
  id: number;
  name: string;
  subject?: string;
  organisation_name?: string;
  owner_name?: string;
  starts_at?: string;
  ends_at?: string;
  opportunity_status?: string;

  // Financial fields from CurrentRMS
  charge_total: number;                  // Revenue
  provisional_cost_total: number;        // Cost basis for profit calc
  predicted_cost_total: number;          // Predicted cost (for later use)
  actual_cost_total: number;             // Actual cost (for later use)

  // Calculated base values (before forecast adjustments)
  base_profit: number;                   // charge_total - provisional_cost_total
  base_margin: number;                   // base_profit / charge_total (as decimal)

  // Forecast metadata
  forecast?: ForecastMetadata;

  // Calculated forecast values
  effective_revenue: number;             // revenue_override ?? charge_total
  effective_profit: number;              // profit_override ?? base_profit
  weighted_revenue: number;              // effective_revenue * (probability / 100)
  weighted_profit: number;               // effective_profit * (probability / 100)
}

export interface ForecastSummary {
  // Pipeline totals (all non-excluded opportunities)
  total_pipeline_revenue: number;
  total_pipeline_profit: number;
  total_pipeline_count: number;

  // Weighted totals
  weighted_revenue: number;
  weighted_profit: number;

  // Commit vs Upside breakdown
  commit_revenue: number;
  commit_profit: number;
  commit_count: number;
  upside_revenue: number;
  upside_profit: number;
  upside_count: number;

  // Excluded
  excluded_count: number;
  excluded_revenue: number;

  // Unreviewed (no forecast metadata)
  unreviewed_count: number;
  unreviewed_revenue: number;
}

export interface ForecastByOwner {
  owner_name: string;
  pipeline_revenue: number;
  pipeline_profit: number;
  weighted_revenue: number;
  weighted_profit: number;
  commit_revenue: number;
  upside_revenue: number;
  opportunity_count: number;
  avg_probability: number;
}

export interface ForecastByCustomer {
  organisation_name: string;
  pipeline_revenue: number;
  weighted_revenue: number;
  opportunity_count: number;
  avg_probability: number;
}

export interface ForecastByProbabilityBand {
  band: string;              // e.g., "0-25%", "26-50%", "51-75%", "76-100%"
  min_probability: number;
  max_probability: number;
  revenue: number;
  profit: number;
  count: number;
}

export interface ForecastFilters {
  owner?: string;
  customer?: string;
  startDate?: string;
  endDate?: string;
  showCommitOnly?: boolean;
  showUpsideOnly?: boolean;
  includeExcluded?: boolean;
}

export type ForecastStatus = 'reviewed' | 'unreviewed' | 'excluded';

export const PROBABILITY_BANDS = [
  { label: '0-25%', min: 0, max: 25 },
  { label: '26-50%', min: 26, max: 50 },
  { label: '51-75%', min: 51, max: 75 },
  { label: '76-100%', min: 76, max: 100 },
] as const;

export const EXCLUSION_REASONS = [
  'Duplicate',
  'Test record',
  'Unlikely to close',
  'Lost to competitor',
  'Customer cancelled',
  'Out of scope',
  'Other'
] as const;

export interface ForecastTimeSeries {
  period: string;           // e.g., "2024-W01" for week or "2024-01" for month
  periodLabel: string;      // e.g., "Jan 1-7" or "January"
  commit_revenue: number;
  upside_revenue: number;
  unreviewed_revenue: number;
  commit_profit: number;
  upside_profit: number;
  unreviewed_profit: number;
}
