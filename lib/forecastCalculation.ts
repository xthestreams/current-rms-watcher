// Sales Forecast Calculation Library
// Business logic for forecast calculations and aggregations

import {
  ForecastMetadata,
  OpportunityWithForecast,
  ForecastSummary,
  ForecastByOwner,
  ForecastByCustomer,
  ForecastByProbabilityBand,
  ForecastTimeSeries,
  PROBABILITY_BANDS
} from '@/types/forecast';

/**
 * Calculate base profit from revenue and provisional cost
 * Profit = Charge Total - Provisional Cost Total
 */
export function calculateBaseProfit(
  chargeTotal: number | null | undefined,
  provisionalCostTotal: number | null | undefined
): number {
  const revenue = parseFloat(String(chargeTotal)) || 0;
  const cost = parseFloat(String(provisionalCostTotal)) || 0;
  return revenue - cost;
}

/**
 * Calculate gross margin as a decimal (0-1)
 * Margin = Profit / Revenue
 */
export function calculateMargin(profit: number, revenue: number): number {
  if (revenue === 0) return 0;
  return profit / revenue;
}

/**
 * Calculate effective revenue (override or base)
 */
export function getEffectiveRevenue(
  chargeTotal: number | null | undefined,
  revenueOverride: number | null | undefined
): number {
  if (revenueOverride !== null && revenueOverride !== undefined) {
    return revenueOverride;
  }
  return parseFloat(String(chargeTotal)) || 0;
}

/**
 * Calculate effective profit (override or base)
 */
export function getEffectiveProfit(
  baseProfit: number,
  profitOverride: number | null | undefined
): number {
  if (profitOverride !== null && profitOverride !== undefined) {
    return profitOverride;
  }
  return baseProfit;
}

/**
 * Calculate weighted value based on probability
 */
export function calculateWeightedValue(value: number, probability: number): number {
  return value * (probability / 100);
}

/**
 * Enrich an opportunity with calculated forecast values
 */
export function enrichOpportunityWithForecast(
  opportunity: {
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
  },
  forecast: ForecastMetadata | null
): OpportunityWithForecast {
  const chargeTotal = parseFloat(String(opportunity.charge_total)) || 0;
  const provisionalCostTotal = parseFloat(String(opportunity.provisional_cost_total)) || 0;
  const predictedCostTotal = parseFloat(String(opportunity.predicted_cost_total)) || 0;
  const actualCostTotal = parseFloat(String(opportunity.actual_cost_total)) || 0;

  const baseProfit = calculateBaseProfit(chargeTotal, provisionalCostTotal);
  const baseMargin = calculateMargin(baseProfit, chargeTotal);

  const effectiveRevenue = forecast
    ? getEffectiveRevenue(chargeTotal, forecast.revenue_override)
    : chargeTotal;

  const effectiveProfit = forecast
    ? getEffectiveProfit(baseProfit, forecast.profit_override)
    : baseProfit;

  const probability = forecast?.probability ?? 0;
  const weightedRevenue = calculateWeightedValue(effectiveRevenue, probability);
  const weightedProfit = calculateWeightedValue(effectiveProfit, probability);

  return {
    id: opportunity.id,
    name: opportunity.name,
    subject: opportunity.subject,
    organisation_name: opportunity.organisation_name,
    owner_name: opportunity.owner_name,
    starts_at: opportunity.starts_at,
    ends_at: opportunity.ends_at,
    opportunity_status: opportunity.opportunity_status,
    charge_total: chargeTotal,
    provisional_cost_total: provisionalCostTotal,
    predicted_cost_total: predictedCostTotal,
    actual_cost_total: actualCostTotal,
    base_profit: baseProfit,
    base_margin: baseMargin,
    forecast: forecast || undefined,
    effective_revenue: effectiveRevenue,
    effective_profit: effectiveProfit,
    weighted_revenue: weightedRevenue,
    weighted_profit: weightedProfit
  };
}

/**
 * Calculate forecast summary from a list of enriched opportunities
 */
