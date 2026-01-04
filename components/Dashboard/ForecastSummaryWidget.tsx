import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ForecastSummary, ForecastTimeSeries } from '@/types/forecast';
import { formatCurrency } from '@/lib/forecastCalculation';

interface ForecastSummaryWidgetProps {
  data: ForecastSummary | null;
  timeSeries?: ForecastTimeSeries[];
  groupByWeek?: boolean;
  loading?: boolean;
}

export function ForecastSummaryWidget({ data, timeSeries, groupByWeek, loading }: ForecastSummaryWidgetProps) {
  const router = useRouter();
  const [showRevenue, setShowRevenue] = useState(true);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Sales Forecast</h3>
        <p className="text-gray-500 text-sm">No forecast data available</p>
      </div>
    );
  }

  // Calculate max value for chart scaling, rounded to nearest $10,000
  const chartData = timeSeries || [];
  const rawMaxValue = Math.max(
    ...chartData.map(d =>
      showRevenue
        ? d.commit_revenue + d.upside_revenue + d.unreviewed_revenue
        : d.commit_profit + d.upside_profit + d.unreviewed_profit
    ),
    1
  );
  // Round up to nearest $10,000
  const scaleMax = Math.ceil(rawMaxValue / 10000) * 10000;
  const scaleMid = scaleMax / 2;

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sales Forecast</h3>
        <button
          onClick={() => router.push('/sales-forecast')}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(data.weighted_revenue)}
          </div>
          <div className="text-xs text-gray-500">Weighted Revenue</div>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(data.weighted_profit)}
          </div>
          <div className="text-xs text-gray-500">Weighted Profit</div>
        </div>
      </div>

      {/* Toggle between Revenue and Profit */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowRevenue(true)}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
            showRevenue
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setShowRevenue(false)}
          className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
            !showRevenue
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Profit
        </button>
      </div>

      {/* Stacked Bar Chart */}
      {chartData.length > 0 ? (
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">
            {showRevenue ? 'Revenue' : 'Profit'} by {groupByWeek ? 'Week' : 'Month'}
          </div>
          <div className="flex">
            {/* Y-Axis Labels */}
            <div className="flex flex-col justify-between h-32 pr-2 text-[9px] text-gray-400 text-right w-12 flex-shrink-0">
              <span>{formatCurrency(scaleMax)}</span>
              <span>{formatCurrency(scaleMid)}</span>
              <span>$0</span>
            </div>
            {/* Chart Area */}
            <div className="flex-1 relative">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-gray-200"></div>
                <div className="border-t border-gray-100 border-dashed"></div>
                <div className="border-t border-gray-200"></div>
              </div>
              {/* Bars */}
              <div className="flex items-end gap-1 h-32 relative">
                {chartData.slice(0, 12).map((period) => {
                  const commitVal = showRevenue ? period.commit_revenue : period.commit_profit;
                  const upsideVal = showRevenue ? period.upside_revenue : period.upside_profit;
                  const unreviewedVal = showRevenue ? period.unreviewed_revenue : period.unreviewed_profit;
                  const total = commitVal + upsideVal + unreviewedVal;
                  const totalHeight = scaleMax > 0 ? (total / scaleMax) * 100 : 0;

                  const commitHeight = total > 0 ? (commitVal / total) * totalHeight : 0;
                  const upsideHeight = total > 0 ? (upsideVal / total) * totalHeight : 0;
                  const unreviewedHeight = total > 0 ? (unreviewedVal / total) * totalHeight : 0;

                  return (
                    <div
                      key={period.period}
                      className="flex-1 flex flex-col justify-end group relative"
                      title={`${period.periodLabel}: ${formatCurrency(total)}`}
                    >
                      <div className="flex flex-col justify-end" style={{ height: `${totalHeight}%` }}>
                        {unreviewedHeight > 0 && (
                          <div
                            className="bg-gray-300 rounded-t-sm"
                            style={{ height: `${(unreviewedHeight / totalHeight) * 100}%`, minHeight: '2px' }}
                          />
                        )}
                        {upsideHeight > 0 && (
                          <div
                            className="bg-blue-400"
                            style={{ height: `${(upsideHeight / totalHeight) * 100}%`, minHeight: '2px' }}
                          />
                        )}
                        {commitHeight > 0 && (
                          <div
                            className="bg-green-500 rounded-b-sm"
                            style={{ height: `${(commitHeight / totalHeight) * 100}%`, minHeight: '2px' }}
                          />
                        )}
                      </div>
                      <div className="text-[9px] text-gray-400 text-center mt-1 truncate">
                        {period.periodLabel}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {period.periodLabel}: {formatCurrency(total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm mb-4">
          No time series data available
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs mb-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span className="text-gray-600">Commit</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
          <span className="text-gray-600">Upside</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
          <span className="text-gray-600">Unreviewed</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 pt-3">
        <div>
          <div className="text-sm font-bold text-green-600">{formatCurrency(data.commit_revenue)}</div>
          <div className="text-[10px] text-gray-500">{data.commit_count} Commit</div>
        </div>
        <div>
          <div className="text-sm font-bold text-blue-600">{formatCurrency(data.upside_revenue)}</div>
          <div className="text-[10px] text-gray-500">{data.upside_count} Upside</div>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-500">{formatCurrency(data.unreviewed_revenue)}</div>
          <div className="text-[10px] text-gray-500">{data.unreviewed_count} Unreviewed</div>
        </div>
      </div>

      {/* Excluded indicator */}
      {data.excluded_count > 0 && (
        <div className="mt-2 text-[10px] text-center text-gray-400">
          {data.excluded_count} excluded ({formatCurrency(data.excluded_revenue)})
        </div>
      )}
    </div>
  );
}
