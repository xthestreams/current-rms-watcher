import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState, useEffect } from 'react';

interface ScaleOption {
  value: number;
  label: string;
  description: string;
}

interface RiskFactor {
  id: string;
  label: string;
  weight: number;
  scale: ScaleOption[];
}

interface ApprovalThreshold {
  maxScore: number;
  approver: number | null;
  approverName: string;
}

interface ApprovalThresholds {
  low: ApprovalThreshold;
  medium: ApprovalThreshold;
  high: ApprovalThreshold;
  critical: ApprovalThreshold;
}

interface RiskSettings {
  risk_factors: RiskFactor[];
  approval_thresholds: ApprovalThresholds;
}

interface Member {
  id: number;
  name: string;
  email: string;
  membershipType: string;
  active: boolean;
}

export default function RiskSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);

  // Fetch settings and members on mount
  useEffect(() => {
    fetchSettings();
    fetchMembers();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/risk');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        if (data.needsMigration) {
          setNeedsMigration(true);
        }
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setRunningMigration(true);
    try {
      const response = await fetch('/api/migrate-database', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setNeedsMigration(false);
        setSuccessMessage('Database migration completed successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Migration failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setError('Failed to run migration');
      console.error('Error running migration:', err);
    } finally {
      setRunningMigration(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members?type=User');
      const data = await response.json();

      if (data.success) {
        setMembers(data.members);
      } else {
        console.error('Failed to load members:', data.error);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/settings/risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Settings saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateFactorWeight = (factorId: string, weight: number) => {
    if (!settings) return;

    setSettings({
      ...settings,
      risk_factors: settings.risk_factors.map(factor =>
        factor.id === factorId ? { ...factor, weight } : factor
      ),
    });
  };

  const updateScaleOption = (
    factorId: string,
    optionIndex: number,
    field: 'label' | 'description',
    value: string
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      risk_factors: settings.risk_factors.map(factor => {
        if (factor.id !== factorId) return factor;

        const newScale = [...factor.scale];
        newScale[optionIndex] = { ...newScale[optionIndex], [field]: value };
        return { ...factor, scale: newScale };
      }),
    });
  };

  const updateApprovalThreshold = (
    level: keyof ApprovalThresholds,
    field: 'approver' | 'approverName',
    value: number | string | null
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      approval_thresholds: {
        ...settings.approval_thresholds,
        [level]: {
          ...settings.approval_thresholds[level],
          [field]: value,
        },
      },
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 mx-auto text-orange-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Risk Settings - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="text-white hover:text-orange-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold">Risk Settings</h1>
                  <p className="mt-1 text-orange-100">
                    Configure risk assessment factors, weights, and approval thresholds
                  </p>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Migration Banner */}
        {needsMigration && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg flex items-center justify-between">
              <div>
                <strong>Database Setup Required:</strong> The risk_settings table needs to be created.
                Settings shown below are defaults and cannot be saved until migration is run.
              </div>
              <button
                onClick={runMigration}
                disabled={runningMigration}
                className="ml-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
              >
                {runningMigration ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </>
                ) : (
                  'Run Migration'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Approval Thresholds Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Approval Thresholds
            </h2>
            <p className="text-gray-600 mb-6">
              Configure which user should approve opportunities at each risk level.
              Select a CurrentRMS user from the dropdown.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {settings &&
                (['low', 'medium', 'high', 'critical'] as const).map((level) => {
                  const threshold = settings.approval_thresholds[level];
                  const levelLabels = {
                    low: 'Low Risk',
                    medium: 'Medium Risk',
                    high: 'High Risk',
                    critical: 'Critical Risk',
                  };

                  return (
                    <div
                      key={level}
                      className={`border-2 rounded-lg p-4 ${getRiskLevelColor(level)}`}
                    >
                      <div className="font-semibold mb-2">{levelLabels[level]}</div>
                      <div className="text-sm mb-3">
                        Score: &le; {threshold.maxScore.toFixed(1)}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium">
                          Approver
                        </label>
                        <select
                          value={threshold.approver || ''}
                          onChange={(e) => {
                            const memberId = e.target.value
                              ? parseInt(e.target.value)
                              : null;
                            const member = members.find((m) => m.id === memberId);
                            updateApprovalThreshold(level, 'approver', memberId);
                            updateApprovalThreshold(
                              level,
                              'approverName',
                              member?.name || threshold.approverName
                            );
                          }}
                          className="w-full px-2 py-1 text-sm border rounded bg-white text-gray-900"
                          disabled={loadingMembers}
                        >
                          <option value="">
                            {loadingMembers ? 'Loading...' : 'Select user...'}
                          </option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={threshold.approverName}
                          onChange={(e) =>
                            updateApprovalThreshold(level, 'approverName', e.target.value)
                          }
                          placeholder="Role/Title"
                          className="w-full px-2 py-1 text-sm border rounded bg-white text-gray-900"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Risk Factors Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Factors</h2>
            <p className="text-gray-600 mb-6">
              Configure the weight and scale options for each risk factor. Click on a
              factor to expand and edit its scale options.
            </p>

            <div className="space-y-4">
              {settings?.risk_factors.map((factor) => (
                <div
                  key={factor.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Factor Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() =>
                      setExpandedFactor(
                        expandedFactor === factor.id ? null : factor.id
                      )
                    }
                  >
                    <div className="flex items-center gap-4">
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          expandedFactor === factor.id ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">
                          {factor.label}
                        </div>
                        <div className="text-sm text-gray-500">{factor.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Weight:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={factor.weight}
                        onChange={(e) =>
                          updateFactorWeight(factor.id, parseFloat(e.target.value))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                    </div>
                  </div>

                  {/* Factor Scale Options (Expanded) */}
                  {expandedFactor === factor.id && (
                    <div className="p-4 border-t border-gray-200">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        Scale Options (1-5)
                      </div>
                      <div className="space-y-3">
                        {factor.scale.map((option, index) => (
                          <div
                            key={option.value}
                            className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                              {option.value}
                            </div>
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) =>
                                  updateScaleOption(
                                    factor.id,
                                    index,
                                    'label',
                                    e.target.value
                                  )
                                }
                                placeholder="Label"
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm font-medium"
                              />
                              <input
                                type="text"
                                value={option.description}
                                onChange={(e) =>
                                  updateScaleOption(
                                    factor.id,
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                placeholder="Description"
                                className="w-full px-3 py-1 border border-gray-300 rounded text-sm text-gray-600"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              How Risk Scoring Works
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>
                <strong>Weighted Average:</strong> The risk score is calculated as the
                weighted average of all scored factors.
              </li>
              <li>
                <strong>Score Range:</strong> Each factor is scored 1-5, where 1 is
                lowest risk and 5 is highest risk.
              </li>
              <li>
                <strong>Weights:</strong> Higher weights make that factor more
                influential in the final score.
              </li>
              <li>
                <strong>Approval Routing:</strong> Based on the final score, the
                opportunity is routed to the appropriate approver.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
