// Type definitions for Current RMS webhook payloads

export interface OpportunityAction {
  id: number;
  subject_id: number;
  subject_type: string;
  source_id?: number;
  source_type?: string;
  member_id: number;
  action_type: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  member?: Member;
  subject?: Opportunity;
  source?: any;
}

export interface Member {
  id: number;
  name: string;
  email?: string;
  [key: string]: any;
}

export interface Opportunity {
  id: number;
  name: string;
  opportunity_status?: string;
  subject?: string;
  description?: string;
  organisation_id?: number;
  organisation_name?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface WebhookPayload {
  action: OpportunityAction;
}

export interface ProcessedEvent {
  id: string;
  timestamp: string;
  opportunityId: number;
  opportunityName: string;
  customerName: string;
  userId: number;
  userName: string;
  actionType: string;
  previousStatus?: string;
  newStatus?: string;
  processed: boolean;
  error?: string;
}

export interface HealthMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  lastEventTime?: string;
  uptime: number;
}
