// Risk Assessment Business Logic
// Ported from avriskassessment repository
// Settings can be stored in database and fetched via /api/settings/risk

export interface RiskFactor {
  id: string;
  label: string;
  weight: number;
  scale: {
    value: number;
    label: string;
    description: string;
  }[];
}

export interface RiskScores {
  risk_project_novelty?: number;
  risk_technical_complexity?: number;
  risk_resource_utilization?: number;
  risk_client_sophistication?: number;
  risk_budget_size?: number;
  risk_timeframe_constraint?: number;
  risk_team_experience?: number;
  risk_subhire_availability?: number;
}

export interface RiskAssessmentData extends RiskScores {
  risk_score?: number;
  risk_level?: string;
  risk_reviewed?: string;
  risk_mitigation_plan?: number;
  risk_mitigation_notes?: string;
  risk_last_updated?: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;

export const RISK_FACTORS: RiskFactor[] = [
  {
    id: 'risk_project_novelty',
    label: 'Project Type Familiarity',
    weight: 1.2,
    scale: [
      { value: 1, label: 'Routine', description: 'Standard project we do regularly' },
      { value: 2, label: 'Familiar', description: 'Similar to past projects' },
      { value: 3, label: 'Moderate', description: 'Some new elements' },
      { value: 4, label: 'Novel', description: 'Significantly different from usual' },
      { value: 5, label: 'Entirely New', description: 'Never done before' }
    ]
  },
  {
    id: 'risk_technical_complexity',
    label: 'Technical Complexity',
    weight: 1.3,
    scale: [
      { value: 1, label: 'Simple', description: 'Basic setup, standard equipment' },
      { value: 2, label: 'Straightforward', description: 'Minor technical challenges' },
      { value: 3, label: 'Moderate', description: 'Some complex systems' },
      { value: 4, label: 'Complex', description: 'Advanced technical requirements' },
      { value: 5, label: 'Bleeding Edge', description: 'Cutting-edge/experimental tech' }
    ]
  },
  {
    id: 'risk_resource_utilization',
    label: 'Resource Utilization',
    weight: 1.1,
    scale: [
      { value: 1, label: '0-25%', description: 'Minimal resource commitment' },
      { value: 2, label: '25-50%', description: 'Moderate resource use' },
      { value: 3, label: '50-65%', description: 'Significant resource allocation' },
      { value: 4, label: '65-75%', description: 'High resource utilization' },
      { value: 5, label: '75%+', description: 'Near maximum capacity' }
    ]
  },
  {
    id: 'risk_client_sophistication',
    label: 'Client Experience Level',
    weight: 0.9,
    scale: [
      { value: 1, label: 'Highly Experienced', description: 'Knows exactly what they want' },
      { value: 2, label: 'Experienced', description: 'Familiar with events' },
      { value: 3, label: 'Moderate', description: 'Some event experience' },
      { value: 4, label: 'Limited', description: 'First few events' },
      { value: 5, label: 'First-Time', description: 'Never organized event before' }
    ]
  },
  {
    id: 'risk_budget_size',
    label: 'Budget Scale',
    weight: 1.0,
    scale: [
      { value: 1, label: '<$5,000', description: 'Small budget' },
      { value: 2, label: '$5k-$20k', description: 'Medium budget' },
      { value: 3, label: '$20k-$50k', description: 'Large budget' },
      { value: 4, label: '$50k-$100k', description: 'Very large budget' },
      { value: 5, label: '$100k+', description: 'Major project' }
    ]
  },
  {
    id: 'risk_timeframe_constraint',
    label: 'Timeline Pressure',
    weight: 1.2,
    scale: [
      { value: 1, label: 'Ample Time', description: 'Plenty of lead time' },
      { value: 2, label: 'Normal', description: 'Standard timeline' },
      { value: 3, label: 'Tight', description: 'Limited preparation time' },
      { value: 4, label: 'Very Tight', description: 'Minimal lead time' },
      { value: 5, label: 'Rush/Emergency', description: 'Last minute request' }
    ]
  },
  {
    id: 'risk_team_experience',
    label: 'Team Capability',
    weight: 1.3,
    scale: [
      { value: 1, label: 'Expert', description: 'Highly experienced team' },
      { value: 2, label: 'Experienced', description: 'Competent team' },
      { value: 3, label: 'Adequate', description: 'Mixed experience levels' },
      { value: 4, label: 'Limited', description: 'Newer team members' },
      { value: 5, label: 'Inexperienced', description: 'Largely untrained team' }
    ]
  },
  {
    id: 'risk_subhire_availability',
    label: 'Sub-hire Availability',
    weight: 1.1,
    scale: [
      { value: 1, label: 'Multiple Vendors', description: 'Many options available' },
      { value: 2, label: 'Several Options', description: 'Good availability' },
      { value: 3, label: 'Limited Options', description: 'Few vendors available' },
      { value: 4, label: 'Very Limited', description: 'Scarce availability' },
      { value: 5, label: 'None Available', description: 'No sub-hire options' }
    ]
  }
];

/**
 * Calculate weighted risk score from individual factor scores
 */
export function calculateRiskScore(scores: RiskScores): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  RISK_FACTORS.forEach(factor => {
    const score = scores[factor.id as keyof RiskScores];
    if (score !== undefined && score !== null) {
      totalWeightedScore += score * factor.weight;
      totalWeight += factor.weight;
    }
  });

