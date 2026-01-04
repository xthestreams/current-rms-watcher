import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { MetricCard } from '@/components/Dashboard/MetricCard';
import { ActionTypeChart } from '@/components/Dashboard/ActionTypeChart';
import { TimelineChart } from '@/components/Dashboard/TimelineChart';
import { StatusDistributionChart } from '@/components/Dashboard/StatusDistributionChart';
import { TopOpportunitiesTable } from '@/components/Dashboard/TopOpportunitiesTable';
import { ActivityFeed } from '@/components/Dashboard/ActivityFeed';
import { SyncControl } from '@/components/Dashboard/SyncControl';
import { RiskStatusSummary } from '@/components/Dashboard/RiskStatusSummary';
import { ForecastSummaryWidget } from '@/components/Dashboard/ForecastSummaryWidget';
import { RiskLevel } from '@/lib/riskAssessment';
import { DashboardData, RiskSummaryItem, DebugDiagnostics } from '@/types/dashboard';
import { ForecastSummary, ForecastTimeSeries } from '@/types/forecast';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';

export default function Dashboard() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [riskSummaryData, setRiskSummaryData] = useState<RiskSummaryItem[]>([]);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [forecastTimeSeries, setForecastTimeSeries] = useState<ForecastTimeSeries[]>([]);
  const [forecastGroupByWeek, setForecastGroupByWeek] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugDiagnostics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: null,
    endDate: null
  });

  const fetchData = async () => {
    try {
      // Build query parameters for date filtering
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      const queryString = params.toString();

      const [dashboardResponse, riskResponse, forecastResponse] = await Promise.all([
        fetch(`/api/dashboard${queryString ? `?${queryString}` : ''}`),
        fetch(`/api/risk/summary${queryString ? `?${queryString}` : ''}`),
        fetch(`/api/forecast/summary${queryString ? `?${queryString}` : ''}`)
      ]);

      const dashboardData = await dashboardResponse.json();
      const riskData = await riskResponse.json();
      const forecastData = await forecastResponse.json();

      if (dashboardData.success) {
        setDashboardData(dashboardData.data);
      }

      if (riskData.success) {
        setRiskSummaryData(riskData.data);
      }

      if (forecastData.success) {
        setForecastSummary(forecastData.data.summary);
        setForecastTimeSeries(forecastData.data.timeSeries || []);
        setForecastGroupByWeek(forecastData.data.groupByWeek ?? true);
      }
      setForecastLoading(false);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
      setForecastLoading(false);
    }
  };

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug');
      const data = await response.json();
      setDebugInfo(data.diagnostics);
      setShowDebug(true);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, dateRange]);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const overview = dashboardData?.overview || {
    totalEvents: 0,
    totalOpportunities: 0,
    successRate: 0,
    failedEvents: 0,
    uptime: 0
  };

  return (
    <>
      <Head>
        <title>Current RMS Watcher - Executive Dashboard</title>
        <meta name="description" content="Monitor Current RMS opportunity changes with real-time analytics" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Current RMS Watcher</h1>
                <p className="mt-1 text-blue-100">Real-time Business Intelligence & Analytics</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-blue-100">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-blue-300"
                  />
                  Auto-refresh (10s)
                </label>
                <button
                  onClick={() => router.push('/sales-forecast')}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Forecast
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => router.push('/webhooks')}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Webhooks
                </button>
                <button
                  onClick={fetchDebugInfo}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Debug
                </button>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && debugInfo && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Debug Information</h2>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-medium mb-2">Environment</h3>
                  <div className="space-y-1">
                    <div>RMS Subdomain: {debugInfo.environment.hasSubdomain ? '✓' : '✗'}</div>
                    <div>API Key: {debugInfo.environment.hasApiKey ? '✓' : '✗'}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Webhook URL</h3>
                  <div className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                    {debugInfo.endpoints.webhook}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <MetricCard
              title="Total Events"
              value={overview.totalEvents.toLocaleString()}
              subtitle="All webhook events"
              icon="📊"
            />
            <MetricCard
              title="Opportunities"
              value={overview.totalOpportunities.toLocaleString()}
              subtitle="Unique opportunities"
              icon="🎯"
            />
            <MetricCard
              title="Success Rate"
              value={`${overview.successRate}%`}
              subtitle="Events processed"
              trend={overview.successRate >= 95 ? 'up' : overview.successRate >= 80 ? 'neutral' : 'down'}
              icon="✅"
            />
            <MetricCard
              title="Failed Events"
              value={overview.failedEvents}
              subtitle="Requires attention"
              trend={overview.failedEvents === 0 ? 'up' : 'down'}
              icon="❌"
            />
            <MetricCard
              title="Uptime"
              value={formatUptime(overview.uptime)}
              subtitle="System running"
              icon="⏱️"
            />
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          {/* Business Intelligence Row - Forecast & Risk Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ForecastSummaryWidget
              data={forecastSummary}
              timeSeries={forecastTimeSeries}
              groupByWeek={forecastGroupByWeek}
              loading={forecastLoading}
            />
            <RiskStatusSummary
              data={riskSummaryData}
              onCategoryClick={(level: RiskLevel) => {
                const filterValue = level === null ? 'UNSCORED' : level;
                router.push(`/risk-management?filter=${filterValue}`);
              }}
            />
          </div>

          {/* Sync Status Indicator */}
          {dashboardData?.syncInfo && (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      Last Sync: {new Date(dashboardData.syncInfo.lastSyncTime).toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-700">
                      {dashboardData.syncInfo.recordsSynced} opportunities synced
                      {dashboardData.syncInfo.recordsFailed > 0 && ` · ${dashboardData.syncInfo.recordsFailed} failed`}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-blue-600">
                  {(() => {
                    const lastSync = new Date(dashboardData.syncInfo.lastSyncTime);
                    const now = new Date();
                    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / 60000);
                    if (diffMinutes < 1) return 'Just now';
                    if (diffMinutes < 60) return `${diffMinutes} min ago`;
                    const diffHours = Math.floor(diffMinutes / 60);
                    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ActionTypeChart data={dashboardData?.actionTypeDistribution || []} />
            <TimelineChart data={dashboardData?.timeline || []} />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <StatusDistributionChart data={dashboardData?.statusDistribution || []} />
            <ActivityFeed data={dashboardData?.recentActivity || []} />
            <SyncControl />
          </div>

          {/* Top Opportunities Table */}
          <TopOpportunitiesTable data={dashboardData?.topOpportunities || []} />
        </div>
      </div>
    </>
  );
}
