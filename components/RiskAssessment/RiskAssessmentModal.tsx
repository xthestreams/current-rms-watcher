import React, { useState, useEffect } from 'react';
import {
  RISK_FACTORS,
  calculateRiskScore,
  getRiskLevel,
  getApprovalLevel,
  getRiskLevelColor,
  validateRiskScores,
  RiskScores,
  RiskAssessmentData,
  RiskLevel
} from '@/lib/riskAssessment';
import { Opportunity } from '@/types/opportunity';

interface RiskAssessmentModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (opportunityId: number, riskData: RiskAssessmentData) => Promise<void>;
}

export function RiskAssessmentModal({ opportunity, isOpen, onClose, onSave }: RiskAssessmentModalProps) {
  const [scores, setScores] = useState<RiskScores>({});
  const [riskReviewed, setRiskReviewed] = useState(false);
  const [mitigationPlan, setMitigationPlan] = useState<number>(0);
  const [mitigationNotes, setMitigationNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing risk data when opportunity changes
  useEffect(() => {
    if (opportunity?.data?.custom_fields) {
      const cf = opportunity.data.custom_fields;
      setScores({
        risk_project_novelty: cf.risk_project_novelty,
        risk_technical_complexity: cf.risk_technical_complexity,
        risk_resource_utilization: cf.risk_resource_utilization,
        risk_client_sophistication: cf.risk_client_sophistication,
        risk_budget_size: cf.risk_budget_size,
        risk_timeframe_constraint: cf.risk_timeframe_constraint,
        risk_team_experience: cf.risk_team_experience,
        risk_subhire_availability: cf.risk_subhire_availability
      });
      setRiskReviewed(cf.risk_reviewed === 'Yes' || cf.risk_reviewed === '1');
      setMitigationPlan(cf.risk_mitigation_plan || 0);
      setMitigationNotes(cf.risk_mitigation_notes || '');
    } else {
      // Reset to defaults
      setScores({});
      setRiskReviewed(false);
      setMitigationPlan(0);
      setMitigationNotes('');
    }
  }, [opportunity]);

  if (!isOpen || !opportunity) return null;

  const calculatedScore = calculateRiskScore(scores);
  const riskLevel: RiskLevel = getRiskLevel(calculatedScore);
  const approvalLevel = getApprovalLevel(calculatedScore);
  const colors = getRiskLevelColor(riskLevel);

  const handleScoreChange = (factorId: string, value: number) => {
    setScores(prev => ({ ...prev, [factorId]: value }));
  };

  const handleSave = async () => {
    if (!validateRiskScores(scores)) {
      alert('Invalid risk scores. All scores must be between 1 and 5.');
      return;
    }

    setSaving(true);
    try {
      const riskData: RiskAssessmentData = {
        ...scores,
        risk_score: calculatedScore,
        risk_level: riskLevel || '',
        risk_reviewed: riskReviewed ? 'Yes' : '',
        risk_mitigation_plan: mitigationPlan,
        risk_mitigation_notes: mitigationNotes,
        risk_last_updated: new Date().toISOString()
      };

      await onSave(opportunity.id, riskData);
      onClose();
    } catch (error) {
      console.error('Error saving risk assessment:', error);
      alert('Failed to save risk assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Risk Assessment</h2>
              <p className="text-sm text-gray-600 mt-1">
                {opportunity.subject || opportunity.name} - {opportunity.organisation_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Risk Score Summary */}
        <div className={`mx-6 mt-6 p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Current Risk Score</div>
              <div className={`text-3xl font-bold ${colors.text}`}>
                {calculatedScore > 0 ? calculatedScore.toFixed(2) : 'Not Assessed'}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${colors.text}`}>
                {riskLevel || 'UNSCORED'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Requires: {approvalLevel}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="px-6 py-6">
          <h3 className="text-lg font-semibold mb-4">Risk Factors</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {RISK_FACTORS.map((factor) => {
              const currentScore = scores[factor.id as keyof RiskScores];

              return (
                <div key={factor.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{factor.label}</div>
                      <div className="text-xs text-gray-500">Weight: {factor.weight}</div>
                    </div>
                    {currentScore && (
                      <div className="text-lg font-bold text-blue-600">{currentScore}</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {factor.scale.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleScoreChange(factor.id, option.value)}
                        className={`flex-1 px-3 py-2 text-sm rounded border-2 transition-colors ${
                          currentScore === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                        title={option.description}
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>

                  {currentScore && (
                    <div className="mt-2 text-xs text-gray-600">
                      {factor.scale.find(s => s.value === currentScore)?.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow & Mitigation */}
        <div className="px-6 pb-6">
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">Review & Mitigation</h3>

            <div className="space-y-4">
              {/* Review Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="riskReviewed"
                  checked={riskReviewed}
                  onChange={(e) => setRiskReviewed(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="riskReviewed" className="ml-2 text-sm font-medium text-gray-700">
                  Mark as Reviewed
                </label>
              </div>

              {/* Mitigation Plan Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mitigation Plan Status
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'None' },
                    { value: 1, label: 'Partial' },
                    { value: 2, label: 'Complete' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMitigationPlan(option.value)}
                      className={`px-4 py-2 text-sm rounded border-2 transition-colors ${
                        mitigationPlan === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mitigation Notes */}
              <div>
                <label htmlFor="mitigationNotes" className="block text-sm font-medium text-gray-700 mb-2">
                  Mitigation Notes
                </label>
                <textarea
                  id="mitigationNotes"
                  value={mitigationNotes}
                  onChange={(e) => setMitigationNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Document mitigation strategies, backup plans, special arrangements..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Assessment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