  if (totalWeight === 0) return 0;
  return parseFloat((totalWeightedScore / totalWeight).toFixed(2));
}

/**
 * Determine risk level from calculated score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score === 0) return null;
  if (score <= 2.0) return 'LOW';
  if (score <= 3.0) return 'MEDIUM';
  if (score <= 4.0) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Get approval level required for risk score
 */
export function getApprovalLevel(score: number): string {
  if (score === 0) return 'Not assessed';
  if (score <= 2.0) return 'Project Manager';
  if (score <= 3.0) return 'Senior Manager';
  if (score <= 4.0) return 'Operations Director';
  return 'Executive Approval Required';
}

/**
 * Get risk level color for UI
 */
export function getRiskLevelColor(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'LOW':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    case 'MEDIUM':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    case 'HIGH':
      return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' };
    case 'CRITICAL':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' };
  }
}

/**
 * Validate all risk scores are within range
 */
export function validateRiskScores(scores: RiskScores): boolean {
  for (const factor of RISK_FACTORS) {
    const score = scores[factor.id as keyof RiskScores];
    if (score !== undefined && score !== null) {
      if (score < 1 || score > 5 || !Number.isInteger(score)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Check if opportunity needs risk review (modified after last risk update)
 */
export function needsRiskReview(
  opportunityUpdatedAt: string,
  riskLastUpdated: string | null | undefined
): boolean {
  if (!riskLastUpdated) return true;

  const oppDate = new Date(opportunityUpdatedAt);
  const riskDate = new Date(riskLastUpdated);

  return oppDate > riskDate;
}

/**
 * Approval threshold configuration
 */
export interface ApprovalThreshold {
  maxScore: number;
  approver: number | null;
  approverName: string;
}

export interface ApprovalThresholds {
  low: ApprovalThreshold;
  medium: ApprovalThreshold;
  high: ApprovalThreshold;
  critical: ApprovalThreshold;
}

export interface RiskSettings {
  risk_factors: RiskFactor[];
  approval_thresholds: ApprovalThresholds;
}

// Cache for risk settings to avoid repeated API calls
let cachedSettings: RiskSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch risk settings from database (client-side)
 * Falls back to default RISK_FACTORS if API call fails
 */
export async function fetchRiskSettings(): Promise<RiskSettings> {
  // Check cache first
  if (cachedSettings && (Date.now() - cacheTimestamp) < CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const response = await fetch('/api/settings/risk');
    const data = await response.json();

    if (data.success) {
      cachedSettings = data.settings;
      cacheTimestamp = Date.now();
      return data.settings;
    }
  } catch (error) {
    console.error('Failed to fetch risk settings, using defaults:', error);
  }

  // Return default settings
  return {
    risk_factors: RISK_FACTORS,
    approval_thresholds: {
      low: { maxScore: 2.0, approver: null, approverName: 'Project Manager' },
      medium: { maxScore: 3.0, approver: null, approverName: 'Senior Manager' },
      high: { maxScore: 4.0, approver: null, approverName: 'Operations Director' },
      critical: { maxScore: 5.0, approver: null, approverName: 'Executive Approval Required' }
    }
  };
}

/**
 * Clear the settings cache (call after saving new settings)
 */
export function clearRiskSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}

/**
 * Calculate weighted risk score using custom factors
 */
export function calculateRiskScoreWithFactors(
  scores: RiskScores,
  factors: RiskFactor[]
): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  factors.forEach(factor => {
    const score = scores[factor.id as keyof RiskScores];
    if (score !== undefined && score !== null) {
      totalWeightedScore += score * factor.weight;
      totalWeight += factor.weight;
    }
  });

  if (totalWeight === 0) return 0;
  return parseFloat((totalWeightedScore / totalWeight).toFixed(2));
}

/**
 * Get approval level using custom thresholds
 */
export function getApprovalLevelWithThresholds(
  score: number,
  thresholds: ApprovalThresholds
): { level: RiskLevel; approver: ApprovalThreshold } {
  if (score === 0) {
    return {
      level: null,
      approver: { maxScore: 0, approver: null, approverName: 'Not assessed' }
    };
  }
  if (score <= thresholds.low.maxScore) {
    return { level: 'LOW', approver: thresholds.low };
  }
  if (score <= thresholds.medium.maxScore) {
    return { level: 'MEDIUM', approver: thresholds.medium };
  }
  if (score <= thresholds.high.maxScore) {
    return { level: 'HIGH', approver: thresholds.high };
  }
  return { level: 'CRITICAL', approver: thresholds.critical };
}