export function calculateForecastSummary(
  opportunities: OpportunityWithForecast[]
): ForecastSummary {
  const summary: ForecastSummary = {
    total_pipeline_revenue: 0,
    total_pipeline_profit: 0,
    total_pipeline_count: 0,
    weighted_revenue: 0,
    weighted_profit: 0,
    commit_revenue: 0,
    commit_profit: 0,
    commit_count: 0,
    upside_revenue: 0,
    upside_profit: 0,
    upside_count: 0,
    excluded_count: 0,
    excluded_revenue: 0,
    unreviewed_count: 0,
    unreviewed_revenue: 0
  };

  for (const opp of opportunities) {
    // Check if excluded
    if (opp.forecast?.is_excluded) {
      summary.excluded_count++;
      summary.excluded_revenue += opp.effective_revenue;
      continue;
    }

    // Check if unreviewed (no forecast metadata)
    if (!opp.forecast) {
      summary.unreviewed_count++;
      summary.unreviewed_revenue += opp.charge_total;
      continue;
    }

    // Include in pipeline
    summary.total_pipeline_count++;
    summary.total_pipeline_revenue += opp.effective_revenue;
    summary.total_pipeline_profit += opp.effective_profit;
    summary.weighted_revenue += opp.weighted_revenue;
    summary.weighted_profit += opp.weighted_profit;

    // Commit vs Upside
    if (opp.forecast.is_commit) {
      summary.commit_count++;
      summary.commit_revenue += opp.weighted_revenue;
      summary.commit_profit += opp.weighted_profit;
    } else {
      summary.upside_count++;
      summary.upside_revenue += opp.weighted_revenue;
      summary.upside_profit += opp.weighted_profit;
    }
  }

  return summary;
}

/**
 * Group opportunities by owner and calculate aggregates
 */
export function calculateForecastByOwner(
  opportunities: OpportunityWithForecast[]
): ForecastByOwner[] {
  const byOwner = new Map<string, ForecastByOwner>();

  for (const opp of opportunities) {
    // Skip excluded
    if (opp.forecast?.is_excluded) continue;

    const ownerName = opp.owner_name || 'Unassigned';

    if (!byOwner.has(ownerName)) {
      byOwner.set(ownerName, {
        owner_name: ownerName,
        pipeline_revenue: 0,
        pipeline_profit: 0,
        weighted_revenue: 0,
        weighted_profit: 0,
        commit_revenue: 0,
        upside_revenue: 0,
        opportunity_count: 0,
        avg_probability: 0
      });
    }

    const owner = byOwner.get(ownerName)!;
    owner.opportunity_count++;
    owner.pipeline_revenue += opp.effective_revenue;
    owner.pipeline_profit += opp.effective_profit;
    owner.weighted_revenue += opp.weighted_revenue;
    owner.weighted_profit += opp.weighted_profit;

    if (opp.forecast?.is_commit) {
      owner.commit_revenue += opp.weighted_revenue;
    } else {
      owner.upside_revenue += opp.weighted_revenue;
    }

    // Track probability for average calculation
    owner.avg_probability += opp.forecast?.probability ?? 0;
  }

  // Calculate averages
  for (const owner of byOwner.values()) {
    if (owner.opportunity_count > 0) {
      owner.avg_probability = owner.avg_probability / owner.opportunity_count;
    }
  }

  return Array.from(byOwner.values()).sort(
    (a, b) => b.weighted_revenue - a.weighted_revenue
  );
}

/**
 * Group opportunities by customer and calculate aggregates
 */
export function calculateForecastByCustomer(
  opportunities: OpportunityWithForecast[]
): ForecastByCustomer[] {
  const byCustomer = new Map<string, ForecastByCustomer>();

  for (const opp of opportunities) {
    // Skip excluded
    if (opp.forecast?.is_excluded) continue;

    const orgName = opp.organisation_name || 'Unknown Customer';

    if (!byCustomer.has(orgName)) {
      byCustomer.set(orgName, {
        organisation_name: orgName,
        pipeline_revenue: 0,
        weighted_revenue: 0,
        opportunity_count: 0,
        avg_probability: 0
      });
    }

    const customer = byCustomer.get(orgName)!;
    customer.opportunity_count++;
    customer.pipeline_revenue += opp.effective_revenue;
    customer.weighted_revenue += opp.weighted_revenue;
    customer.avg_probability += opp.forecast?.probability ?? 0;
  }

  // Calculate averages
  for (const customer of byCustomer.values()) {
    if (customer.opportunity_count > 0) {
      customer.avg_probability = customer.avg_probability / customer.opportunity_count;
    }
  }

  return Array.from(byCustomer.values()).sort(
    (a, b) => b.weighted_revenue - a.weighted_revenue
  );
}

