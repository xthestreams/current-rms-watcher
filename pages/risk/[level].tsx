import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getRiskLevelColor, RiskLevel } from '@/lib/riskAssessment';
import { RiskAssessmentModal } from '@/components/RiskAssessment/RiskAssessmentModal';
import { format } from 'date-fns';

interface Opportunity {
  id: number;
  name: string;
  subject?: string;
  organisation_name?: string;
  owner_name?: string;
  starts_at?: string;
  charge_total?: string;
  data?: {
    custom_fields?: any;
  };
}

export default function RiskLevelPage() {
  const router = useRouter();
  const { level } = router.query;

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  const riskLevel: RiskLevel = level === 'null' ? null : (level as RiskLevel);
  const colors = getRiskLevelColor(riskLevel);

  useEffect(() => {
    if (level) {
      fetchOpportunities();
    }
  }, [level]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/risk/opportunities?level=${level || 'null'}`);
      const data = await response.json();

      if (data.success) {
        setOpportunities(data.data);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowAssessmentModal(true);
  };

  const handleSaveAssessment = async (opportunityId: number, riskData: any) => {
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/risk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(riskData)
      });

      if (!response.ok) {
        throw new Error('Failed to save risk assessment');
      }

      // Refresh the list
      await fetchOpportunities();

      alert('Risk assessment saved successfully!');
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  };

  return (
    <>
      <Head>
        <title>{riskLevel || 'UNSCORED'} Risk Opportunities - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
            >
              ← Back to Dashboard
            </button>

            <div className={`inline-block px-4 py-2 rounded-lg ${colors.bg} ${colors.border} border-2`}>
              <h1 className={`text-3xl font-bold ${colors.text}`}>
                {riskLevel || 'UNSCORED'} Risk Opportunities
              </h1>
            </div>

            <p className="text-gray-600 mt-2">
              {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'} found
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-pulse">Loading opportunities...</div>
            </div>
          )}

          {/* Opportunities Table */}
          {!loading && opportunities.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No opportunities found in this risk category
            </div>
          )}

          {!loading && opportunities.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {opportunities.map((opp) => {
                    const riskScore = opp.data?.custom_fields?.risk_score ?? 0;
                    const reviewed = opp.data?.custom_fields?.risk_reviewed === 'Yes';

                    return (
                      <tr key={opp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {opp.subject || opp.name}
                          </div>
                          <div className="text-sm text-gray-500">ID: {opp.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {opp.organisation_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {opp.owner_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {opp.starts_at ? format(new Date(opp.starts_at), 'MMM d, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${parseFloat(opp.charge_total || '0').toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {riskScore > 0 ? (
                              <span className="text-sm font-medium">{riskScore.toFixed(2)}</span>
                            ) : (
                              <span className="text-sm text-gray-400">Not assessed</span>
                            )}
                            {reviewed && (
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Reviewed" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleAssessOpportunity(opp)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {riskScore ? 'Edit Assessment' : 'Assess Risk'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Risk Assessment Modal */}
      <RiskAssessmentModal
        opportunity={selectedOpportunity}
        isOpen={showAssessmentModal}
        onClose={() => {
          setShowAssessmentModal(false);
          setSelectedOpportunity(null);
        }}
        onSave={handleSaveAssessment}
      />
    </>
  );
}
