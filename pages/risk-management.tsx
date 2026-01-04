import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { RiskAssessmentModal } from '@/components/RiskAssessment/RiskAssessmentModal';
import { getRiskLevel, getRiskLevelColor, calculateRiskScore } from '@/lib/riskAssessment';
import { Opportunity } from '@/types/opportunity';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';

export default function RiskManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: 'all',
    startDate: null,
    endDate: null
  });
  const [currentRmsSubdomain, setCurrentRmsSubdomain] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities();
    fetchSubdomain();
  }, []);

  // Read filter from URL query parameter
  useEffect(() => {
    if (router.isReady) {
      const { filter } = router.query;
      if (filter && typeof filter === 'string') {
        // Valid filter values: ALL, CRITICAL, HIGH, MEDIUM, LOW, UNSCORED
        const validFilters = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNSCORED'];
        if (validFilters.includes(filter.toUpperCase())) {
          setFilterLevel(filter.toUpperCase());
        }
      }
    }
  }, [router.isReady, router.query]);

  const fetchSubdomain = async () => {
    try {
      const response = await fetch('/api/debug');
      const data = await response.json();
      if (data.success && data.diagnostics?.environment?.subdomain) {
        setCurrentRmsSubdomain(data.diagnostics.environment.subdomain);
      }
    } catch (error) {
      console.error('Error fetching subdomain:', error);
    }
  };

  const getOpportunityUrl = (opportunityId: number) => {
    if (!currentRmsSubdomain) return null;
    return `https://${currentRmsSubdomain}.current-rms.com/opportunities/${opportunityId}`;
  };

  useEffect(() => {
    filterOpportunities();
  }, [opportunities, filterLevel, searchTerm, dateRange]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      // Fetch all opportunities from sync endpoint
      const response = await fetch('/api/opportunities/all');
      const data = await response.json();

      if (data.success) {
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
    setLoading(false);
  };

  const filterOpportunities = () => {
    let filtered = [...opportunities];

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered = filtered.filter(opp => {
        if (!opp.starts_at) return false;

        const oppDate = new Date(opp.starts_at);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

        if (startDate && oppDate < startDate) return false;
        if (endDate && oppDate > endDate) return false;

        return true;
      });
    }

    // Filter by risk level
    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(opp => {
        const rawScore = opp.data?.custom_fields?.risk_score;
        const riskScore = typeof rawScore === 'number' ? rawScore : 0;
        const level = getRiskLevel(riskScore);

        if (filterLevel === 'UNSCORED') {
          return level === null;
        }
        return level === filterLevel;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(opp =>
        opp.subject?.toLowerCase().includes(term) ||
        opp.name?.toLowerCase().includes(term) ||
        opp.organisation_name?.toLowerCase().includes(term)
      );
    }

    setFilteredOpportunities(filtered);
  };

  const handleAssessOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowAssessmentModal(true);
  };

  const handleSaveAssessment = async (opportunityId: number, riskData: any) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/risk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskData)
      });

      if (response.ok) {
        setShowAssessmentModal(false);
        await fetchOpportunities(); // Refresh the list
        alert('Risk assessment saved successfully!');
      } else {
        alert('Failed to save risk assessment');
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Error saving risk assessment');
    }
  };

  const getRiskStats = () => {
    const stats = {
      total: opportunities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unscored: 0,
      totalValue: 0
    };

    opportunities.forEach(opp => {
      const rawScore = opp.data?.custom_fields?.risk_score;
      const riskScore = typeof rawScore === 'number' ? rawScore : 0;
      const level = getRiskLevel(riskScore);
      const value = parseFloat(opp.charge_total?.toString() || '0');

      stats.totalValue += value;

      if (level === null) stats.unscored++;
      else if (level === 'CRITICAL') stats.critical++;
      else if (level === 'HIGH') stats.high++;
      else if (level === 'MEDIUM') stats.medium++;
      else if (level === 'LOW') stats.low++;
    });

    return stats;
  };

  const stats = getRiskStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Risk Management - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="text-white hover:text-orange-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold">Risk Management</h1>
                  <p className="mt-1 text-orange-100">Assess and manage opportunity risk</p>
                </div>
              </div>
              <button
                onClick={fetchOpportunities}
                className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-gray-500">Critical</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
              <div className="text-sm text-gray-500">High</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
              <div className="text-sm text-gray-500">Medium</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats.low}</div>
              <div className="text-sm text-gray-500">Low</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-300">
              <div className="text-2xl font-bold text-gray-600">{stats.unscored}</div>
              <div className="text-sm text-gray-500">Unscored</div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Risk Level
                </label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="ALL">All Levels</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                  <option value="UNSCORED">Unscored</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Opportunities
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or customer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Opportunities Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        No opportunities found
                      </td>
                    </tr>
                  ) : (
                    filteredOpportunities.map((opp) => {
                      const rawScore = opp.data?.custom_fields?.risk_score;
                      const riskScore = typeof rawScore === 'number' ? rawScore : 0;
                      const riskLevel = getRiskLevel(riskScore);
                      const colors = getRiskLevelColor(riskLevel);
                      const opportunityUrl = getOpportunityUrl(opp.id);

                      return (
                        <tr key={opp.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {opportunityUrl ? (
                              <a
                                href={opportunityUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {opp.id}
                              </a>
                            ) : (
                              opp.id
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {opportunityUrl ? (
                              <a
                                href={opportunityUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {opp.subject || opp.name || `Opportunity #${opp.id}`}
                              </a>
                            ) : (
                              opp.subject || opp.name || `Opportunity #${opp.id}`
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {opp.organisation_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {opp.starts_at ? new Date(opp.starts_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            ${(parseFloat(opp.charge_total?.toString() || '0') / 1000).toFixed(1)}k
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {riskLevel ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}>
                                {riskLevel}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                                UNSCORED
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {riskScore > 0 ? riskScore.toFixed(2) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            <button
                              onClick={() => handleAssessOpportunity(opp)}
                              className="text-orange-600 hover:text-orange-700 font-medium"
                            >
                              {riskScore > 0 ? 'Edit' : 'Assess'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Result Count */}
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredOpportunities.length} of {opportunities.length} opportunities
          </div>
        </div>
      </div>

      {/* Risk Assessment Modal */}
      {selectedOpportunity && (
        <RiskAssessmentModal
          opportunity={selectedOpportunity}
          isOpen={showAssessmentModal}
          onClose={() => setShowAssessmentModal(false)}
          onSave={handleSaveAssessment}
        />
      )}
    </>
  );
}