/**
 * Group opportunities by probability band
 */
export function calculateForecastByProbabilityBand(
  opportunities: OpportunityWithForecast[]
): ForecastByProbabilityBand[] {
  const bands: ForecastByProbabilityBand[] = PROBABILITY_BANDS.map(band => ({
    band: band.label,
    min_probability: band.min,
    max_probability: band.max,
    revenue: 0,
    profit: 0,
    count: 0
  }));

  for (const opp of opportunities) {
    // Skip excluded or unreviewed
    if (opp.forecast?.is_excluded || !opp.forecast) continue;

    const prob = opp.forecast.probability;
    const bandIndex = bands.findIndex(
      b => prob >= b.min_probability && prob <= b.max_probability
    );

    if (bandIndex !== -1) {
      bands[bandIndex].count++;
      bands[bandIndex].revenue += opp.effective_revenue;
      bands[bandIndex].profit += opp.effective_profit;
    }
  }

  return bands;
}

/**
 * Get color classes for probability display
 */
export function getProbabilityColor(probability: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (probability >= 76) {
    return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
  }
  if (probability >= 51) {
    return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
  }
  if (probability >= 26) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
  }
  return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' };
}

/**
 * Get forecast status label
 */
export function getForecastStatusLabel(
  forecast: ForecastMetadata | null | undefined
): string {
  if (!forecast) return 'Unreviewed';
  if (forecast.is_excluded) return 'Excluded';
  if (forecast.is_commit) return 'Commit';
  return 'Upside';
}

/**
 * Get forecast status color
 */
export function getForecastStatusColor(
  forecast: ForecastMetadata | null | undefined
): { bg: string; text: string; border: string } {
  if (!forecast) {
    return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' };
  }
  if (forecast.is_excluded) {
    return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
  }
  if (forecast.is_commit) {
    return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
  }
  return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(0)}%`;
}

/**
 * Format margin for display (as percentage)
 */
export function formatMargin(margin: number): string {
  return `${(margin * 100).toFixed(1)}%`;
}

/**
 * Get the week number for a date (ISO week)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get week start date for display
 */
function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Format a week label (e.g., "Jan 6")
 */
function formatWeekLabel(date: Date): string {
  const weekStart = getWeekStartDate(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[weekStart.getMonth()]} ${weekStart.getDate()}`;
}

/**
 * Format a month label (e.g., "Jan")
 */
function formatMonthLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()];
}

/**
 * Calculate forecast time series data grouped by week or month
 */
export function calculateForecastTimeSeries(
  opportunities: OpportunityWithForecast[],
  groupByWeek: boolean
): ForecastTimeSeries[] {
  const periodMap = new Map<string, ForecastTimeSeries>();

  for (const opp of opportunities) {
    if (!opp.starts_at) continue;

    const date = new Date(opp.starts_at);
    let period: string;
    let periodLabel: string;

    if (groupByWeek) {
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      period = `${year}-W${week.toString().padStart(2, '0')}`;
      periodLabel = formatWeekLabel(date);
    } else {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      period = `${year}-${month.toString().padStart(2, '0')}`;
      periodLabel = formatMonthLabel(date);
    }

    if (!periodMap.has(period)) {
      periodMap.set(period, {
        period,
        periodLabel,
        commit_revenue: 0,
        upside_revenue: 0,
        unreviewed_revenue: 0,
        commit_profit: 0,
        upside_profit: 0,
        unreviewed_profit: 0
      });
    }

    const entry = periodMap.get(period)!;

    // Skip excluded
    if (opp.forecast?.is_excluded) continue;

    if (!opp.forecast) {
      // Unreviewed
      entry.unreviewed_revenue += opp.charge_total;
      entry.unreviewed_profit += opp.base_profit;
    } else if (opp.forecast.is_commit) {
      // Commit (weighted)
      entry.commit_revenue += opp.weighted_revenue;
      entry.commit_profit += opp.weighted_profit;
    } else {
      // Upside (weighted)
      entry.upside_revenue += opp.weighted_revenue;
      entry.upside_profit += opp.weighted_profit;
    }
  }

  // Sort by period
  return Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
}
