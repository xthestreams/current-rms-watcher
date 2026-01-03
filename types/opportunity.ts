// Opportunity Type Definitions

import { RiskAssessmentData } from '@/lib/riskAssessment';

export interface OpportunityData {
  custom_fields?: RiskAssessmentData;
  [key: string]: unknown;
}

export interface Opportunity {
  id: number;
  name: string;
  subject?: string;
  organisation_name?: string;
  owner_name?: string;
  starts_at?: string;
  ends_at?: string;
  charge_total?: string;
  opportunity_status?: string;
  data?: OpportunityData;
}
